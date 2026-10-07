/**
 * Перенос каталога в данные. Из страниц /products/… собираются категории
 * (разделы на главной), подкатегории («Модельный ряд» раздела) и товары;
 * сетки карточек на страницах становятся блоками, которые выводят карточки
 * из этих данных, а общие секции под товарами (формы, преимущества,
 * партнёры) — шаблоном категории: одна копия вместо сотен.
 *
 * Каждая замена проверяется рендером: страница после переноса выводится
 * тем же HTML, что и до (те же компоненты, тот же контекст). Не совпало —
 * блок остаётся как был, причина — в отчёте.
 *
 *   npm run catalog:migrate -- --dry-run            — только отчёт
 *   npm run catalog:migrate                         — перенос; прежние блоки страниц — в копию (--backup=<файл>)
 *   npm run catalog:migrate -- --restore=<файл>     — откат: блоки страниц из копии, каталог очищается
 *   --report=<файл> — отчёт в JSON; --content=http://127.0.0.1:4101 — откуда взять склад для рендера
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseFragment } from 'parse5';
import { z } from 'zod';
import { createDb, Prisma } from '@mtpk/db';
import { envParts, readEnv } from '@mtpk/shared';
import { canonHtml, firstDifference } from '@mtpk/content-kit/canon';
import {
  resolveCatalogBlocks,
  type CatalogCategory,
  type CatalogData,
  type CatalogProduct,
  type CatalogSubcategory,
} from '@mtpk/content-kit/catalog';
import type { Block, CatalogCardItem, CatalogCardsBlock, CatalogFilter, CatalogListBlock, ProductCard, SectionHead } from '@mtpk/content-model';
import { buildRenderContext, type RenderContext } from '@mtpk/ui';
import { renderBlockToHtml } from '@mtpk/ui/server';
import { attr, classList, inner, isEl, kids, Mismatch, outer, restAttrs, type El, type Node } from '../tools/importer/src/blocks/dom.ts';
import { parseCard, parseImage, parseSectionHead } from '../tools/importer/src/blocks/parsers.ts';
import { catalogNodes, plainText } from '../services/content/src/catalog.ts';

const env = readEnv(z.object({ ...envParts.db, CONTENT_URL: z.string().default('http://127.0.0.1:4101') }));
const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : 'true'] as const;
  }),
);
const DRY = args.has('dry-run');
const { db, close } = createDb(env.DATABASE_URL, { max: 4, appName: 'migrate-catalog' });

// ── Откат ──────────────────────────────────────────────────────────────────
interface Backup {
  createdAt: string;
  pages: { id: number; path: string; blocks: unknown; extraMeta: unknown }[];
}

if (args.has('restore')) {
  const backup = JSON.parse(fs.readFileSync(args.get('restore')!, 'utf8')) as Backup;
  await db.$transaction(async (tx) => {
    await tx.product.deleteMany();
    await tx.subcategory.deleteMany();
    await tx.category.deleteMany();
    for (const p of backup.pages) {
      await tx.page.update({
        where: { id: p.id },
        data: { blocks: p.blocks as Prisma.InputJsonValue, extraMeta: p.extraMeta as Prisma.InputJsonValue },
      });
    }
  });
  console.log(`откат: каталог очищен, блоки ${backup.pages.length} страниц восстановлены из копии ${backup.createdAt}`);
  console.log('сбросьте кеш контента: POST /admin/v1/cache/purge (или перезапуск сервиса)');
  await close();
  process.exit(0);
}

const already = (await db.category.count()) + (await db.subcategory.count()) + (await db.product.count());
if (already && !DRY) {
  console.error('каталог уже заполнен — перенос выполнялся. Откат: --restore=<копия>');
  await close();
  process.exit(1);
}

// ── Исходные данные ────────────────────────────────────────────────────────
type PageRow = { id: number; path: string; template: string; status: string; blocks: Block[]; extraMeta: Record<string, unknown> };
const pages: PageRow[] = (
  await db.page.findMany({
    where: { kind: 'page' },
    select: { id: true, path: true, template: true, status: true, blocks: true, extraMeta: true },
    orderBy: { path: 'asc' },
  })
).map((p) => ({ ...p, blocks: p.blocks as Block[], extraMeta: (p.extraMeta ?? {}) as Record<string, unknown> }));
const byPath = new Map(pages.map((p) => [p.path, p]));
const nodes = new Map((await catalogNodes(db)).map((n) => [n.path, n]));

/** Склад и разделы со сравнением — для рендера как на сайте (нет сервиса — без них, одинаково до и после). */
let site: { stock: RenderContext['stock']; compareSections: string[] } = { stock: {}, compareSections: [] };
try {
  const res = await fetch(`${args.get('content') ?? env.CONTENT_URL}/v1/site-data`, { signal: AbortSignal.timeout(10_000) });
  if (res.ok) site = (await res.json()) as typeof site;
} catch {
  console.warn('контент-сервис недоступен — рендер без склада и сравнения');
}

