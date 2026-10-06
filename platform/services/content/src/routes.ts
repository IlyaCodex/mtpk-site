import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CONTENT_STREAM, isAuthorized, publishEvent, type Logger, type Redis, type ZodTypeProvider } from '@mtpk/shared';
import { classifyStyleBlock, detectTemplate, normalizePath } from '@mtpk/content-kit';
import { cssFileRecord } from '@mtpk/content-kit/styles';
import { extractBlocksInlineStyles, rulesToCss } from '@mtpk/content-kit/inline-styles';
import { BLOCK_LABELS, BLOCK_SCHEMAS, pageHasLeadgen, pageInput, siteSettings, walkBlocks, type Block, type PageInput } from '@mtpk/content-model';
import { renderBlocksToHtml } from '@mtpk/ui/server';
import { orNotFound, Prisma, type Db } from './db.ts';
import type { ContentStore } from './store.ts';

interface Deps {
  store: ContentStore;
  db: Db;
  redis: Redis;
  log: Logger;
  adminToken: string;
  notifyWeb: (paths: string[] | 'all') => Promise<void>;
}

const pathQuery = z.object({ path: z.string().min(1).max(2048).describe('Адрес страницы: /products/…/') });
const idParam = z.object({ id: z.coerce.number().int().positive() });
const ADMIN = [{ adminToken: [] }];

/** Публичное API контента (для сайта и поиска): только чтение. */
export async function publicRoutes(base: FastifyInstance, { store }: Deps) {
  const app = base.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/v1/pages/by-path',
    { schema: { tags: ['Страницы'], summary: 'Страница по адресу: SEO, стили, блоки', querystring: pathQuery } },
    async (req, reply) => {
      const page = await store.getPage(req.query.path);
      if (!page) return reply.code(404).send({ error: 'not_found', path: req.query.path });
      return page;
    },
  );
  app.get('/v1/pages', { schema: { tags: ['Страницы'], summary: 'Опубликованные страницы (для карты сайта)' } }, async () => store.listPages());
  app.get('/v1/settings', { schema: { tags: ['Сайт'], summary: 'Настройки сайта: контакты, меню, подвал' } }, async () => store.settings());
  app.get('/v1/site-data', { schema: { tags: ['Сайт'], summary: 'Склад и разделы со сравнением (для рендера блоков)' } }, async () =>
    store.siteData(),
  );
  app.get('/v1/redirects', { schema: { tags: ['Редиректы'], summary: 'Все редиректы' } }, async () => store.listRedirects());

  // Совместимые адреса старой статики: /data/*.json и вынесенные стили.
  const nocache = { 'Cache-Control': 'no-cache, must-revalidate' };
  app.get('/v1/data/stock.json', { schema: { tags: ['Сайт'], summary: 'Наличие на складе (/data/stock.json)' } }, async (_req, reply) =>
    reply.headers(nocache).send(await store.stock()),
  );
  app.get('/v1/data/compare-index.json', { schema: { tags: ['Сайт'], summary: 'Характеристики для сравнения' } }, async (_req, reply) =>
    reply.headers(nocache).send((await store.compare()).index),
  );
  app.get('/v1/data/compare-sections.json', { schema: { tags: ['Сайт'], summary: 'Разделы со сравнением' } }, async (_req, reply) =>
    reply.headers(nocache).send((await store.compare()).sections),
  );
  app.get(
    '/v1/styles/:file',
    { schema: { tags: ['Сайт'], summary: 'Крупный CSS страницы', params: z.object({ file: z.string() }) } },
    async (req, reply) => {
      const m = req.params.file.match(/^inline-(i?[a-f0-9]{12})\.css$/);
      const css = m ? await store.styleCss(m[1]) : null;
      if (!css) return reply.code(404).type('text/plain').send('not found');
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      return reply.type('text/css; charset=utf-8').send(css);
    },
  );

  // Документы для поискового сервиса
  app.get(
    '/v1/search-docs/by-path',
    { schema: { tags: ['Поиск'], summary: 'Документ страницы для индекса', querystring: pathQuery } },
    async (req, reply) => {
      const doc = await store.searchDoc(req.query.path);
      if (!doc) return reply.code(404).send({ error: 'not_indexable', path: req.query.path });
      return doc;
    },
  );
  app.get('/v1/search-docs', { schema: { tags: ['Поиск'], summary: 'Все документы для индекса (NDJSON)' } }, async (_req, reply) => {
    const lines: string[] = [];
    for await (const doc of store.searchDocs()) lines.push(JSON.stringify(doc));
    return reply.type('application/x-ndjson; charset=utf-8').send(`${lines.join('\n')}\n`);
  });
}

