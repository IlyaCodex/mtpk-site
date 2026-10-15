/**
 * «Наличие на складе». Две выдачи из одних позиций (админка «Наличие на складе»):
 *  - /data/stock.json — адреса товаров на складе для старых скриптов
 *    (stock-badges.js: бейдж «В наличии» на карточках в блоках «HTML как есть»);
 *  - склад для блоков сайта (resolveStockView): типы — карточки на главной,
 *    позиции — карточки на /nalichie/.
 */
import type { Block, StockGroupView, StockItemView, StockKind } from '@mtpk/content-model';
import type { CatalogData } from './catalog.ts';

export interface StockConfigItem {
  url: string;
  qty?: number | null;
  shipping?: string | null;
  note?: string | null;
  specs?: [string, string][] | null;
  image?: string | null;
  title?: string | null;
}

export interface PageSource {
  body: string;
  title: string;
}

/** Источник страниц по URL ('/products/a/b/' → тело и meta.title). */
export type PageLookup = (path: string) => PageSource | null | undefined;

const urlToSlug = (url: string) => String(url).replace(/^\/+|\/+$/g, '').replace(/^products\//, '');

// HTML-декодер минимальный: &nbsp; → пробел, &amp; → &, прочие &xxx; — убираем
const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/gi, '');

function firstImage(html: string): string | null {
  const re = /<img[^>]+src="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = m[1].split('?')[0].split('#')[0];
    if (src && !src.startsWith('data:')) return src;
  }
  return null;
}

/** Главное фото: phero__main/phero__hero/case-feature__main, иначе первое <img>. */
export function pickStockImage(html: string): string | null {
  const m = html.match(/<img[^>]+class="(?:phero__(?:main|hero)|case-feature__main)"[^>]+src="([^"]+)"/i)
    || html.match(/<img[^>]+src="([^"]+)"[^>]+class="(?:phero__(?:main|hero)|case-feature__main)"/i);
  if (m) return m[1].split('?')[0];
  return firstImage(html);
}

export function pickStockTitle(html: string, metaTitle: string): string {
  const m = html.match(/<h1[^>]*class="[^"]*phero__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) {
    const t = decode(m[1].replace(/<[^>]+>/g, ' ')).trim().replace(/\s+/g, ' ');
    if (t.length > 3) return t;
  }
  if (metaTitle) return metaTitle.split('—')[0].split('·')[0].trim();
  return '';
}

/** Категория = текст первой ссылки breadcrumb вида /products/<cat>/ */
export function pickStockCategory(html: string): string {
  const re = /<a[^>]+href="\/products\/([^"/]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = decode(m[2].replace(/<[^>]+>/g, '')).trim().replace(/\s+/g, ' ');
    if (text && text.toLowerCase() !== 'каталог оборудования') return text;
  }
  return '';
}

export interface StockResolveResult {
  items: Record<string, unknown>[];
  warnings: string[];
}

export function resolveStock(config: StockConfigItem[], lookup: PageLookup): StockResolveResult {
  const items: Record<string, unknown>[] = [];
  const warnings: string[] = [];
  for (const it of config) {
    const url = String(it.url || '').trim();
    if (!url) {
      warnings.push('позиция без url — пропущена');
      continue;
    }
    if (!url.startsWith('/products/')) {
      warnings.push(`url не /products/…: ${url} — пропущен`);
      continue;
    }
    const page = lookup(url);
    if (!page) {
      warnings.push(`нет страницы ${url} — пропущена`);
      continue;
    }
    const html = page.body;
    const out: Record<string, unknown> = {
      slug: urlToSlug(url),
      url,
      title: pickStockTitle(html, page.title || ''),
      category: pickStockCategory(html),
      image: pickStockImage(html) || null,
    };
    if (it.qty != null) out.qty = it.qty;
    if (it.shipping) out.shipping = it.shipping;
    if (it.note) out.note = it.note;
    if (Array.isArray(it.specs) && it.specs.length) out.specs = it.specs;
    if (typeof it.image === 'string' && it.image) out.image = it.image;
    if (typeof it.title === 'string' && it.title) out.title = it.title;
    items.push(out);
  }
  return { items, warnings };
}

// ── Склад для блоков сайта (типы и позиции из админки «Наличие на складе») ──

/** Тип позиций в базе (content.stock_groups). */
export interface StockGroupRow {
  key: string;
  kind: string;
  title: string;
  image: string | null;
}

/** Позиция в базе (content.stock_items). */
export interface StockItemRow {
  groupKey: string | null;
  url: string;
  title: string | null;
  image: string | null;
  specs: unknown;
  photos: unknown;
  qty: number | null;
  shipping: string | null;
  /** цена, ₽ (нет — «по запросу»), «от» перед ней, пояснение («с НДС») */
  price?: number | null;
  priceFrom?: boolean;
  priceNote?: string | null;
}

export interface StockView {
  groups: StockGroupView[];
  items: StockItemView[];
}

const kindOf = (k: string): StockKind => (k === 'parts' ? 'parts' : 'equipment');

/**
 * Простой текст из админки (название, характеристики, срок) → HTML для сайта:
 * спецсимволы экранированы, после предлогов и союзов — неразрывный пробел
 * («нагреватели и&nbsp;печи»), как в остальных текстах сайта.
 */