const isEquipment = (p: string) => p.startsWith('/products/') && !p.startsWith('/products/zapchasti/');
const depth = (p: string) => p.split('/').filter(Boolean).length;
/** Раздел (категория) адреса: /products/<раздел>/ */
const sectionOf = (p: string) => `/${p.split('/').filter(Boolean).slice(0, 2).join('/')}/`;
const parentOf = (p: string) => p.replace(/[^/]+\/$/, '');
const resolveHref = (href: string, page: string) => new URL(href, `http://x${page}`).pathname;

// ── Сетки карточек на страницах ─────────────────────────────────────────────
type Design = CatalogCardsBlock['design'] | 'pcard';
interface Card {
  /** адрес страницы, куда ведёт карточка */
  target: string;
  item: CatalogCardItem;
  pcard?: ProductCard;
}
interface Grid {
  page: PageRow;
  /** путь к блоку: индексы в blocks / children контейнеров */
  loc: number[];
  design: Design;
  /** catalogList из данных (а не HTML) */
  typed: boolean;
  cards: Card[];
  head?: SectionHead;
  attrs?: Record<string, string>;
  after?: string;
  /** для товарных карточек: блок списка (фильтр, атрибуты сетки) */
  list?: CatalogListBlock;
}

const descendants = (el: El): El[] => (el.childNodes as Node[]).filter(isEl).flatMap((c) => [c, ...descendants(c)]);
const byClass = (el: El, cls: string) => descendants(el).find((d) => classList(d).includes(cls));
const need = <T,>(x: T | undefined, what: string): T => {
  if (x === undefined) throw new Mismatch(`нет ${what}`);
  return x;
};

function coverItem(a: El, title: El, extra: Partial<CatalogCardItem> = {}): CatalogCardItem {
  const img = descendants(a).find((d) => d.tagName === 'img');
  const image = img ? parseImage(img) : undefined;
  return {
    href: need(attr(a, 'href'), 'ссылки'),
    title: inner(title),
    ...(image ? { image: image.src, alt: image.alt, ...(image.attrs ? { imageAttrs: image.attrs } : {}) } : { alt: '' }),
    ...extra,
  };
}

/** Карточка товара; текст после ссылки в заголовке («(на гидравлике)») — примечание к названию. */
function parsePcard(article: El): ProductCard {
  const h3 = byClass(article, 'pcard__title');
  let note: string | undefined;
  if (h3) {
    const texts = (h3.childNodes as Node[]).filter((n) => n.nodeName === '#text' && (n as unknown as { value: string }).value.trim());
    if (texts.length === 1 && h3.childNodes.indexOf(texts[0] as never) === h3.childNodes.length - 1) {
      note = (texts[0] as unknown as { value: string }).value.trim();
      h3.childNodes = h3.childNodes.filter((n) => n !== texts[0]);
    }
  }
  const card = parseCard(article);
  return note ? { ...card, titleNote: note } : card;
}

/** Надпись ссылки карточки — только если она не та, что компонент выводит по умолчанию. */
function linkText(a: El, cls: string, fallback: string): Partial<CatalogCardItem> {
  const el = byClass(a, cls);
  if (!el) return {};
  const text = inner(el).replace(/\s*<span class="btn__arrow">→<\/span>$/, '');
  return text === fallback ? {} : { linkText: text };
}

/**
 * Список товаров в «HTML как есть» (печи, чиллеры): заголовок, фильтр со
 * счётчиком моделей, сетка карточек. Фильтр разбирается мягче, чем при
 * импорте: начальная надпись на кнопке и счётчик всё равно переписывает скрипт.
 */
function parsePcardSection(root: El): CatalogListBlock {
  const [container, ...r0] = kids(root);
  if (r0.length || !container || !classList(container).includes('container')) throw new Mismatch('список: нет .container');
  const k = kids(container).filter((e) => e.tagName !== 'script');
  let i = 0;
  const block: CatalogListBlock = { type: 'catalogList', cards: [], attrs: restAttrs(root) };
  if (k[i] && classList(k[i]).includes('s-head')) block.head = parseSectionHead(k[i++]);
  if (k[i]?.tagName === 'form') block.filter = parseFilter(k[i++]);
  const grid = k[i++];
  if (!grid || !classList(grid).includes('pcard-grid')) throw new Mismatch('список: нет .pcard-grid');
  block.gridAttrs = restAttrs(grid);
  block.cards = kids(grid).map(parsePcard);
  if (k[i]) throw new Mismatch('список: после сетки ещё элементы');
  return block;
}

