/**
 * «Наличие на складе»: позиции склада с карточками товаров. Формат
 * /data/stock.json — его читают stock-list.js, stock-badges.js и
 * stock-product.js.
 */

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

/**
 * Готовая карточка <article class="pcard…"> из родительской категории: на
 * /nalichie/ показываем ровно то, что человек видит в каталоге.
 */
export function extractCatalogCard(productUrl: string, lookup: PageLookup): string | null {
  const parts = productUrl.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length < 3) return null;
  const parentParts = parts.slice(0, -1);
  const parent = lookup(`/${parentParts.join('/')}/`);
  if (!parent) return null;
  const parentHtml = parent.body;
  const needle = productUrl.replace(/\/$/, '');
  const lastSeg = parentParts.length ? parts[parts.length - 1] : '';
  let i = 0;
  while (i < parentHtml.length) {
    const open = parentHtml.indexOf('<article class="pcard', i);
    if (open < 0) return null;
    const close = parentHtml.indexOf('</article>', open);
    if (close < 0) return null;
    const block = parentHtml.slice(open, close + '</article>'.length);
    const absMatch = block.includes(`href="${productUrl}"`) || block.includes(`href="${needle}"`) || block.includes(`href="${needle}/"`);
    const relMatch = lastSeg && (block.includes(`href="${lastSeg}/"`) || block.includes(`href="${lastSeg}"`));
    if (absMatch || relMatch) return block;
    i = close + '</article>'.length;
  }
  return null;
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
    const card = extractCatalogCard(url, lookup);
    if (card) out.cardHtml = card;
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