export function textHtml(text: string): string {
  return text
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/(?<=^|[\s(«])([а-яё]{1,2}|для|без|под|над|при|про|или)\s+/giu, '$1&nbsp;');
}
const pathOf = (url: string) => (url.trim() ? url.trim().replace(/[?#].*$/, '').replace(/\/?$/, '/') : '');

/** Цена для карточки: разряды через узкий неразрывный пробел, «от» и ₽ — неразрывно; нет цены — undefined. */
export function priceHtml(price: number | null | undefined, from = false): string | undefined {
  if (price == null || !Number.isFinite(price) || price <= 0) return undefined;
  const digits = String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, '&#8239;');
  return `${from ? 'от&nbsp;' : ''}${digits}&nbsp;₽`;
}

/** Фото со склада из JSON-поля: [{ src, alt }]. */
function photosOf(raw: unknown): StockItemView['photos'] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p) => {
    const src = typeof p === 'string' ? p : (p as { src?: unknown })?.src;
    if (typeof src !== 'string' || !/^(\/|https?:\/\/)/.test(src.trim())) return [];
    const alt = typeof p === 'object' && typeof (p as { alt?: unknown }).alt === 'string' ? (p as { alt: string }).alt : '';
    return [{ src: src.trim(), alt }];
  });
}

/** Характеристики позиции из JSON-поля: [название, значение][]. */
function specsOf(raw: unknown): StockItemView['specs'] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const rows = raw.flatMap((s) => (Array.isArray(s) && s.length >= 2 && String(s[0]).trim() ? [{ label: textHtml(String(s[0])), value: textHtml(String(s[1])) }] : []));
  return rows.length ? rows : null;
}

/**
 * Склад для блоков сайта: позиции по типам — в порядке типов, внутри типа — в
 * порядке позиций. Чего нет у позиции (название, фото, характеристики,
 * плашка), берётся из карточки товара или раздела каталога, на который она
 * ссылается; ссылка на черновик каталога не выводится. Тип без позиций на
 * сайте не показывается, фото типа по умолчанию — фото его первой позиции.
 * Позиции без типа видны только в общем списке. Страница не из таблиц
 * каталога (запчасти) даёт название и фото со своей разметки — pages.
 */
export function resolveStockView(
  groups: StockGroupRow[],
  items: StockItemRow[],
  catalog: CatalogData,
  pages: (path: string) => { title?: string; image?: string | null } | undefined = () => undefined,
): StockView {
  const order = new Map(groups.map((g, i) => [g.key, i]));
  const sorted = items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (order.get(a.it.groupKey ?? '') ?? groups.length) - (order.get(b.it.groupKey ?? '') ?? groups.length) || a.i - b.i)
    .map(({ it }) => it);

  const views: StockItemView[] = sorted.map((it) => {
    const path = pathOf(it.url);
    const product = path ? catalog.products.find((p) => p.path === path) : undefined;
    const section = path && !product ? (catalog.subcategories.find((s) => s.path === path) ?? catalog.categories.find((c) => c.path === path)) : undefined;
    const source = product ?? section;
    const page = path && !source ? pages(path) : undefined;
    // своё название и название со страницы — простой текст, у каталога — уже HTML
    const own = it.title?.trim();
    const title = own ? textHtml(own) : source?.name || (page?.title ? textHtml(page.title) : 'Позиция на&nbsp;складе');
    const alt = own || page?.title || title.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    const cover = it.image?.trim() || source?.cover || page?.image || '';
    const specs = specsOf(it.specs) ?? product?.specs ?? [];
    const price = priceHtml(it.price, it.priceFrom);
    return {
      group: it.groupKey && order.has(it.groupKey) ? it.groupKey : '',
      href: source && source.status !== 'published' ? '' : path,
      title,
      ...(!it.title?.trim() && product?.nameNote ? { titleNote: product.nameNote } : {}),
      ...(cover
        ? {
            image: {
              src: cover,
              alt: it.image?.trim() || !source ? alt : source.coverAlt,
              ...(!it.image?.trim() && source && Object.keys(source.coverAttrs).length ? { attrs: source.coverAttrs } : {}),
            },
          }
        : {}),
      ...(product?.badge ? { badge: product.badge } : {}),
      ...(product?.origin ? { origin: product.origin } : {}),
      ...(product?.caption ? { caption: product.caption } : {}),
      specs,
      ...(it.qty != null ? { qty: it.qty } : {}),
      ...(it.shipping?.trim() ? { shipping: textHtml(it.shipping) } : {}),
      ...(price ? { price, ...(it.priceNote?.trim() ? { priceNote: textHtml(it.priceNote) } : {}) } : {}),
      photos: photosOf(it.photos),
    };
  });

  const out: StockGroupView[] = groups.flatMap((g) => {
    const own = views.filter((v) => v.group === g.key);
    if (!own.length) return [];
    const image = g.image?.trim() || own.find((v) => v.image)?.image?.src;
    return [{ key: g.key, kind: kindOf(g.kind), title: textHtml(g.title), ...(image ? { image } : {}), count: own.length }];
  });
  return { groups: out, items: views };
}

/** Есть ли на странице блоки склада (им нужны данные склада). */
export function hasStockBlocks(blocks: Block[]): boolean {
  return blocks.some((b) => b.type === 'stockShowcase' || b.type === 'stockList' || (b.type === 'container' && hasStockBlocks(b.children)));
}

/** Блоки склада получают типы и позиции (как карточки каталога — данные каталога). */
export function resolveStockBlocks(blocks: Block[], view: StockView): Block[] {
  const resolve = (b: Block): Block => {
    if (b.type === 'container') return { ...b, children: b.children.map(resolve) };
    if (b.type === 'stockShowcase') return { ...b, groups: view.groups };
    if (b.type === 'stockList') return { ...b, groups: view.groups, items: view.items };
    return b;
  };
  return blocks.map(resolve);
}