function parseFilter(form: El): CatalogFilter {
  const dropdowns = kids(form)
    .filter((d) => classList(d).includes('cf-dropdown'))
    .map((d) => {
      const lbl = need(byClass(d, 'cf-trigger__label'), '.cf-trigger__label');
      const panel = need(byClass(d, 'cf-panel'), '.cf-panel');
      const options = kids(panel).map((o) => {
        const [t, meta] = kids(o);
        return { value: attr(o, 'data-value') ?? '', label: attr(o, 'data-label') ?? '', text: inner(need(t, 'пункта')), meta: meta ? inner(meta) : undefined };
      });
      const [any, ...rest] = options;
      if (!any || any.value !== '') throw new Mismatch('фильтр: первый пункт не «любой»');
      return { key: attr(d, 'data-cf-key') ?? '', label: inner(lbl), panelLabel: attr(panel, 'aria-label') ?? '', anyText: any.text, anyLabel: any.label, options: rest };
    });
  const count = kids(form).some((e) => classList(e).includes('catalog-filter__count'));
  return { ariaLabel: attr(form, 'aria-label') ?? 'Фильтр каталога', ...(count ? { count: true } : {}), dropdowns };
}

/** Секция с сеткой: заголовок, сетка, текст после неё — внутри .container. */
function sectionParts(root: El, gridClass: string) {
  const [container, ...rest] = kids(root);
  if (rest.length || !container || !classList(container).includes('container')) throw new Mismatch('секция без единственного .container');
  const k = kids(container);
  const at = k.findIndex((e) => classList(e).includes(gridClass));
  if (at < 0) throw new Mismatch(`нет .${gridClass}`);
  const afterEls = k.slice(at + 1);
  return { before: k.slice(0, at), grid: k[at], after: afterEls.length ? afterEls.map(outer).join('\n') : undefined };
}

/** Разбор блока «HTML как есть» с сеткой карточек; null — сетки нет. */
function parseHtmlGrid(html: string): Omit<Grid, 'page' | 'loc' | 'typed'> | null {
  const root = (parseFragment(html).childNodes as Node[]).find(isEl);
  if (!root || root.tagName !== 'section') return null;
  const cls = classList(root);
  const attrs = restAttrs(root);
  if (cls.includes('catalog') && byClass(root, 'catalog__grid')) {
    const { before, grid, after } = sectionParts(root, 'catalog__grid');
    if (before.length !== 1 || !classList(before[0]).includes('catalog__head')) throw new Mismatch('главная: заголовок сетки');
    const title = need(byClass(before[0], 'catalog__title'), '.catalog__title');
    const cards = kids(grid).map((a) => {
      const item = coverItem(a, need(byClass(a, 'cat-card__title'), '.cat-card__title'), linkText(a, 'cat-card__link', 'Перейти в&nbsp;каталог'));
      return { target: '', item };
    });
    return { design: 'home', cards, head: { title: inner(title) }, attrs, after };
  }
  const head = (before: El[]) => {
    if (before.length > 1) throw new Mismatch('перед сеткой больше одного элемента');
    return before[0] ? parseSectionHead(before[0]) : undefined;
  };
  if (cls.includes('catalog-list') && byClass(root, 'teaser-grid')) {
    const { before, grid, after } = sectionParts(root, 'teaser-grid');
    const cards = kids(grid).map((a) => {
      const caption = byClass(a, 'teaser-card__caption');
      const extra = { ...(caption ? { caption: inner(caption) } : {}), ...linkText(a, 'teaser-card__more', 'Подробнее') };
      return { target: '', item: coverItem(a, need(byClass(a, 'teaser-card__title'), '.teaser-card__title'), extra) };
    });
    return { design: 'teaser', cards, head: head(before), attrs, after };
  }
  for (const prefix of ['catalog-lvm', 'catalog-lgm'] as const) {
    if (!cls.includes(prefix) || !byClass(root, `${prefix}__grid`)) continue;
    const { before, grid, after } = sectionParts(root, `${prefix}__grid`);
    const cards = kids(grid).map((a) => {
      const label = byClass(a, `${prefix}-card__category`);
      const extra = { ...(label ? { label: inner(label) } : {}), ...linkText(a, `${prefix}-card__action`, 'Подробнее') };
      return { target: '', item: coverItem(a, need(byClass(a, `${prefix}-card__title`), `.${prefix}-card__title`), extra) };
    });
    return { design: prefix === 'catalog-lvm' ? 'lvm' : 'lgm', cards, head: head(before), attrs, after };
  }
  if (cls.includes('catalog-list') && byClass(root, 'pcard-grid')) {
    const list = parsePcardSection(root);
    return { design: 'pcard', cards: list.cards.map((c) => ({ target: '', item: { href: c.href, title: c.title, alt: '' }, pcard: c })), list };
  }
  return null;
}

