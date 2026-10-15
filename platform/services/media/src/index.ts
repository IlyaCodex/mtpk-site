/**
 * Медиасервис: отдаёт файлы сайта из S3 (MinIO локально, TimeWeb Cloud S3 на сервере) по тем же
 * адресам, что и раньше (/img/…, /files/…, /docs/…, /og/…, /praktikum/…).
 *
 * Повторяет поведение nginx старого сайта:
 *  - WebP по Accept: на /img/foo.png браузеру с поддержкой WebP отдаётся
 *    соседний foo.png.webp (T-PERF-7, try_files $uri$webp_suffix), Vary: Accept.
 *    Копию сервис делает сам: после загрузки в медиатеку, по первому запросу
 *    картинки без копии и при запуске — для всех старых файлов;
 *  - кеш: картинки/шрифты — 30 дней, css — 7 дней;
 *  - Range-запросы (видео, большие PDF) и ETag/304.
 */
import { Readable } from 'node:stream';
import { z } from 'zod';
import {
  contentTypeFor,
  createLogger,
  createS3,
  deleteObject,
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
  type ZodTypeProvider,
} from '@mtpk/shared';
import { createDb } from '@mtpk/db';
import { dropVariants, encodeWebpCopy, getVariant, noWebpMarker, pickFormat, readAll, snapWidth, VARIANT_SOURCE } from './variants.ts';

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
/** WebP-копия картинки (foo.png.webp) — служебная, в медиатеке не показывается. */
const WEBP_COPY = /\.(png|jpe?g)\.webp$/i;

