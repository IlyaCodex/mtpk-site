/**
 * Медиасервис: отдаёт файлы сайта из S3 (MinIO сейчас, Wasabi потом) по тем же
 * адресам, что и раньше (/img/…, /files/…, /docs/…, /og/…, /praktikum/…).
 *
 * Повторяет поведение nginx старого сайта:
 *  - WebP по Accept: на /img/foo.png браузеру с поддержкой WebP отдаётся
 *    соседний foo.png.webp (T-PERF-7, try_files $uri$webp_suffix), Vary: Accept;
 *  - кеш: картинки/шрифты — 30 дней, css — 7 дней;
 *  - Range-запросы (видео, большие PDF) и ETag/304.
 */
import { Readable } from 'node:stream';
import { z } from 'zod';
import {
  contentTypeFor,
  createLogger,
  createS3,
  envParts,
  getObject,
  headObject,
  isAuthorized,
  isNotFound,
  isNotModified,
  listObjects,
  putObject,
  readEnv,
  startService,
} from '@mtpk/shared';
import { assets, createDb, sql } from '@mtpk/db';

const env = readEnv(
  z.object({
    ...envParts.base,
    ...envParts.db,
    ...envParts.s3,
    ...envParts.admin,
    MEDIA_PORT: z.coerce.number().default(4104),
    /** Как часто перечитывать каталог объектов (для выбора WebP-соседа), сек. */
    MEDIA_CATALOG_REFRESH: z.coerce.number().default(300),
  }),
);

const log = createLogger('media');
const s3 = createS3(env);
const bucket = env.S3_BUCKET_ASSETS;
const { db, close } = createDb(env.DATABASE_URL, { max: 3, appName: 'media' });

const PREFIXES = ['img/', 'files/', 'docs/', 'og/', 'praktikum/'];
const WEBP_SOURCE = /\.(png|jpe?g)$/i;

// Каталог ключей бакета: решает, есть ли WebP-сосед, без лишних запросов в S3.
let catalog = new Set<string>();
let catalogLoaded = false;
async function loadCatalog(): Promise<void> {
  try {
    const rows = await db.select({ key: assets.key }).from(assets);
    if (rows.length) {
      catalog = new Set(rows.map((r) => r.key));
    } else {
      // таблица пуста (файлы залиты не импортёром) — читаем список прямо из бакета
      const keys = new Set<string>();
      for await (const o of listObjects(s3, bucket)) keys.add(o.key);
      catalog = keys;
    }
    catalogLoaded = true;
    log.info({ objects: catalog.size }, 'каталог объектов загружен');
  } catch (err) {
    log.error({ err }, 'каталог объектов не загружен — WebP-подмена через HEAD');
  }
}

async function exists(key: string): Promise<boolean> {
  if (catalogLoaded) return catalog.has(key);
  return (await headObject(s3, bucket, key)) !== null;
}

function cacheControlFor(key: string): string {
  if (/\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|mp4|webm)$/i.test(key)) return 'public, max-age=2592000';
  if (/\.css$/i.test(key)) return 'public, max-age=604800';
  return 'public, max-age=86400';
}

function toKey(urlPath: string): string | null {
  let p: string;
  try {
    p = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  const key = p.replace(/^\/+/, '');
  if (!key || key.includes('..') || key.includes('\\') || key.endsWith('/')) return null;
  if (!PREFIXES.some((pre) => key.startsWith(pre))) return null;
  return key;
}

await loadCatalog();
const timer = setInterval(() => void loadCatalog(), env.MEDIA_CATALOG_REFRESH * 1000);
timer.unref();

await startService({
  name: 'media',
  port: env.MEDIA_PORT,
  // журнал каждого запроса картинки не нужен — только предупреждения и ошибки
  logger: log.child({}, { level: 'warn' }),
  bodyLimit: 50 * 1024 * 1024,
  async setup(app) {
    // Загрузка своих файлов (будущая админка): PUT /admin/v1/objects/<ключ>
    app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));
    app.put<{ Params: { '*': string } }>('/admin/v1/objects/*', async (req, reply) => {
      if (!isAuthorized(req.headers as Record<string, unknown>, env.ADMIN_TOKEN)) return reply.code(401).send({ error: 'unauthorized' });
      const key = toKey(`/${req.params['*']}`);
      if (!key || !Buffer.isBuffer(req.body)) return reply.code(400).send({ error: 'bad_key_or_body' });
      const contentType = contentTypeFor(key);
      const etag = await putObject(s3, bucket, key, req.body, contentType);
      await db
        .insert(assets)
        .values({ key, size: req.body.length, etag, contentType })
        .onConflictDoUpdate({ target: assets.key, set: { size: req.body.length, etag, contentType, updatedAt: sql`now()` } });
      catalog.add(key);
      return { ok: true, key, etag };
    });

    const serve = async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      const key = toKey(req.url);
      if (!key) return reply.code(404).type('text/plain').send('Not Found');

      let target = key;
      const negotiable = WEBP_SOURCE.test(key);
      if (negotiable) {
        reply.header('Vary', 'Accept');
        const accept = String(req.headers.accept ?? '');
        if (accept.includes('image/webp') && (await exists(`${key}.webp`))) target = `${key}.webp`;
      }

      const ifNoneMatch = req.headers['if-none-match'];
      try {
        const obj = await getObject(
          s3,
          bucket,
          target,
          typeof req.headers.range === 'string' ? req.headers.range : undefined,
          typeof ifNoneMatch === 'string' ? ifNoneMatch : undefined,
        );
        const status = obj.ContentRange ? 206 : 200;
        reply.code(status);
        reply.header('Content-Type', target.endsWith('.webp') ? 'image/webp' : obj.ContentType || contentTypeFor(target));
        reply.header('Cache-Control', cacheControlFor(target));
        reply.header('Accept-Ranges', 'bytes');
        if (obj.ETag) reply.header('ETag', obj.ETag);
        if (obj.LastModified) reply.header('Last-Modified', obj.LastModified.toUTCString());
        if (obj.ContentLength !== undefined) reply.header('Content-Length', obj.ContentLength);
        if (obj.ContentRange) reply.header('Content-Range', obj.ContentRange);
        if (req.method === 'HEAD') {
          (obj.Body as Readable | undefined)?.destroy?.();
          return reply.send();
        }
        return reply.send(obj.Body as Readable);
      } catch (err) {
        if (isNotModified(err)) return reply.code(304).header('Cache-Control', cacheControlFor(target)).send();
        if (isNotFound(err)) return reply.code(404).type('text/plain').send('Not Found');
        const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 416) return reply.code(416).send();
        throw err;
      }
    };

    for (const prefix of PREFIXES) {
      // HEAD Fastify регистрирует сам (exposeHeadRoutes)
      app.get(`/${prefix}*`, serve);
    }
  },
  async readiness() {
    await headObject(s3, bucket, 'og/default.jpg');
  },
  async onClose() {
    clearInterval(timer);
    await close();
  },
});