const grids: Grid[] = [];
const gridErrors: { page: string; loc: string; error: string }[] = [];
for (const page of pages) {
  if (page.path !== '/' && !isEquipment(page.path)) continue;
  const walk = (blocks: Block[], loc: number[]) =>
    blocks.forEach((b, i) => {
      const at = [...loc, i];
      if (b.type === 'container') return walk(b.children, at);
      let g: Omit<Grid, 'page' | 'loc' | 'typed'> | null = null;
      if (b.type === 'catalogList') {
        g = { design: 'pcard', cards: b.cards.map((c) => ({ target: '', item: { href: c.href, title: c.title, alt: '' }, pcard: c })), list: b };
      } else if (b.type === 'html') {
        try {
          g = parseHtmlGrid(b.html);
        } catch (err) {
          if (!(err instanceof Mismatch)) throw err;
          // секция похожа на сетку, но разобрать не вышло
          if (/class="(cat-card|teaser-card|catalog-lvm-card|catalog-lgm-card|pcard)[" ]/.test(b.html)) {
            gridErrors.push({ page: page.path, loc: at.join('.'), error: err.message });
          }
        }
      }
      if (!g) return;
      for (const c of g.cards) c.target = resolveHref(c.item.href, page.path);
      grids.push({ ...g, page, loc: at, typed: b.type === 'catalogList' });
    });
  walk(page.blocks, []);
}

// ── Категории, подкатегории, товары ───────────────────────────────────────
const categories: CatalogCategory[] = [];
const subcategories: CatalogSubcategory[] = [];
const products: CatalogProduct[] = [];
const notes: string[] = [];

