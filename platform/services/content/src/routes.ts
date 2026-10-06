import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { isAuthorized, publishEvent, CONTENT_STREAM, type Redis, type Logger } from '@mtpk/shared';
import { classifyStyleBlock, detectTemplate, normalizePath } from '@mtpk/content-kit';
import { pages, redirects, stockItems, styleBlocks, eq, sql, type Db } from './db.ts';
import type { ContentStore } from './store.ts';

interface Deps {
  store: ContentStore;
  db: Db;
  redis: Redis;
  log: Logger;
  adminToken: string;
  notifyWeb: (paths: string[] | 'all') => Promise<void>;
}

const pathQuery = z.object({ path: z.string().min(1).max(2048) });

function cacheable(reply: FastifyReply, seconds: number) {
  reply.header('Cache-Control', `public, max-age=${seconds}`);
}

/** Публичное (для сайта) API контента: только чтение. */
export async function publicRoutes(app: FastifyInstance, { store }: Deps) {
  app.get('/v1/pages/by-path', async (req, reply) => {
    const { path } = pathQuery.parse(req.query);
    const page = await store.getPage(path);
    if (!page) return reply.code(404).send({ error: 'not_found', path });
    return page;
  });

  app.get('/v1/pages', async () => store.listPages());
  app.get('/v1/redirects', async () => store.listRedirects());

  // Совместимые адреса старой статики: /data/*.json и вынесенные стили.
  app.get('/v1/data/stock.json', async (_req, reply) => {
    reply.header('Cache-Control', 'no-cache, must-revalidate');
    return store.stock();
  });
  app.get('/v1/data/compare-index.json', async (_req, reply) => {
    reply.header('Cache-Control', 'no-cache, must-revalidate');
    return (await store.compare()).index;
  });
  app.get('/v1/data/compare-sections.json', async (_req, reply) => {
    reply.header('Cache-Control', 'no-cache, must-revalidate');
    return (await store.compare()).sections;
  });
  app.get<{ Params: { file: string } }>('/v1/styles/:file', async (req, reply) => {
    const m = req.params.file.match(/^inline-([a-f0-9]{12})\.css$/);
    const css = m ? await store.styleCss(m[1]) : null;
    if (!css) return reply.code(404).type('text/plain').send('not found');
    // имя = хеш содержимого → можно кешировать навсегда
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return reply.type('text/css; charset=utf-8').send(css);
  });

  // Документы для поискового сервиса
  app.get('/v1/search-docs/by-path', async (req, reply) => {
    const { path } = pathQuery.parse(req.query);
    const doc = await store.searchDoc(path);
    if (!doc) return reply.code(404).send({ error: 'not_indexable', path });
    return doc;
  });
  app.get('/v1/search-docs', async (_req, reply) => {
    // NDJSON-поток: по документу на строку, без сборки гигантского массива в памяти
    reply.type('application/x-ndjson; charset=utf-8');
    const lines: string[] = [];
    for await (const doc of store.searchDocs()) lines.push(JSON.stringify(doc));
    cacheable(reply, 0);
    return `${lines.join('\n')}\n`;
  });
}

const pageInput = z.object({
  path: z.string().min(1),
  title: z.string(),
  description: z.string().nullable().optional(),
  body: z.string(),
  cssTemplates: z.array(z.string()).optional(),
  /** Стили страницы как в meta.inline_styles: массив блоков <style>…</style> */
  inlineStyles: z.array(z.string()).optional(),
  preloadImage: z.string().nullable().optional(),
  noindex: z.boolean().optional(),
  status: z.enum(['published', 'draft']).optional(),
});