// Каталог бакета «ключ → ETag»: есть ли WebP-сосед и какая версия файла —
// без лишних запросов в S3.
let catalog = new Map<string, string>();
let catalogLoaded = false;
async function loadCatalog(): Promise<void> {
  try {
    const rows = await db.asset.findMany({ select: { key: true, etag: true } });
    if (rows.length) {
      catalog = new Map(rows.map((r) => [r.key, r.etag]));
    } else {
      // таблица пуста (файлы залиты в бакет напрямую) — читаем список прямо из бакета
      const keys = new Map<string, string>();
      for await (const o of listObjects(s3, bucket)) keys.set(o.key, o.etag);
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

/** Версия файла (ETag): из каталога, для только что залитого другим экземпляром — из S3. null — файла нет. */
async function versionOf(key: string): Promise<string | null> {
  const known = catalog.get(key);
  if (known) return known;
  const head = await headObject(s3, bucket, key);
  return head ? (head.ETag ?? '').replaceAll('"', '') : null;
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

const ADMIN = [{ adminToken: [] }];
const TAGS = ['Админка: медиатека'];
const keyParam = z.object({ '*': z.string().min(1).describe('Ключ файла: img/…') });

/** Медиатека для админки: папки и файлы, загрузка, удаление. */
async function adminRoutes(base: import('fastify').FastifyInstance) {
  const app = base.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', async (req, reply) => {
    if (!isAuthorized(req.headers as Record<string, unknown>, env.ADMIN_TOKEN)) return reply.code(401).send({ error: 'unauthorized' });
  });
  // тело загрузки — файл как есть (любой Content-Type)
  app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  app.get(
    '/admin/v1/objects',
    {
      schema: {
        tags: TAGS,
        summary: 'Содержимое папки: подпапки и файлы',
        querystring: z.object({
          prefix: z.string().default('img/').describe('Папка: img/, files/, docs/…'),
          search: z.string().max(200).optional().describe('Поиск по имени во всей папке'),
          offset: z.coerce.number().int().min(0).default(0),
          limit: z.coerce.number().int().min(1).max(500).default(100),
        }),
        security: ADMIN,
      },
    },
    async (req) => {
      const { prefix, search, offset, limit } = req.query;
      const rows = await db.asset.findMany({ where: { key: { startsWith: prefix } }, orderBy: { key: 'asc' } });
      const folders = new Map<string, number>();
      const files: typeof rows = [];
      for (const r of rows) {
        const rest = r.key.slice(prefix.length);
        if (search) {
          // поиск — по всей папке, без деления на подпапки; WebP-копии не показываем
          if (rest.toLowerCase().includes(search.toLowerCase()) && !WEBP_COPY.test(r.key)) files.push(r);
          continue;
        }
        const slash = rest.indexOf('/');
        if (slash >= 0) folders.set(rest.slice(0, slash), (folders.get(rest.slice(0, slash)) ?? 0) + 1);
        else if (!WEBP_COPY.test(r.key)) files.push(r);
      }
      return {
        prefix,
        folders: [...folders].map(([name, count]) => ({ name, prefix: `${prefix}${name}/`, count })),
        total: files.length,
        files: files.slice(offset, offset + limit).map((f) => ({
          key: f.key,
          url: `/${f.key}`,
          size: f.size,
          contentType: f.contentType,
          updatedAt: f.updatedAt,
          webp: catalog.has(`${f.key}.webp`),
        })),
      };
    },
  );

  app.put(
    '/admin/v1/objects/*',
    {
      schema: {
        tags: TAGS,
        summary: 'Загрузить файл (тело запроса — содержимое файла). Имя занято — сохраняется как foo-2.png: адрес ответа — итоговый',
        params: keyParam,
        security: ADMIN,
      },
    },
    async (req, reply) => {
      const wanted = toKey(`/${req.params['*']}`);
      if (!wanted || !Buffer.isBuffer(req.body)) return reply.code(400).send({ error: 'bad_key_or_body' });
      // Существующий файл не перезаписываем: браузеры и кеш шлюза держат его
      // до 30 дней, замена «на месте» до посетителей не дойдёт.
      const key = await freeKey(wanted);
      const contentType = contentTypeFor(key);
      const etag = await putObject(s3, bucket, key, req.body, contentType);
      await db.asset.upsert({
        where: { key },
        create: { key, size: req.body.length, etag, contentType },
        update: { size: req.body.length, etag, contentType },
      });
      catalog.set(key, etag);
      // WebP-копия — в фоне: загрузка не ждёт перекодирования
      ensureWebp(key);
      return { ok: true, key, url: `/${key}`, etag };
    },
  );

  app.delete(
    '/admin/v1/objects/*',
    { schema: { tags: TAGS, summary: 'Удалить файл (с WebP-копией и уменьшенными копиями)', params: keyParam, security: ADMIN } },
    async (req, reply) => {
      const key = toKey(`/${req.params['*']}`);
      if (!key) return reply.code(400).send({ error: 'bad_key' });
      await removeObject(key);
      if (catalog.has(`${key}.webp`)) await removeObject(`${key}.webp`);
      await dropVariants(s3, bucket, key);
      noWebp.delete(key);
      return { ok: true };
    },
  );
}

/** Свободное имя: foo.png, иначе foo-2.png, foo-3.png… */
async function freeKey(key: string): Promise<string> {
  if (!(await exists(key))) return key;
  const dot = key.lastIndexOf('.');
  const [stem, ext] = dot > key.lastIndexOf('/') ? [key.slice(0, dot), key.slice(dot)] : [key, ''];
  for (let i = 2; ; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!(await exists(candidate))) return candidate;
  }
}

/** Удалить файл из бакета, таблицы и каталога. */
async function removeObject(key: string): Promise<void> {
  await deleteObject(s3, bucket, key);
  await db.asset.deleteMany({ where: { key } });
  catalog.delete(key);
}

// ── WebP-копии ─────────────────────────────────────────────────────────────
// У каждой PNG/JPG — соседний foo.png.webp: прямой адрес /img/foo.png отдаёт его
// браузерам с WebP. Перекодирование — в общей очереди с уменьшенными копиями
// (не больше двух сразу), одна картинка — одной задачей.
const webpJobs = new Map<string, Promise<void>>();
/** Картинки, у которых WebP не легче исходника (метка в S3), — их не перекодируем. */
const noWebp = new Set<string>();

const needsWebp = (key: string) =>
  catalogLoaded && WEBP_SOURCE.test(key) && PREFIXES.some((p) => key.startsWith(p)) && catalog.has(key) && !catalog.has(`${key}.webp`) && !noWebp.has(key);

/** Начать (или продолжить) создание WebP-копии; true — копия делается. */
function ensureWebp(key: string): boolean {
  if (webpJobs.has(key)) return true;
  if (!needsWebp(key)) return false;
  webpJobs.set(key, makeWebp(key).finally(() => webpJobs.delete(key)));
  return true;
}

async function makeWebp(key: string): Promise<void> {
  try {
    if (await headObject(s3, bucket, noWebpMarker(key))) {
      noWebp.add(key);
      return;
    }
    const source = await readAll((await getObject(s3, bucket, key)).Body);
    const webp = await encodeWebpCopy(source);
    if (!webp) {
      await putObject(s3, bucket, noWebpMarker(key), Buffer.alloc(0), 'text/plain');
      noWebp.add(key);
      return;
    }
    const copy = `${key}.webp`;
    const etag = await putObject(s3, bucket, copy, webp, 'image/webp');
    await db.asset.upsert({ where: { key: copy }, create: { key: copy, size: webp.length, etag, contentType: 'image/webp' }, update: { size: webp.length, etag, contentType: 'image/webp' } });
    catalog.set(copy, etag);
    log.info({ key, from: source.length, to: webp.length }, 'WebP-копия готова');
  } catch (err) {
    if (!isNotFound(err)) log.warn({ err, key }, 'WebP-копия не создана');
  }
}

/** Файлы без WebP-копии (залиты до автоматики или в обход медиатеки) — по одному, в фоне после запуска. */
async function backfillWebp(): Promise<void> {
  const todo = [...catalog.keys()].filter(needsWebp);
  if (!todo.length) return;
  log.info({ files: todo.length }, 'WebP-копии: делаю для файлов без копии');
  for (const key of todo) if (ensureWebp(key)) await webpJobs.get(key);
  log.info({ files: todo.length }, 'WebP-копии: готово');
}

await loadCatalog();
const timer = setInterval(() => void loadCatalog(), env.MEDIA_CATALOG_REFRESH * 1000);
timer.unref();
const backfill = setTimeout(() => void backfillWebp(), 15_000);
backfill.unref();

await startService({
  name: 'media',
  description: 'Файлы сайта из S3 (MinIO/TimeWeb S3) по прежним адресам /img, /files, /docs, /og, /praktikum: WebP по Accept, Range, ETag. Служебное /admin/v1 — медиатека: список, загрузка, удаление.',
  port: env.MEDIA_PORT,
  // журнал каждого запроса картинки не нужен — только предупреждения и ошибки
  logger: log.child({}, { level: 'warn' }),
  bodyLimit: 50 * 1024 * 1024,
  async setup(app) {
    await app.register(adminRoutes);

    const serve = async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      const key = toKey(req.url);
      if (!key) return reply.code(404).type('text/plain').send('Not Found');

      // ?w=640 — уменьшенная копия в AVIF/WebP (для srcset на сайте). Копии
      // подписаны версией исходника: заменили файл — копии создаются заново.
      const width = snapWidth(Number(new URL(req.url, 'http://media').searchParams.get('w')));
      if (width && VARIANT_SOURCE.test(key)) {
        try {
          const version = await versionOf(key);
          if (version === null) return reply.code(404).type('text/plain').send('Not Found');
          const variant = await getVariant(s3, bucket, key, width, pickFormat(String(req.headers.accept ?? ''), key), version);
          reply.header('Vary', 'Accept');
          reply.header('Content-Type', variant.contentType);
          reply.header('Cache-Control', 'public, max-age=2592000');
          reply.header('Content-Length', variant.body.length);
          return reply.send(req.method === 'HEAD' ? undefined : variant.body);
        } catch (err) {
          if (isNotFound(err)) return reply.code(404).type('text/plain').send('Not Found');
          throw err;
        }
      }

      let target = key;
      let webpPending = false;
      const negotiable = WEBP_SOURCE.test(key);
      if (negotiable) {
        reply.header('Vary', 'Accept');
        const accept = String(req.headers.accept ?? '');
        if (accept.includes('image/webp')) {
          if (await exists(`${key}.webp`)) target = `${key}.webp`;
          // копии ещё нет — делается; исходник пока с коротким кешем, чтобы шлюз и браузер скоро взяли WebP
          else webpPending = ensureWebp(key);
        }
      }
      const cacheControl = webpPending ? 'public, max-age=120' : cacheControlFor(target);

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
        reply.header('Cache-Control', cacheControl);
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
        if (isNotModified(err)) return reply.code(304).header('Cache-Control', cacheControl).send();
        if (isNotFound(err)) return reply.code(404).type('text/plain').send('Not Found');
        const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 416) return reply.code(416).send();
        throw err;
      }
    };

    for (const prefix of PREFIXES) {
      // HEAD Fastify регистрирует сам (exposeHeadRoutes)
      app.get(`/${prefix}*`, { schema: { tags: ['Файлы'], summary: `Файл /${prefix}… (WebP по Accept, Range, ETag)` } }, serve);
    }
  },
  async readiness() {
    await headObject(s3, bucket, 'og/default.jpg');
  },
  async onClose() {
    clearInterval(timer);
    clearTimeout(backfill);
    await close();
  },
});