const short = (p: string) => nodes.get(p)?.short ?? p;
const heroImage = (p: string) => nodes.get(p)?.image ?? null;
const unquote = (s: string) => s.replace(/^url\((['"]?)(.*)\1\)$/, '$2');

// Категории: разделы /products/<раздел>/ в порядке сетки «Оборудование» на главной
const homeGrid = grids.find((g) => g.page.path === '/' && g.design === 'home');
const sections = pages.filter((p) => p.template === 'section' && p.path.startsWith('/products/') && depth(p.path) === 2);
for (const p of sections) {
  const onHome = homeGrid?.cards.findIndex((c) => c.target === p.path) ?? -1;
  const card = onHome >= 0 ? homeGrid!.cards[onHome].item : undefined;
  categories.push({
    id: categories.length + 1,
    pageId: p.id,
    path: p.path,
    status: p.status,
    name: card?.title ?? short(p.path),
    crumb: short(p.path),
    cover: card?.image ?? (heroImage(p.path) ? unquote(heroImage(p.path)!) : null),
    coverAlt: card?.alt ?? '',
    coverAttrs: card?.imageAttrs ?? {},
    sort: onHome >= 0 ? onHome : 100 + categories.length,
    onHome: onHome >= 0,
    kind: p.path === '/products/zapchasti/' ? 'hub' : 'equipment',
    productBlocks: [],
  });
}
const categoryOf = (p: string) => categories.find((c) => c.path === sectionOf(p));

// Подкатегории: карточки страниц-категорий в сетках своего раздела
for (const g of grids) {
  const cat = categories.find((c) => c.pageId === g.page.id);
  if (!cat || cat.kind !== 'equipment' || g.design === 'pcard') continue;
  g.cards.forEach((c, i) => {
    const t = byPath.get(c.target);
    if (!t || t.template !== 'category' || sectionOf(t.path) !== cat.path) return;
    if (subcategories.some((s) => s.pageId === t.id)) return notes.push(`подкатегория ${t.path} — в нескольких сетках`);
    subcategories.push({
      id: subcategories.length + 1,
      pageId: t.id,
      categoryId: cat.id,
      path: t.path,
      status: t.status,
      name: c.item.title,
      crumb: short(t.path),
      description: c.item.caption ?? '',
      cover: c.item.image ?? null,
      coverAlt: c.item.alt,
      coverAttrs: c.item.imageAttrs ?? {},
      sort: i,
      listed: true,
    });
  });
}

// Товары: первая сетка, где есть карточка товара, задаёт его место и карточку
const productPages = pages.filter((p) => p.template === 'product' && isEquipment(p.path));
const placement = new Map<string, { grid: Grid; card: Card; index: number }>();
for (const g of grids) {
  g.cards.forEach((c, index) => {
    if (byPath.get(c.target)?.template !== 'product') return;
    if (placement.has(c.target)) {
      const first = placement.get(c.target)!;
      if (first.grid !== g) notes.push(`товар ${c.target} — в сетках ${first.grid.page.path} и ${g.page.path}`);
      return;
    }
    placement.set(c.target, { grid: g, card: c, index });
  });
}
// подкатегории без карточки в сетке раздела, но с товарами (АВН 1–20 кГц): в «Модельном ряду» не показываются
for (const p of productPages) {
  if (placement.has(p.path)) continue;
  const parent = byPath.get(parentOf(p.path));
  if (!parent || parent.template !== 'category' || subcategories.some((s) => s.pageId === parent.id)) continue;
  const cat = categoryOf(parent.path);
  if (!cat) continue;
  subcategories.push({
    id: subcategories.length + 1,
    pageId: parent.id,
    categoryId: cat.id,
    path: parent.path,
    status: parent.status,
    name: short(parent.path),
    crumb: short(parent.path),
    description: '',
    cover: heroImage(parent.path),
    coverAlt: '',
    coverAttrs: {},
    sort: 1000 + subcategories.length,
    listed: false,
  });
}

const firstPhoto = (p: PageRow) => {
  const hero = p.blocks.find((b): b is Extract<Block, { type: 'productHero' }> => b.type === 'productHero');
  const photo = hero?.media.photos[0];
  return photo ? { src: photo.src, alt: photo.alt ?? '' } : null;
};

for (const p of productPages) {
  const cat = categoryOf(p.path);
  if (!cat) {
    notes.push(`товар ${p.path} — нет категории`);
    continue;
  }
  const place = placement.get(p.path);
  const listing = place ? place.grid.page : byPath.get(parentOf(p.path));
  const sub = listing ? subcategories.find((s) => s.pageId === listing.id) : undefined;
  const base = { id: products.length + 1, pageId: p.id, categoryId: cat.id, subcategoryId: sub?.id ?? null, path: p.path, status: p.status };
  if (place?.card.pcard) {
    const c = place.card.pcard;
    products.push({
      ...base,
      name: c.title,
      nameNote: c.titleNote ?? null,
      cover: c.image.src,
      coverAlt: c.image.alt,
      coverAttrs: c.image.attrs ?? {},
      badge: c.badge ?? null,
      origin: c.origin ?? null,
      caption: c.caption ?? null,
      label: null,
      linkText: null,
      warranty: null,
      specs: c.specs,
      actions: c.actions,
      attrs: c.attrs ?? {},
      sort: place.index,
      listed: true,
    });
  } else if (place) {
    const it = place.card.item;
    products.push({
      ...base,
      name: it.title,
      nameNote: null,
      cover: it.image ?? null,
      coverAlt: it.alt,
      coverAttrs: it.imageAttrs ?? {},
      badge: null,
      origin: null,
      caption: it.caption ?? null,
      label: it.label ?? null,
      linkText: it.linkText ?? null,
      warranty: null,
      specs: [],
      actions: [],
      attrs: {},
      sort: place.index,
      listed: true,
    });
  } else {
    const photo = firstPhoto(p);
    products.push({
      ...base,
      name: short(p.path),
      nameNote: null,
      cover: photo?.src ?? null,
      coverAlt: photo?.alt ?? '',
      coverAttrs: {},
      badge: null,
      origin: null,
      caption: null,
      label: null,
      linkText: null,
      warranty: null,
      specs: [],
      actions: [],
      attrs: {},
      sort: 1000 + products.length,
      listed: false,
    });
  }
}

// ── Шаблон товара категории: общие секции в конце страниц товаров ─────────
/** Секции страницы товара, которые не бывают общими: своё содержимое товара. */
const OWN = new Set(['productHero', 'productSpec', 'lightbox', 'style']);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const core = (blocks: Block[]) => (blocks.at(-1)?.type === 'lightbox' ? blocks.slice(0, -1) : blocks);
/** Срок гарантии в «Преимуществах» — свойство товара (Product.warranty), в шаблоне категории его нет. */
const general = (b: Block): Block => (b.type === 'adv' ? { type: 'adv' } : b);
const alike = (a: Block, b: Block) => same(general(a), general(b));

const templateReport: { category: string; template: string[]; products: number; variants: { tail: string; count: number }[] }[] = [];
for (const cat of categories) {
  const list = products.filter((p) => p.categoryId === cat.id).map((p) => byPath.get(p.path)!);
  if (!list.length) continue;
  // общий хвост всех товаров категории (одинаковые блоки подряд до просмотра фото)
  let tail = core(list[0].blocks).slice();
  for (const p of list.slice(1)) {
    const c = core(p.blocks);
    let n = 0;
    while (n < tail.length && n < c.length && alike(tail[tail.length - 1 - n], c[c.length - 1 - n])) n++;
    tail = tail.slice(tail.length - n);
  }
  // своё содержимое товара (герой, характеристики) в шаблон не берём
  const firstOwn = tail.findLastIndex((b) => OWN.has(b.type));
  if (firstOwn >= 0) tail = tail.slice(firstOwn + 1);
  cat.productBlocks = tail.map(general);
  const variants = new Map<string, number>();
  for (const p of list) {
    const c = core(p.blocks);
    const key = c
      .slice(Math.max(0, c.findLastIndex((b) => OWN.has(b.type)) + 1))
      .map((b) => (b.type === 'html' ? `html:${b.html.match(/class="([^" ]+)/)?.[1] ?? '?'}` : b.type))
      .join(' ');
    variants.set(key, (variants.get(key) ?? 0) + 1);
  }
  templateReport.push({
    category: cat.path,
    template: tail.map((b) => b.type),
    products: list.length,
    variants: [...variants].map(([t, count]) => ({ tail: t, count })),
  });
}

// ── Новые блоки страниц ───────────────────────────────────────────────────
const data: CatalogData = { categories, subcategories, products };
const pageEntity = (id: number) =>
  categories.find((c) => c.pageId === id) ?? subcategories.find((s) => s.pageId === id) ?? products.find((p) => p.pageId === id);

/** Замена сетки блоком из каталога; null — сетка остаётся как есть (причина — в отчёте). */
function convertGrid(g: Grid): { block: Block; lenient: boolean } | { reason: string } {
  const own = pageEntity(g.page.id);
  if (g.page.path === '/') {
    if (g.design !== 'home') return { reason: 'не сетка разделов' };
    const extra = g.cards.slice(categories.filter((c) => c.onHome).length);
    if (extra.length) return { reason: 'на главной карточки не только разделов' };
    return { block: { type: 'catalogCards', source: 'categories', design: 'home', head: g.head, attrs: g.attrs, ...(g.after ? { after: g.after } : {}) }, lenient: false };
  }
  if (!own) return { reason: 'страница не категория и не подкатегория' };
  if ('kind' in own && own.kind !== 'equipment') return { reason: 'раздел запчастей — следующим этапом' };
  // карточки из каталога идут первыми, за ними — ссылки на другие разделы
  const kindOf = (c: Card) => {
    const t = byPath.get(c.target);
    if (t && subcategories.some((s) => s.pageId === t.id && s.listed)) return 'subcategory';
    if (t && products.some((p) => p.pageId === t.id && p.listed)) return 'product';
    return 'other';
  };
  const kinds = g.cards.map(kindOf);
  const n = kinds.findIndex((k) => k === 'other');
  const head = n < 0 ? kinds : kinds.slice(0, n);
  if (n >= 0 && kinds.slice(n).some((k) => k !== 'other')) return { reason: 'ссылки на другие разделы — посреди карточек' };
  if (new Set(head).size > 1) return { reason: 'в сетке и подкатегории, и товары' };
  const extra = n < 0 ? [] : g.cards.slice(n).map((c) => c.item);
  const source = head[0] === 'subcategory' ? 'subcategories' : 'products';
  if (g.design === 'pcard') {
    if (extra.length) return { reason: 'в списке товаров — чужие карточки' };
    if (new Set(g.cards.map((c) => c.target)).size !== g.cards.length) return { reason: 'товар в списке дважды (несколько исполнений)' };
    const { cards: _cards, ...rest } = g.list!;
    return { block: { ...rest, auto: true, cards: [] }, lenient: !g.typed };
  }
  if (source === 'products' && new Set(g.cards.map((c) => c.target)).size !== g.cards.length) return { reason: 'товар в сетке дважды' };
  const block: CatalogCardsBlock = {
    type: 'catalogCards',
    source,
    design: g.design,
    ...(g.head ? { head: g.head } : {}),
    ...(g.attrs ? { attrs: g.attrs } : {}),
    ...(g.after ? { after: g.after } : {}),
    ...(extra.length ? { extra } : {}),
  };
  return { block, lenient: false };
}

const setAt = (blocks: Block[], loc: number[], value: Block): Block[] =>
  blocks.map((b, i) => {
    if (i !== loc[0]) return b;
    if (loc.length === 1) return value;
    if (b.type !== 'container') throw new Error('путь к блоку не через контейнер');
    return { ...b, children: setAt(b.children, loc.slice(1), value) };
  });

const absolutize = (html: string, page: string) =>
  html.replace(/\shref="([^"#/][^"]*)"/g, (m, h: string) => (/^[a-z]+:/i.test(h) ? m : ` href="${resolveHref(h, page)}"`));

/** HTML блоков страницы по одному, с контекстом рендера всей страницы (как на сайте). */
function renderEach(page: PageRow, blocks: Block[], resolved: boolean): { ctx: RenderContext; html: string[] } {
  const out = resolved ? resolveCatalogBlocks(page, blocks, data) : blocks;
  const ctx = buildRenderContext(page.path, out, site);
  return { ctx, html: out.map((b) => absolutize(renderBlockToHtml(b, ctx), page.path)) };
}

interface PageResult {
  path: string;
  converted: string[];
  kept: string[];
  stripped: number;
  error?: string;
}
const results: PageResult[] = [];
const newBlocks = new Map<number, Block[]>();

const gridsByPage = new Map<number, Grid[]>();
for (const g of grids) gridsByPage.set(g.page.id, [...(gridsByPage.get(g.page.id) ?? []), g]);
const touched = new Set([...gridsByPage.keys(), ...products.map((p) => p.pageId)]);

for (const page of pages.filter((p) => touched.has(p.id))) {
  const res: PageResult = { path: page.path, converted: [], kept: [], stripped: 0 };
  let blocks = page.blocks;
  const lenientAt = new Set<string>();
  for (const g of gridsByPage.get(page.id) ?? []) {
    const r = convertGrid(g);
    const label = `#${g.loc.join('.')} ${g.typed ? 'список товаров' : g.design}`;
    if ('reason' in r) {
      res.kept.push(`${label}: ${r.reason}`);
      continue;
    }
    blocks = setAt(blocks, g.loc, r.block);
    if (r.lenient) lenientAt.add(String(g.loc[0]));
    res.converted.push(label);
  }
  // товар: общие секции категории убираются со страницы — их выводит шаблон
  const product = products.find((p) => p.pageId === page.id);
  const tpl = product ? categories.find((c) => c.id === product.categoryId)!.productBlocks : [];
  if (tpl.length) {
    const c = core(blocks);
    const at = c.length - tpl.length;
    if (at >= 0 && c.slice(at).every((b, i) => alike(b, tpl[i]))) {
      // гарантия из «Преимуществ» страницы — в карточку товара
      const adv = c.slice(at).find((b): b is Extract<Block, { type: 'adv' }> => b.type === 'adv');
      product!.warranty = adv?.warranty ?? null;
      blocks = [...c.slice(0, at), ...blocks.slice(c.length)];
      res.stripped = tpl.length;
    } else res.error = 'хвост страницы не совпал с шаблоном категории';
  }
  // пустые блоки «HTML как есть» (остались от старой вёрстки) ничего не выводят — в админке они только мешают
  if (product) blocks = blocks.filter((b) => !(b.type === 'html' && !b.html.trim()));
  if (!res.converted.length && !res.stripped) {
    results.push(res);
    continue;
  }
  // сверка: те же блоки (после подстановки из каталога) дают тот же HTML
  const before = renderEach(page, page.blocks, false);
  const after = renderEach(page, blocks, true);
  let diff: string | undefined;
  // блоки, которые ничего не выводят (пустой HTML), в сверке не участвуют
  const was = before.html.map((html, i) => ({ html, i })).filter((x) => x.html !== '');
  const now = after.html.filter((h) => h !== '');
  if (was.length !== now.length) diff = `число блоков ${was.length} → ${now.length}`;
  for (let k = 0; !diff && k < was.length; k++) {
    const i = was[k].i;
    const lenient = lenientAt.has(String(i));
    const canon = (html: string) => {
      // «Сделано в России» на обложках раньше дорисовывал скрипт, теперь выводит сервер
      const c = canonHtml(html, { stripEnhancements: lenient }).replace(/<span[^>]*class="made-badge"[^>]*><span[^>]*><\/span>[^<]*<\/span>/g, '');
      return lenient ? c.replace(/(<span class="cf-trigger__value" data-cf-value="">)[^<]*/g, '$1') : c;
    };
    const d = firstDifference(canon(was[k].html), canon(now[k]), 70);
    if (d) diff = `блок #${i} @${d.at}: «${d.a}» ≠ «${d.b}»`;
  }
  if (diff) {
    res.error = diff;
    res.kept.push(...res.converted.map((c) => `${c}: рендер расходится`));
    res.converted = [];
    res.stripped = 0;
  } else newBlocks.set(page.id, blocks);
  results.push(res);
}

// ── Отчёт ─────────────────────────────────────────────────────────────────
const failedTemplates = results.filter((r) => r.error && !r.converted.length && r.stripped === 0 && products.some((p) => p.path === r.path));
console.log(`\nКатегории: ${categories.length} (на главной ${categories.filter((c) => c.onHome).length})`);
for (const c of [...categories].sort((a, b) => a.sort - b.sort)) {
  const subs = subcategories.filter((s) => s.categoryId === c.id);
  const prods = products.filter((p) => p.categoryId === c.id);
  console.log(
    `  ${String(c.sort).padStart(3)} ${c.onHome ? '⌂' : ' '} ${plainText(c.name)} — ${c.path} · подкатегорий ${subs.length}${subs.some((s) => !s.listed) ? ` (скрытых ${subs.filter((s) => !s.listed).length})` : ''} · товаров ${prods.length} · шаблон товара: ${c.productBlocks.map((b) => b.type).join(' ') || '—'}`,
  );
}
console.log(`Подкатегории: ${subcategories.length}, товары: ${products.length} (не в списках: ${products.filter((p) => !p.listed).length})`);
for (const p of products.filter((x) => !x.listed)) console.log(`  не в списке: ${p.path}`);
console.log('\nШаблоны товаров (варианты хвостов страниц):');
for (const t of templateReport) {
  if (t.variants.length > 1) console.log(`  ${t.category}: ${t.variants.map((v) => `[${v.tail}]×${v.count}`).join(' | ')}`);
}
console.log('\nСетки:');
for (const r of results) {
  if (r.converted.length || r.kept.length) console.log(`  ${r.path}  ${r.converted.map((c) => `✓ ${c}`).join('  ')}  ${r.kept.map((k) => `✗ ${k}`).join('  ')}`);
}
for (const e of gridErrors) console.log(`  ✗ ${e.page} #${e.loc}: не разобрана — ${e.error}`);
const errors = results.filter((r) => r.error);
console.log(`\nРасхождения рендера: ${errors.length}`);
for (const r of errors.slice(0, 40)) console.log(`  ${r.path}: ${r.error}`);
for (const n of notes) console.log(`  ! ${n}`);
console.log(
  `\nИтого: страниц изменится ${newBlocks.size}; сеток из каталога ${results.reduce((a, r) => a + r.converted.length, 0)}, осталось как есть ${results.reduce((a, r) => a + r.kept.length, 0)}; у товаров убрано общих секций: ${results.filter((r) => r.stripped).length} стр.`,
);
if (failedTemplates.length) console.log(`шаблон не применён к ${failedTemplates.length} товарам`);
if (args.has('report')) {
  fs.writeFileSync(args.get('report')!, JSON.stringify({ categories, subcategories, products, templateReport, results, gridErrors, notes }, null, 1));
}

if (DRY) {
  await close();
  process.exit(0);
}

// ── Запись ────────────────────────────────────────────────────────────────
const entityPages = new Set([...categories, ...subcategories, ...products].map((e) => e.pageId));
const backupFile =
  args.get('backup') ?? path.resolve('tools/parity/report', `catalog-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.mkdirSync(path.dirname(backupFile), { recursive: true });
const backup: Backup = {
  createdAt: new Date().toISOString(),
  pages: pages.filter((p) => entityPages.has(p.id) || newBlocks.has(p.id)).map((p) => ({ id: p.id, path: p.path, blocks: p.blocks, extraMeta: p.extraMeta })),
};
fs.writeFileSync(backupFile, JSON.stringify(backup));
console.log(`копия прежних блоков: ${backupFile}`);

const json = (v: unknown) => v as Prisma.InputJsonValue;
await db.$transaction(
  async (tx) => {
    const catIds = new Map<number, number>();
    for (const { id, path: _p, status: _s, ...c } of categories) {
      const row = await tx.category.create({ data: { ...c, coverAttrs: json(c.coverAttrs), productBlocks: json(c.productBlocks) }, select: { id: true } });
      catIds.set(id, row.id);
    }
    const subIds = new Map<number, number>();
    for (const { id, path: _p, status: _s, categoryId, ...s } of subcategories) {
      const row = await tx.subcategory.create({
        data: { ...s, categoryId: catIds.get(categoryId)!, coverAttrs: json(s.coverAttrs) },
        select: { id: true },
      });
      subIds.set(id, row.id);
    }
    const rows = products.map(({ id: _id, path: _p, status: _s, categoryId, subcategoryId, ...p }) => ({
      ...p,
      categoryId: catIds.get(categoryId)!,
      subcategoryId: subcategoryId === null ? null : subIds.get(subcategoryId)!,
      coverAttrs: json(p.coverAttrs),
      specs: json(p.specs),
      actions: json(p.actions),
      attrs: json(p.attrs),
    }));
    for (let i = 0; i < rows.length; i += 100) await tx.product.createMany({ data: rows.slice(i, i + 100) });
    // страницы каталога теперь ведёт админка: повторный импорт из Astro их не трогает
    for (const p of pages) {
      if (!entityPages.has(p.id) && !newBlocks.has(p.id)) continue;
      await tx.page.update({
        where: { id: p.id },
        data: {
          ...(newBlocks.has(p.id) ? { blocks: json(newBlocks.get(p.id)) } : {}),
          ...(entityPages.has(p.id) ? { extraMeta: json({ ...p.extraMeta, source: 'catalog' }) } : {}),
        },
      });
    }
  },
  { maxWait: 10_000, timeout: 5 * 60_000 },
);
console.log('каталог записан. Сбросьте кеш контента (POST /admin/v1/cache/purge) и проверьте страницы.');
await close();
