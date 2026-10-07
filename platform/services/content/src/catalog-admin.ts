import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { normalizePath } from '@mtpk/content-kit';
import { action, block, type Block, type Crumb } from '@mtpk/content-model';
import { ServiceRefusal, type ZodTypeProvider } from '@mtpk/shared';
import { plainText } from './catalog.ts';
import { catalogDependents, loadCatalog } from './catalog-data.ts';
import { Prisma, type Db } from './db.ts';
import { storeScripts } from './scripts.ts';
import type { ContentStore } from './store.ts';

/**
 * Каталог в админке: категории (разделы на главной), подкатегории и товары.
 * Карточка — данные каталога (название, обложка, описание, характеристики
 * в карточке, порядок); при добавлении создаётся и страница — по образцу
 * соседних страниц того же раздела, черновиком. Тексты, фото и SEO
 * страницы правятся как у любой страницы (/admin/v1/pages/:id).
 */

interface Deps {
  db: Db;
  store: ContentStore;
  /** сброс кеша, события для поиска, сигнал сайту */
  changed: (paths: string[], kind?: 'page.upserted' | 'page.deleted') => Promise<void>;
}

const ADMIN = [{ adminToken: [] }];
const TAG = 'Админка: каталог';
const idParam = z.object({ id: z.coerce.number().int().positive() });
type Tx = Prisma.TransactionClient;
const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Адрес страницы каталога: /products/латиница-через-дефис/…/ */
const PATH_RE = /^\/products\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+$/;

const reject = (status: number, code: string, message: string): never => {
  throw new ServiceRefusal(status, code, message);
};

const text = (label: string) => z.string().max(2000).describe(label);
const optText = (label: string) => z.string().max(2000).nullable().optional().describe(label);
/** Пустая строка в необязательном поле — «нет значения». */
const orNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

const cover = {
  cover: optText('Обложка карточки: /img/…'),
  coverAlt: text('Что на обложке (alt)').default(''),
};
const statusField = z.enum(['published', 'draft']).describe('На сайте или черновик');

const categoryInput = z.object({
  name: text('Название в карточке на главной').min(1),
  crumb: optText('Короткое название — в хлебных крошках (по умолчанию как название)'),
  path: text('Адрес страницы: /products/…/').min(1),
  ...cover,
  onHome: z.boolean().default(true).describe('Показывать в сетке «Оборудование» на главной'),
  status: statusField.optional(),
  productBlocks: z.array(block).optional().describe('Общие секции под каждым товаром категории: формы, преимущества, партнёры'),
});

const subcategoryInput = z.object({
  categoryId: z.number().int().positive().describe('Категория'),
  name: text('Название в карточке').min(1),
  crumb: optText('Короткое название — в хлебных крошках (по умолчанию как название)'),
  description: text('Краткое описание в карточке').default(''),
  path: text('Адрес страницы: /products/…/').min(1),
  ...cover,
  listed: z.boolean().default(true).describe('Показывать карточку в «Модельном ряду» категории'),
  status: statusField.optional(),
});

const productInput = z.object({
  categoryId: z.number().int().positive().describe('Категория'),
  subcategoryId: z.number().int().positive().nullable().describe('Подкатегория (null — товар прямо в категории)'),
  name: text('Название в карточке').min(1),
  nameNote: optText('Примечание после названия: «(на гидравлике)»'),
  path: text('Адрес страницы: /products/…/').min(1),
  ...cover,
  badge: optText('Плашка на обложке'),
  origin: optText('Происхождение: «Производство Россия»'),
  caption: optText('Подпись под названием'),
  label: optText('Надпись над названием (линейки ЛВМ/ЛГМ)'),
  linkText: optText('Надпись ссылки вместо «Подробнее»'),
  warranty: optText('Гарантия в блоке «Преимущества» под товаром, если не 18 месяцев: «12 месяцев» (у нового товара по умолчанию — как у соседних)'),
  specs: z.array(z.object({ label: text('Параметр'), value: text('Значение') })).default([]).describe('Характеристики в карточке'),
  actions: z.array(action).optional().describe('Кнопки карточки (по умолчанию — «Запросить цену» и «Подробнее»)'),
  attrs: z.record(z.string(), z.string()).optional().describe('Значения для фильтра каталога: data-power, data-mass…'),
  listed: z.boolean().default(true).describe('Показывать в списке товаров'),
  status: statusField.optional(),
});