/** Служебное API: правка контента и сброс кешей. Только с X-Admin-Token. */
export async function adminRoutes(app: FastifyInstance, deps: Deps) {
  const { store, db, redis, adminToken, notifyWeb } = deps;
  app.addHook('onRequest', async (req, reply) => {
    if (!isAuthorized(req.headers as Record<string, unknown>, adminToken)) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.post('/admin/v1/cache/purge', async (req) => {
    const body = z.object({ paths: z.array(z.string()).optional() }).parse(req.body ?? {});
    const removed = await store.purge(body.paths);
    await notifyWeb(body.paths?.length ? body.paths : 'all');
    return { ok: true, removed };
  });

  app.get('/admin/v1/pages/raw', async (req, reply) => {
    const { path } = pathQuery.parse(req.query);
    const [row] = await db.select().from(pages).where(eq(pages.path, path)).limit(1);
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return row;
  });

  app.put('/admin/v1/pages', async (req) => {
    const input = pageInput.parse(req.body);
    const path = input.path.endsWith('.html') ? input.path : normalizePath(input.path);
    const blocks = (input.inlineStyles ?? []).filter((b) => b.trim()).map(classifyStyleBlock);
    if (blocks.length) await db.insert(styleBlocks).values(blocks).onConflictDoNothing();
    const values = {
      path,
      kind: 'page',
      template: detectTemplate(path, input.body),
      title: input.title,
      description: input.description ?? null,
      body: input.body,
      cssTemplates: input.cssTemplates ?? [],
      styleHashes: blocks.map((b) => b.hash),
      preloadImage: input.preloadImage ?? null,
      noindex: input.noindex ?? false,
      status: input.status ?? 'published',
      extraMeta: { source: 'admin' },
      lastmodAt: new Date(),
      modifiedAt: new Date(),
      sourceHash: `admin:${Date.now()}`,
      updatedAt: new Date(),
    };
    await db
      .insert(pages)
      .values({ ...values, publishedAt: new Date() })
      .onConflictDoUpdate({ target: pages.path, set: values });
    await store.purge([path]);
    await publishEvent(redis, CONTENT_STREAM, { type: 'page.upserted', path });
    await notifyWeb([path]);
    return { ok: true, path };
  });

  app.delete('/admin/v1/pages', async (req) => {
    const { path } = pathQuery.parse(req.query);
    await db.delete(pages).where(eq(pages.path, path));
    await store.purge([path]);
    await publishEvent(redis, CONTENT_STREAM, { type: 'page.deleted', path });
    await notifyWeb([path]);
    return { ok: true, path };
  });

  app.put('/admin/v1/redirects', async (req) => {
    const r = z.object({ from: z.string().min(1), to: z.string().min(1), code: z.number().int().optional(), comment: z.string().optional() }).parse(req.body);
    await db
      .insert(redirects)
      .values({ fromPath: r.from, toPath: r.to, code: r.code ?? 301, source: 'manual', comment: r.comment })
      .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: r.to, code: r.code ?? 301, comment: r.comment, updatedAt: sql`now()` } });
    await store.purgeRedirects();
    return { ok: true };
  });

  app.put('/admin/v1/stock', async (req) => {
    const items = z
      .array(
        z.object({
          url: z.string().min(1),
          qty: z.number().int().nullable().optional(),
          shipping: z.string().nullable().optional(),
          note: z.string().nullable().optional(),
          title: z.string().nullable().optional(),
          image: z.string().nullable().optional(),
          specs: z.array(z.tuple([z.string(), z.string()])).nullable().optional(),
        }),
      )
      .parse(req.body);
    await db.transaction(async (tx) => {
      await tx.delete(stockItems);
      if (items.length) {
        await tx.insert(stockItems).values(
          items.map((it, i) => ({
            position: i,
            url: it.url,
            qty: it.qty ?? null,
            shipping: it.shipping ?? null,
            note: it.note ?? null,
            title: it.title ?? null,
            image: it.image ?? null,
            specs: it.specs ?? null,
          })),
        );
      }
    });
    await store.purge(items.map((i) => i.url));
    await notifyWeb(['/nalichie/']);
    return { ok: true, count: items.length };
  });
}