/** Сколько содержимого страницы редактируется формами, а сколько осталось «HTML как есть». */
function blockStats(blocks: Block[]) {
  const all = [...walkBlocks(blocks)].filter((b) => b.type !== 'container' && b.type !== 'text');
  return { blocks: all.length, htmlBlocks: all.filter((b) => b.type === 'html').length };
}

const listQuery = z.object({
  search: z.string().max(200).optional().describe('Поиск по адресу и заголовку'),
  template: z.string().max(64).optional().describe('Тип страницы'),
  kind: z.enum(['page', 'document']).optional(),
  status: z.enum(['published', 'draft']).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

const redirectInput = z.object({
  from: z.string().min(1).startsWith('/').describe('Откуда: /old-url/'),
  to: z.string().min(1).describe('Куда'),
  code: z.union([z.literal(301), z.literal(302), z.literal(308)]).default(301),
  comment: z.string().max(500).optional(),
});

const stockInput = z.array(
  z.object({
    url: z.string().min(1).describe('Адрес страницы товара'),
    qty: z.number().int().nullable().optional(),
    shipping: z.string().nullable().optional().describe('Срок отгрузки'),
    note: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    specs: z.array(z.tuple([z.string(), z.string()])).nullable().optional(),
    extra: z.record(z.string(), z.unknown()).optional().describe('Прочие поля позиции (сохраняются как есть)'),
  }),
);

/** Служебное API для админки (через её сервер; снаружи шлюзом не открыто). */
export async function adminRoutes(base: FastifyInstance, deps: Deps) {
  const { store, db, redis, adminToken, notifyWeb } = deps;
  const app = base.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', async (req, reply) => {
    if (!isAuthorized(req.headers as Record<string, unknown>, adminToken)) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  const changed = async (paths: string[], kind: 'page.upserted' | 'page.deleted' = 'page.upserted') => {
    await store.purge(paths);
    for (const path of paths) await publishEvent(redis, CONTENT_STREAM, { type: kind, path });
    await notifyWeb(paths);
  };

  // ── Схемы блоков: по ним админка строит формы редактирования ──────────
  app.get(
    '/admin/v1/block-schemas',
    { schema: { tags: ['Админка: страницы'], summary: 'JSON-схемы блоков и настроек (формы редактора)', security: ADMIN } },
    async () => ({
      blocks: Object.fromEntries(
        Object.entries(BLOCK_SCHEMAS)
          .filter(([type]) => type !== 'container')
          .map(([type, schema]) => [
            type,
            { label: BLOCK_LABELS[type as Block['type']], schema: z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }) },
          ]),
      ),
      settings: z.toJSONSchema(siteSettings, { unrepresentable: 'any', io: 'input' }),
    }),
  );

  // ── Страницы ───────────────────────────────────────────────────────────
  app.get(
    '/admin/v1/pages',
    { schema: { tags: ['Админка: страницы'], summary: 'Список страниц с фильтрами', querystring: listQuery, security: ADMIN } },
    async (req) => {
      const q = req.query;
      const where: Prisma.PageWhereInput = {
        ...(q.search
          ? { OR: [{ path: { contains: q.search, mode: 'insensitive' } }, { title: { contains: q.search, mode: 'insensitive' } }] }
          : {}),
        ...(q.template ? { template: q.template } : {}),
        ...(q.kind ? { kind: q.kind } : {}),
        ...(q.status ? { status: q.status } : {}),
      };
      const [total, rows] = await Promise.all([
        db.page.count({ where }),
        db.page.findMany({
          where,
          select: {
            id: true,
            path: true,
            title: true,
            kind: true,
            template: true,
            status: true,
            noindex: true,
            blocks: true,
            extraMeta: true,
            updatedAt: true,
          },
          orderBy: { path: 'asc' },
          skip: q.offset,
          take: q.limit,
        }),
      ]);
      return {
        total,
        items: rows.map(({ blocks, extraMeta, ...r }) => ({
          ...r,
          source: String((extraMeta as Record<string, unknown>)?.source ?? ''),
          ...blockStats(blocks as Block[]),
        })),
      };
    },
  );

  app.get(
    '/admin/v1/stats',
    { schema: { tags: ['Админка: страницы'], summary: 'Сводка: страницы, блоки, правки в админке', security: ADMIN } },
    async () => {
      const rows = await db.page.findMany({ select: { kind: true, status: true, blocks: true, extraMeta: true } });
      const byType: Record<string, number> = {};
      let blocks = 0;
      let htmlBlocks = 0;
      for (const r of rows) {
        for (const b of walkBlocks(r.blocks as Block[])) {
          if (b.type === 'container' || b.type === 'text') continue;
          blocks++;
          if (b.type === 'html') htmlBlocks++;
          byType[b.type] = (byType[b.type] ?? 0) + 1;
        }
      }
      return {
        pages: rows.filter((r) => r.kind === 'page').length,
        documents: rows.filter((r) => r.kind === 'document').length,
        drafts: rows.filter((r) => r.status === 'draft').length,
        editedInAdmin: rows.filter((r) => (r.extraMeta as Record<string, unknown>)?.source === 'admin').length,
        blocks,
        htmlBlocks,
        byType,
        redirects: await db.redirect.count(),
        stock: await db.stockItem.count(),
      };
    },
  );

  app.get(
    '/admin/v1/pages/templates',
    { schema: { tags: ['Админка: страницы'], summary: 'Типы страниц и их количество', security: ADMIN } },
    async () =>
      (await db.page.groupBy({ by: ['template'], _count: { _all: true }, orderBy: { _count: { template: 'desc' } } })).map((r) => ({
        template: r.template,
        count: r._count._all,
      })),
  );

  app.get(
    '/admin/v1/pages/:id',
    { schema: { tags: ['Админка: страницы'], summary: 'Страница для редактирования', params: idParam, security: ADMIN } },
    async (req, reply) => {
      const row = await db.page.findUnique({ where: { id: req.params.id } });
      if (!row) return reply.code(404).send({ error: 'not_found' });
      const styles = row.styleHashes.length
        ? await db.styleBlock.findMany({ where: { hash: { in: row.styleHashes } } })
        : [];
      const byHash = new Map(styles.map((s) => [s.hash, s]));
      // body у обычных страниц — архив исходного HTML, в редактор не отдаём
      const { body, ...page } = row;
      return {
        ...page,
        body: row.kind === 'document' ? body : undefined,
        inlineStyles: row.styleHashes.flatMap((h) => {
          const s = byHash.get(h);
          return s ? [s.css] : [];
        }),
      };
    },
  );

  const savePage = async (input: PageInput, id?: number) => {
    const path = input.path.endsWith('.html') ? input.path : normalizePath(input.path);
    const styleRows = input.inlineStyles
      .filter((b) => b.trim())
      .map((css) => classifyStyleBlock(css.trim().startsWith('<style') ? css : `<style>${css}</style>`));
    // style="" в HTML-блоках → классы, их CSS — файлом стилей страницы (последним)
    const { blocks, rules } = extractBlocksInlineStyles(input.blocks);
    if (rules.size) styleRows.push(classifyStyleBlock(`<style>${rulesToCss(rules)}</style>`));
    // CSS блоков «Стили» — тоже файлами (сайт подключает их ссылкой по хешу)
    const blockCss = [...walkBlocks(blocks)].flatMap((b) => (b.type === 'style' ? [cssFileRecord(b.css)] : []));
    if (styleRows.length || blockCss.length) await db.styleBlock.createMany({ data: [...styleRows, ...blockCss], skipDuplicates: true });
    const now = new Date();
    const values = {
      path,
      kind: 'page',
      template: input.template ?? detectTemplate(path, ''),
      title: input.title,
      description: input.description ?? null,
      blocks: blocks as Prisma.InputJsonValue,
      cssTemplates: input.cssTemplates,
      styleHashes: styleRows.map((s) => s.hash),
      preloadImage: input.preloadImage ?? null,
      noindex: input.noindex,
      status: input.status,
      lastmodAt: now,
      modifiedAt: now,
      sourceHash: `admin:${now.getTime()}`,
      updatedAt: now,
    };
    if (id) {
      const prev = await db.page.findUnique({ where: { id }, select: { path: true, extraMeta: true } });
      if (!prev) return null;
      // правка в админке: повторный импорт из Astro страницу больше не перезапишет
      const extraMeta = { ...(prev.extraMeta as Record<string, unknown>), source: 'admin' };
      await db.page.update({ where: { id }, data: { ...values, extraMeta } });
      return { id, paths: prev.path === path ? [path] : [prev.path, path] };
    }
    const row = await db.page.create({ data: { ...values, publishedAt: now, extraMeta: { source: 'admin' } }, select: { id: true } });
    return { id: row.id, paths: [path] };
  };

  app.post(
    '/admin/v1/pages',
    { schema: { tags: ['Админка: страницы'], summary: 'Создать страницу', body: pageInput, security: ADMIN } },
    async (req, reply) => {
      const dup = await db.page.findUnique({ where: { path: normalizePath(req.body.path) }, select: { id: true } });
      if (dup) return reply.code(409).send({ error: 'path_exists', id: dup.id });
      const res = (await savePage(req.body))!;
      await changed(res.paths);
      return reply.code(201).send({ ok: true, id: res.id });
    },
  );

  app.put(
    '/admin/v1/pages/:id',
    { schema: { tags: ['Админка: страницы'], summary: 'Сохранить страницу', params: idParam, body: pageInput, security: ADMIN } },
    async (req, reply) => {
      const dup = await db.page.findUnique({ where: { path: normalizePath(req.body.path) }, select: { id: true } });
      if (dup && dup.id !== req.params.id) return reply.code(409).send({ error: 'path_exists', id: dup.id });
      const res = await savePage(req.body, req.params.id);
      if (!res) return reply.code(404).send({ error: 'not_found' });
      await changed(res.paths);
      return { ok: true, id: req.params.id };
    },
  );

  app.delete(
    '/admin/v1/pages/:id',
    { schema: { tags: ['Админка: страницы'], summary: 'Удалить страницу', params: idParam, security: ADMIN } },
    async (req, reply) => {
      const row = await orNotFound(db.page.delete({ where: { id: req.params.id }, select: { path: true } }));
      if (!row) return reply.code(404).send({ error: 'not_found' });
      await changed([row.path], 'page.deleted');
      return { ok: true };
    },
  );

  app.post(
    '/admin/v1/render',
    {
      schema: {
        tags: ['Админка: страницы'],
        summary: 'Отрисовать блоки в HTML (предпросмотр в редакторе)',
        body: z.object({ path: z.string().default('/'), blocks: z.array(z.unknown()) }),
        security: ADMIN,
      },
    },
    async (req) => {
      const blocks = req.body.blocks as Block[];
      const site = await store.siteData();
      return {
        html: renderBlocksToHtml(blocks, {
          path: req.body.path,
          stock: site.stock,
          compareSections: site.compareSections,
          hasLeadgenBlock: pageHasLeadgen(blocks),
        }),
      };
    },
  );

  // ── Настройки сайта ────────────────────────────────────────────────────
  app.get(
    '/admin/v1/settings',
    { schema: { tags: ['Админка: настройки'], summary: 'Настройки сайта', security: ADMIN } },
    async () => store.settings(),
  );
  app.put(
    '/admin/v1/settings',
    { schema: { tags: ['Админка: настройки'], summary: 'Сохранить настройки сайта', body: siteSettings, security: ADMIN } },
    async (req) => {
      const by = typeof req.headers['x-admin-user'] === 'string' ? req.headers['x-admin-user'] : null;
      const value = req.body as Prisma.InputJsonValue;
      await db.setting.upsert({ where: { key: 'site' }, create: { key: 'site', value, updatedBy: by }, update: { value, updatedBy: by } });
      // шапка и подвал есть на каждой странице
      await store.purge();
      await notifyWeb('all');
      return { ok: true };
    },
  );

  // ── Редиректы ──────────────────────────────────────────────────────────
  const redirectQuery = z.object({
    search: z.string().optional(),
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  });
  app.get(
    '/admin/v1/redirects',
    { schema: { tags: ['Админка: редиректы'], summary: 'Редиректы', querystring: redirectQuery, security: ADMIN } },
    async (req) => {
      const q = req.query;
      const where: Prisma.RedirectWhereInput = q.search
        ? { OR: [{ fromPath: { contains: q.search, mode: 'insensitive' } }, { toPath: { contains: q.search, mode: 'insensitive' } }] }
        : {};
      const [total, items] = await Promise.all([
        db.redirect.count({ where }),
        db.redirect.findMany({ where, orderBy: { fromPath: 'asc' }, skip: q.offset, take: q.limit }),
      ]);
      return { total, items };
    },
  );
  app.post(
    '/admin/v1/redirects',
    { schema: { tags: ['Админка: редиректы'], summary: 'Добавить (или заменить) редирект', body: redirectInput, security: ADMIN } },
    async (req, reply) => {
      const r = req.body;
      const row = await db.redirect.upsert({
        where: { fromPath: r.from },
        create: { fromPath: r.from, toPath: r.to, code: r.code, source: 'manual', comment: r.comment },
        update: { toPath: r.to, code: r.code, comment: r.comment },
      });
      await store.purgeRedirects();
      return reply.code(201).send(row);
    },
  );
  app.put(
    '/admin/v1/redirects/:id',
    { schema: { tags: ['Админка: редиректы'], summary: 'Изменить редирект', params: idParam, body: redirectInput, security: ADMIN } },
    async (req, reply) => {
      const r = req.body;
      const row = await orNotFound(
        db.redirect.update({ where: { id: req.params.id }, data: { fromPath: r.from, toPath: r.to, code: r.code, comment: r.comment } }),
      );
      if (!row) return reply.code(404).send({ error: 'not_found' });
      await store.purgeRedirects();
      return row;
    },
  );
  app.delete(
    '/admin/v1/redirects/:id',
    { schema: { tags: ['Админка: редиректы'], summary: 'Удалить редирект', params: idParam, security: ADMIN } },
    async (req, reply) => {
      const row = await orNotFound(db.redirect.delete({ where: { id: req.params.id }, select: { id: true } }));
      if (!row) return reply.code(404).send({ error: 'not_found' });
      await store.purgeRedirects();
      return { ok: true };
    },
  );

  // ── Наличие на складе ──────────────────────────────────────────────────
  app.get(
    '/admin/v1/stock',
    { schema: { tags: ['Админка: наличие'], summary: 'Позиции на складе', security: ADMIN } },
    async () => db.stockItem.findMany({ orderBy: { position: 'asc' } }),
  );
  app.put(
    '/admin/v1/stock',
    { schema: { tags: ['Админка: наличие'], summary: 'Сохранить список позиций (целиком, в порядке показа)', body: stockInput, security: ADMIN } },
    async (req) => {
      const items = req.body;
      await db.$transaction([
        db.stockItem.deleteMany(),
        db.stockItem.createMany({
          data: items.map((it, i) => ({
            position: i,
            url: it.url,
            qty: it.qty ?? null,
            shipping: it.shipping ?? null,
            note: it.note ?? null,
            title: it.title ?? null,
            image: it.image ?? null,
            specs: it.specs ?? Prisma.DbNull,
            extra: (it.extra ?? {}) as Prisma.InputJsonValue,
          })),
        }),
      ]);
      // бейджи «В наличии» есть в карточках каталога и на страницах товаров — пересобрать всё
      await store.purge();
      await notifyWeb('all');
      return { ok: true, count: items.length };
    },
  );

  // ── Кеш ────────────────────────────────────────────────────────────────
  app.post(
    '/admin/v1/cache/purge',
    {
      schema: {
        tags: ['Админка: сервис'],
        summary: 'Сбросить кеш (страниц или весь) и перегенерировать сайт',
        body: z.object({ paths: z.array(z.string()).optional() }).optional(),
        security: ADMIN,
      },
    },
    async (req) => {
      const paths = req.body?.paths;
      const removed = await store.purge(paths);
      await notifyWeb(paths?.length ? paths : 'all');
      return { ok: true, removed };
    },
  );
}