const reorderInput = z.object({
  kind: z.enum(['categories', 'subcategories', 'products']),
  ids: z.array(z.number().int().positive()).min(1).max(1000).describe('Записи в новом порядке'),
});

// ── Страницы: новые — по образцу соседних ─────────────────────────────────

type PageRow = { id: number; path: string; blocks: unknown; cssTemplates: string[] };
const heroOf = (blocks: unknown) =>
  (blocks as Block[]).find((b): b is Extract<Block, { type: 'categoryHero' | 'productHero' }> => b.type === 'categoryHero' || b.type === 'productHero');

/** Крошки для страницы внутри parent: крошки родителя, его последняя — ссылкой на него. */
function crumbsUnder(parent: PageRow): Crumb[] {
  const list = heroOf(parent.blocks)?.breadcrumbs ?? [{ href: '/', label: 'Главная' }];
  return list.map((c, i) => (i === list.length - 1 ? { label: c.label, href: parent.path } : c));
}

const DEFAULT_ACTIONS = [
  { href: '#leadgen', label: 'Подобрать модель', className: 'btn btn--primary', arrow: true },
];
const LIST_HEAD = { eyebrow: 'Каталог', title: 'Модельный <em>ряд</em>' };

/** SEO-заголовок новой страницы — как у остальных: «Название | УралИндуктор». */
const seoTitle = (name: string) => `${plainText(name)} | УралИндуктор`;

async function checkPath(tx: Tx, path: string, under: string, selfPageId?: number): Promise<void> {
  if (!PATH_RE.test(path)) reject(400, 'bad_path', 'Адрес — латиницей через дефис, со слешами: /products/razdel/model/');
  if (!path.startsWith(under) || path === under) reject(400, 'bad_path', `Адрес должен начинаться с ${under}`);
  const dup = await tx.page.findUnique({ where: { path }, select: { id: true } });
  if (dup && dup.id !== selfPageId) reject(409, 'path_exists', 'Страница с таким адресом уже есть');
}

const nextSort = (sorts: { sort: number }[]) => (sorts.length ? Math.max(...sorts.map((s) => s.sort)) + 1 : 0);

/** Новая страница категории/подкатегории/товара; стили шаблона — как у соседних страниц того же типа. */
async function createPage(tx: Tx, opts: { path: string; template: string; name: string; blocks: Block[]; sampleCss: string[] }) {
  const now = new Date();
  return tx.page.create({
    data: {
      path: opts.path,
      kind: 'page',
      template: opts.template,
      title: seoTitle(opts.name),
      blocks: json(opts.blocks),
      cssTemplates: opts.sampleCss,
      status: 'draft',
      sourceHash: `admin:${now.getTime()}`,
      lastmodAt: now,
      modifiedAt: now,
      publishedAt: now,
      extraMeta: json({ source: 'catalog' }),
    },
    select: { id: true, path: true },
  });
}

/**
 * Смена адреса страницы: старый адрес — 301 на новый (ссылки и поисковики
 * не теряются). Адрес раздела с вложенными страницами не меняется — их
 * адреса начинаются с него.
 */
async function movePage(tx: Tx, pageId: number, from: string, to: string, hasChildren: boolean) {
  if (from === to) return;
  if (hasChildren) reject(409, 'has_children', 'У раздела есть подкатегории или товары — адрес раздела поменять нельзя');
  await tx.page.update({ where: { id: pageId }, data: { path: to } });
  await tx.redirect.upsert({
    where: { fromPath: from },
    create: { fromPath: from, toPath: to, code: 301, source: 'admin', comment: 'смена адреса в каталоге' },
    update: { toPath: to, code: 301 },
  });
  // старые редиректы на прежний адрес — сразу на новый (без цепочек)
  await tx.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
}

/** Подпись страницы в крошках (её собственная — последняя, у вложенных — ссылкой на неё). */
async function renameCrumb(tx: Tx, path: string, label: string) {
  const pages = await tx.page.findMany({ where: { path: { startsWith: path } }, select: { id: true, path: true, blocks: true } });
  for (const p of pages) {
    let touched = false;
    const blocks = (p.blocks as Block[]).map((b) => {
      if (b.type !== 'categoryHero' && b.type !== 'productHero') return b;
      const breadcrumbs = b.breadcrumbs.map((c, i, all) => {
        const own = p.path === path && i === all.length - 1;
        if ((own || c.href === path) && c.label !== label) {
          touched = true;
          return { ...c, label };
        }
        return c;
      });
      return { ...b, breadcrumbs };
    });
    if (touched) await tx.page.update({ where: { id: p.id }, data: { blocks: json(blocks) } });
  }
}

/** Удалённая страница — 301 на страницу выше (на неё же вели ссылки «назад»). */
async function deletePage(tx: Tx, pageId: number, path: string, to: string) {
  await tx.page.delete({ where: { id: pageId } });
  await tx.redirect.upsert({
    where: { fromPath: path },
    create: { fromPath: path, toPath: to, code: 301, source: 'admin', comment: 'удалено из каталога' },
    update: { toPath: to, code: 301 },
  });
  await tx.redirect.updateMany({ where: { toPath: path }, data: { toPath: to } });
}

/**
 * Сохранение страницы каталога обычным редактором: адрес категории или
 * подкатегории с вложенными страницами не меняется, у остальных старый
 * адрес — 301 на новый.
 */
export async function catalogPageGuard(db: Db, pageId: number, path: string): Promise<void> {
  const page = await db.page.findUnique({
    where: { id: pageId },
    select: {
      path: true,
      category: { select: { _count: { select: { subcategories: true, products: true } } } },
      subcategory: { select: { _count: { select: { products: true } } } },
      product: { select: { id: true } },
    },
  });
  if (!page || page.path === path || (!page.category && !page.subcategory && !page.product)) return;
  const children = (page.category ? page.category._count.subcategories + page.category._count.products : 0) + (page.subcategory?._count.products ?? 0);
  if (children) reject(409, 'has_children', 'У раздела есть подкатегории или товары — адрес раздела поменять нельзя');
  if (!PATH_RE.test(path)) reject(400, 'bad_path', 'Адрес — латиницей через дефис, со слешами: /products/razdel/model/');
  await db.redirect.upsert({
    where: { fromPath: page.path },
    create: { fromPath: page.path, toPath: path, code: 301, source: 'admin', comment: 'смена адреса в каталоге' },
    update: { toPath: path, code: 301 },
  });
  await db.redirect.updateMany({ where: { toPath: page.path }, data: { toPath: path } });
}

// ── Маршруты ──────────────────────────────────────────────────────────────

export async function catalogAdminRoutes(base: FastifyInstance, { db, store, changed }: Deps) {
  const app = base.withTypeProvider<ZodTypeProvider>();

  /** Страницы, на которых правка видна: до и после неё (товар мог переехать в другой список). */
  const dependents = async (pageId: number, opts?: { productBlocks?: boolean }) => catalogDependents(await loadCatalog(db), pageId, opts);
  const tx = <T>(fn: (t: Tx) => Promise<T>) => db.$transaction(fn, { maxWait: 10_000, timeout: 60_000 });

  app.get('/admin/v1/catalog/tree', { schema: { tags: [TAG], summary: 'Категории, подкатегории и товары — для экрана «Каталог»', security: ADMIN } }, async () => {
    const page = { select: { id: true, path: true, status: true, updatedAt: true } } as const;
    const [categories, subcategories, products] = await Promise.all([
      db.category.findMany({ include: { page }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] }),
      db.subcategory.findMany({ include: { page }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] }),
      db.product.findMany({
        select: { id: true, pageId: true, categoryId: true, subcategoryId: true, name: true, nameNote: true, cover: true, sort: true, listed: true, page },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const flat = <T extends { page: { path: string; status: string; updatedAt: Date } }>({ page: p, ...rest }: T) => ({ ...rest, path: p.path, status: p.status, updatedAt: p.updatedAt });
    return {
      categories: categories.map(({ productBlocks: _b, coverAttrs: _a, ...c }) => ({
        ...flat(c),
        subcategories: subcategories.filter((s) => s.categoryId === c.id).length,
        products: products.filter((p) => p.categoryId === c.id).length,
      })),
      subcategories: subcategories.map(({ coverAttrs: _a, ...s }) => ({ ...flat(s), products: products.filter((p) => p.subcategoryId === s.id).length })),
      products: products.map(flat),
    };
  });

  // ── Категории ──────────────────────────────────────────────────────────
  app.get('/admin/v1/catalog/categories/:id', { schema: { tags: [TAG], summary: 'Категория', params: idParam, security: ADMIN } }, async (req, reply) => {
    const row = await db.category.findUnique({ where: { id: req.params.id }, include: { page: { select: { id: true, path: true, status: true, updatedAt: true } } } });
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return row;
  });

  app.post('/admin/v1/catalog/categories', { schema: { tags: [TAG], summary: 'Добавить категорию (и её страницу — черновиком)', body: categoryInput, security: ADMIN } }, async (req, reply) => {
    const input = req.body;
    const path = normalizePath(input.path);
    const created = await tx(async (t) => {
      await checkPath(t, path, '/products/');
      if (path.split('/').filter(Boolean).length !== 2) reject(400, 'bad_path', 'Адрес категории — /products/название/');
      const root = await t.page.findUniqueOrThrow({ where: { path: '/products/' }, select: { id: true, path: true, blocks: true, cssTemplates: true } });
      const sample = await t.page.findFirst({ where: { category: { kind: 'equipment' } }, select: { cssTemplates: true, blocks: true }, orderBy: { id: 'asc' } });
      // общие секции под товарами — как у большинства категорий
      const usual = await t.category.findFirst({ where: { kind: 'equipment' }, select: { productBlocks: true }, orderBy: { sort: 'asc' } });
      const crumb = orNull(input.crumb) ?? plainText(input.name);
      const blocks: Block[] = [
        { type: 'categoryHero', breadcrumbs: [...crumbsUnder(root), { label: crumb }], eyebrowTag: 'div', title: input.name, subtitle: '', actions: DEFAULT_ACTIONS },
        { type: 'catalogCards', source: 'subcategories', design: 'teaser', head: LIST_HEAD },
        // товары прямо в категории (без подкатегории) — сразу под подкатегориями
        { type: 'catalogCards', source: 'products', design: 'teaser' },
        { type: 'leadgen' },
        { type: 'whyUs', months: 18 },
        { type: 'bestOffer' },
      ];
      const page = await createPage(t, { path, template: 'section', name: input.name, blocks, sampleCss: sample?.cssTemplates ?? [] });
      return t.category.create({
        data: {
          pageId: page.id,
          name: input.name,
          crumb,
          cover: orNull(input.cover),
          coverAlt: input.coverAlt,
          onHome: input.onHome,
          sort: nextSort(await t.category.findMany({ select: { sort: true } })),
          productBlocks: json(input.productBlocks ?? usual?.productBlocks ?? [{ type: 'leadgen' }, { type: 'bestOffer' }]),
        },
        select: { id: true, pageId: true },
      });
    });
    await changed([path, '/']);
    return reply.code(201).send(created);
  });

  app.put('/admin/v1/catalog/categories/:id', { schema: { tags: [TAG], summary: 'Изменить категорию', params: idParam, body: categoryInput, security: ADMIN } }, async (req, reply) => {
    const input = req.body;
    const prev = await db.category.findUnique({ where: { id: req.params.id }, include: { page: { select: { path: true, status: true } }, _count: { select: { subcategories: true, products: true } } } });
    if (!prev) return reply.code(404).send({ error: 'not_found' });
    const path = normalizePath(input.path);
    const crumb = orNull(input.crumb) ?? plainText(input.name);
    const blocksChanged = input.productBlocks !== undefined && JSON.stringify(input.productBlocks) !== JSON.stringify(prev.productBlocks);
    if (blocksChanged) await storeScripts(db, input.productBlocks as Block[]);
    const before = await dependents(prev.pageId, { productBlocks: blocksChanged });
    await tx(async (t) => {
      if (path !== prev.page.path) {
        await checkPath(t, path, '/products/', prev.pageId);
        await movePage(t, prev.pageId, prev.page.path, path, prev._count.subcategories + prev._count.products > 0);
      }
      if (crumb !== prev.crumb) await renameCrumb(t, path, crumb);
      if (input.status && input.status !== prev.page.status) await t.page.update({ where: { id: prev.pageId }, data: { status: input.status } });
      await t.category.update({
        where: { id: prev.id },
        data: {
          name: input.name,
          crumb,
          cover: orNull(input.cover),
          coverAlt: input.coverAlt,
          onHome: input.onHome,
          ...(input.productBlocks !== undefined ? { productBlocks: json(input.productBlocks) } : {}),
        },
      });
    });
    const descendants = crumb !== prev.crumb ? (await db.page.findMany({ where: { path: { startsWith: path } }, select: { path: true } })).map((p) => p.path) : [];
    await changed([...new Set([prev.page.path, path, ...before, ...descendants])]);
    return { ok: true };
  });

  app.delete('/admin/v1/catalog/categories/:id', { schema: { tags: [TAG], summary: 'Удалить пустую категорию и её страницу', params: idParam, security: ADMIN } }, async (req, reply) => {
    const prev = await db.category.findUnique({ where: { id: req.params.id }, include: { page: { select: { path: true } }, _count: { select: { subcategories: true, products: true } } } });
    if (!prev) return reply.code(404).send({ error: 'not_found' });
    if (prev._count.subcategories + prev._count.products > 0) return reply.code(409).send({ error: 'not_empty', message: 'В категории есть подкатегории или товары — сначала удалите или перенесите их' });
    await tx((t) => deletePage(t, prev.pageId, prev.page.path, '/products/'));
    await changed([prev.page.path], 'page.deleted');
    await changed(['/']);
    return { ok: true };
  });

  // ── Подкатегории ───────────────────────────────────────────────────────
  app.get('/admin/v1/catalog/subcategories/:id', { schema: { tags: [TAG], summary: 'Подкатегория', params: idParam, security: ADMIN } }, async (req, reply) => {
    const row = await db.subcategory.findUnique({ where: { id: req.params.id }, include: { page: { select: { id: true, path: true, status: true, updatedAt: true } } } });
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return row;
  });

  app.post('/admin/v1/catalog/subcategories', { schema: { tags: [TAG], summary: 'Добавить подкатегорию (и её страницу — черновиком)', body: subcategoryInput, security: ADMIN } }, async (req, reply) => {
    const input = req.body;
    const path = normalizePath(input.path);
    const created = await tx(async (t) => {
      const category = await t.category.findUnique({ where: { id: input.categoryId }, include: { page: { select: { id: true, path: true, blocks: true, cssTemplates: true } } } });
      if (!category) return reject(400, 'bad_category', 'Категория не найдена');
      await checkPath(t, path, category.page.path);
      const sample = await t.page.findFirst({ where: { subcategory: { categoryId: category.id } }, select: { cssTemplates: true }, orderBy: { id: 'asc' } });
      const crumb = orNull(input.crumb) ?? plainText(input.name);
      const blocks: Block[] = [
        {
          type: 'categoryHero',
          breadcrumbs: [...crumbsUnder(category.page), { label: crumb }],
          eyebrow: category.crumb,
          eyebrowTag: 'div',
          title: input.name,
          subtitle: input.description,
          actions: DEFAULT_ACTIONS,
        },
        { type: 'catalogList', auto: true, head: LIST_HEAD, cards: [] },
        { type: 'leadgen' },
        { type: 'whyUs', months: 18 },
        { type: 'bestOffer' },
      ];
      const page = await createPage(t, { path, template: 'category', name: input.name, blocks, sampleCss: sample?.cssTemplates ?? category.page.cssTemplates });
      return t.subcategory.create({
        data: {
          pageId: page.id,
          categoryId: category.id,
          name: input.name,
          crumb,
          description: input.description,
          cover: orNull(input.cover),
          coverAlt: input.coverAlt,
          listed: input.listed,
          sort: nextSort(await t.subcategory.findMany({ where: { categoryId: category.id }, select: { sort: true } })),
        },
        select: { id: true, pageId: true },
      });
    });
    await changed([path, ...(await dependents(created.pageId))]);
    return reply.code(201).send(created);
  });

  app.put('/admin/v1/catalog/subcategories/:id', { schema: { tags: [TAG], summary: 'Изменить подкатегорию', params: idParam, body: subcategoryInput, security: ADMIN } }, async (req, reply) => {
    const input = req.body;
    const prev = await db.subcategory.findUnique({ where: { id: req.params.id }, include: { page: { select: { path: true, status: true } }, _count: { select: { products: true } } } });
    if (!prev) return reply.code(404).send({ error: 'not_found' });
    const path = normalizePath(input.path);
    const crumb = orNull(input.crumb) ?? plainText(input.name);
    const before = await dependents(prev.pageId);
    await tx(async (t) => {
      const category = await t.category.findUnique({ where: { id: input.categoryId }, include: { page: { select: { path: true } } } });
      if (!category) return reject(400, 'bad_category', 'Категория не найдена');
      if (path !== prev.page.path) {
        await checkPath(t, path, category.page.path, prev.pageId);
        await movePage(t, prev.pageId, prev.page.path, path, prev._count.products > 0);
      }
      if (crumb !== prev.crumb) await renameCrumb(t, path, crumb);
      if (input.status && input.status !== prev.page.status) await t.page.update({ where: { id: prev.pageId }, data: { status: input.status } });
      // подкатегория переехала в другую категорию — её товары вместе с ней
      if (category.id !== prev.categoryId) await t.product.updateMany({ where: { subcategoryId: prev.id }, data: { categoryId: category.id } });
      await t.subcategory.update({
        where: { id: prev.id },
        data: {
          categoryId: category.id,
          name: input.name,
          crumb,
          description: input.description,
          cover: orNull(input.cover),
          coverAlt: input.coverAlt,
          listed: input.listed,
        },
      });
    });
    const after = await dependents(prev.pageId);
    const descendants = crumb !== prev.crumb ? (await db.page.findMany({ where: { path: { startsWith: path } }, select: { path: true } })).map((p) => p.path) : [];
    await changed([...new Set([prev.page.path, path, ...before, ...after, ...descendants])]);
    return { ok: true };
  });

  app.delete('/admin/v1/catalog/subcategories/:id', { schema: { tags: [TAG], summary: 'Удалить пустую подкатегорию и её страницу', params: idParam, security: ADMIN } }, async (req, reply) => {
    const prev = await db.subcategory.findUnique({ where: { id: req.params.id }, include: { page: { select: { path: true } }, category: { include: { page: { select: { path: true } } } }, _count: { select: { products: true } } } });
    if (!prev) return reply.code(404).send({ error: 'not_found' });
    if (prev._count.products > 0) return reply.code(409).send({ error: 'not_empty', message: 'В подкатегории есть товары — сначала удалите или перенесите их' });
    await tx((t) => deletePage(t, prev.pageId, prev.page.path, prev.category.page.path));
    await changed([prev.page.path], 'page.deleted');
    await changed([prev.category.page.path]);
    return { ok: true };
  });

  // ── Товары ─────────────────────────────────────────────────────────────
  app.get('/admin/v1/catalog/products/:id', { schema: { tags: [TAG], summary: 'Товар: карточка в каталоге', params: idParam, security: ADMIN } }, async (req, reply) => {
    const row = await db.product.findUnique({ where: { id: req.params.id }, include: { page: { select: { id: true, path: true, status: true, updatedAt: true } } } });
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return row;
  });

  /** Категория и подкатегория товара: подкатегория должна быть из этой категории. */
  const placeOf = async (t: Tx, categoryId: number, subcategoryId: number | null) => {
    const category = await t.category.findUnique({ where: { id: categoryId }, include: { page: { select: { id: true, path: true, blocks: true, cssTemplates: true } } } });
    if (!category) return reject(400, 'bad_category', 'Категория не найдена');
    const sub = subcategoryId
      ? await t.subcategory.findUnique({ where: { id: subcategoryId }, include: { page: { select: { id: true, path: true, blocks: true, cssTemplates: true } } } })
      : null;
    if (subcategoryId && (!sub || sub.categoryId !== category.id)) reject(400, 'bad_subcategory', 'Подкатегория не из выбранной категории');
    return { category, sub, parent: sub?.page ?? category.page };
  };

  app.post('/admin/v1/catalog/products', { schema: { tags: [TAG], summary: 'Добавить товар (и его страницу — черновиком)', body: productInput, security: ADMIN } }, async (req, reply) => {
    const input = req.body;
    const path = normalizePath(input.path);
    if (!orNull(input.cover)) return reply.code(400).send({ error: 'no_cover', message: 'Выберите обложку товара — она же главное фото на его странице' });
    const created = await tx(async (t) => {
      const { category, sub, parent } = await placeOf(t, input.categoryId, input.subcategoryId);
      await checkPath(t, path, parent.path);
      // образец — соседний товар (кнопки, факты о доставке и гарантии, стили страницы)
      const sample = await t.page.findFirst({
        where: { product: sub ? { subcategoryId: sub.id } : { categoryId: category.id } },
        select: { blocks: true, cssTemplates: true },
        orderBy: { id: 'asc' },
      });
      const fallback = sample ?? (await t.page.findFirst({ where: { template: 'product', product: { isNot: null } }, select: { blocks: true, cssTemplates: true }, orderBy: { id: 'asc' } }));
      const sampleHero = fallback ? (fallback.blocks as Block[]).find((b): b is Extract<Block, { type: 'productHero' }> => b.type === 'productHero') : undefined;
      const neighbour = await t.product.findFirst({ where: sub ? { subcategoryId: sub.id } : { categoryId: category.id, subcategoryId: null }, select: { warranty: true }, orderBy: { sort: 'asc' } });
      const crumb = plainText(input.name);
      const blocks: Block[] = [
        {
          type: 'productHero',
          breadcrumbs: [...crumbsUnder(parent), { label: crumb }],
          media: { photos: [{ src: input.cover!, alt: input.coverAlt || crumb }], thumbs: 'grid', zoom: true },
          ...(sampleHero?.origin ? { origin: sampleHero.origin } : {}),
          title: input.name,
          ...(sampleHero?.status ? { status: sampleHero.status } : {}),
          price: sampleHero?.price ?? 'Цена — по&nbsp;запросу',
          keyspecs: input.specs.slice(0, 4).map((s) => ({ num: s.value, label: s.label })),
          actions: sampleHero?.actions ?? [{ href: '#leadgen', label: 'Запросить цену', className: 'btn btn--primary js-quote-btn', arrow: true }],
          facts: sampleHero?.facts ?? [],
        },
        {
          type: 'productSpec',
          ariaLabel: 'Характеристики и описание',
          navAriaLabel: 'Разделы технической документации',
          navEyebrow: 'Содержание',
          nav: [
            { href: '#spec-0-opisanie', label: 'Описание' },
            { href: '#spec-1-tehnicheskie-harakteristiki', label: 'Технические характеристики' },
          ],
          panels: [
            { id: 'spec-0-opisanie', title: 'Описание', content: [{ kind: 'html', html: `<p>${input.name}</p>` }] },
            { id: 'spec-1-tehnicheskie-harakteristiki', title: 'Технические характеристики', content: [{ kind: 'table', rows: input.specs }] },
          ],
        },
        { type: 'lightbox', label: `Галерея фото ${crumb}`, total: 1 },
      ];
      const page = await createPage(t, { path, template: 'product', name: input.name, blocks, sampleCss: fallback?.cssTemplates ?? [] });
      const siblings = await t.product.findMany({ where: { categoryId: category.id, subcategoryId: sub?.id ?? null }, select: { sort: true } });
      return t.product.create({
        data: {
          pageId: page.id,
          categoryId: category.id,
          subcategoryId: sub?.id ?? null,
          name: input.name,
          nameNote: orNull(input.nameNote),
          cover: orNull(input.cover),
          coverAlt: input.coverAlt,
          badge: orNull(input.badge),
          origin: orNull(input.origin),
          caption: orNull(input.caption),
          label: orNull(input.label),
          linkText: orNull(input.linkText),
          warranty: input.warranty === undefined ? (neighbour?.warranty ?? null) : orNull(input.warranty),
          specs: json(input.specs),
          actions: json(
            input.actions ?? [
              { href: '#leadgen', label: 'Запросить цену', className: 'btn btn--primary btn--block js-quote-btn', arrow: true },
              { href: path, label: 'Подробнее о позиции', className: 'pcard__more', arrow: true },
            ],
          ),
          attrs: json(input.attrs ?? {}),
          listed: input.listed,
          sort: nextSort(siblings),
        },
        select: { id: true, pageId: true },
      });
    });
    await changed([path, ...(await dependents(created.pageId))]);
    return reply.code(201).send(created);
  });

  app.put('/admin/v1/catalog/products/:id', { schema: { tags: [TAG], summary: 'Изменить карточку товара', params: idParam, body: productInput, security: ADMIN } }, async (req, reply) => {
    const input = req.body;
    const prev = await db.product.findUnique({ where: { id: req.params.id }, include: { page: { select: { path: true, status: true } } } });
    if (!prev) return reply.code(404).send({ error: 'not_found' });
    const path = normalizePath(input.path);
    const before = await dependents(prev.pageId);
    await tx(async (t) => {
      const { category, sub, parent } = await placeOf(t, input.categoryId, input.subcategoryId);
      if (path !== prev.page.path) {
        await checkPath(t, path, parent.path, prev.pageId);
        await movePage(t, prev.pageId, prev.page.path, path, false);
      }
      if (input.status && input.status !== prev.page.status) await t.page.update({ where: { id: prev.pageId }, data: { status: input.status } });
      const moved = category.id !== prev.categoryId || (sub?.id ?? null) !== prev.subcategoryId;
      await t.product.update({
        where: { id: prev.id },
        data: {
          categoryId: category.id,
          subcategoryId: sub?.id ?? null,
          name: input.name,
          nameNote: orNull(input.nameNote),
          cover: orNull(input.cover),
          coverAlt: input.coverAlt,
          badge: orNull(input.badge),
          origin: orNull(input.origin),
          caption: orNull(input.caption),
          label: orNull(input.label),
          linkText: orNull(input.linkText),
          ...(input.warranty !== undefined ? { warranty: orNull(input.warranty) } : {}),
          specs: json(input.specs),
          ...(input.actions ? { actions: json(input.actions) } : {}),
          ...(input.attrs ? { attrs: json(input.attrs) } : {}),
          listed: input.listed,
          // в новом списке — последним
          ...(moved ? { sort: nextSort(await t.product.findMany({ where: { categoryId: category.id, subcategoryId: sub?.id ?? null }, select: { sort: true } })) } : {}),
        },
      });
    });
    const after = await dependents(prev.pageId);
    await changed([...new Set([prev.page.path, path, ...before, ...after])]);
    return { ok: true };
  });

  app.delete('/admin/v1/catalog/products/:id', { schema: { tags: [TAG], summary: 'Удалить товар и его страницу', params: idParam, security: ADMIN } }, async (req, reply) => {
    const prev = await db.product.findUnique({ where: { id: req.params.id }, include: { page: { select: { path: true } } } });
    if (!prev) return reply.code(404).send({ error: 'not_found' });
    const listing = await dependents(prev.pageId);
    await tx((t) => deletePage(t, prev.pageId, prev.page.path, listing[0] ?? '/products/'));
    await changed([prev.page.path], 'page.deleted');
    await changed(listing);
    return { ok: true };
  });

  // ── Порядок ────────────────────────────────────────────────────────────
  app.post('/admin/v1/catalog/reorder', { schema: { tags: [TAG], summary: 'Порядок карточек: записи в новом порядке', body: reorderInput, security: ADMIN } }, async (req) => {
    const { kind, ids } = req.body;
    const model = { categories: db.category, subcategories: db.subcategory, products: db.product }[kind] as unknown as {
      findMany: (a: unknown) => Promise<{ id: number; pageId: number }[]>;
      update: (a: unknown) => Prisma.PrismaPromise<unknown>;
    };
    const rows = await model.findMany({ where: { id: { in: ids } }, select: { id: true, pageId: true } });
    await db.$transaction(ids.map((id, sort) => model.update({ where: { id }, data: { sort } })));
    const data = await loadCatalog(db);
    const paths = new Set(rows.flatMap((r) => catalogDependents(data, r.pageId)));
    await changed([...paths]);
    return { ok: true };
  });

  void store;
}
