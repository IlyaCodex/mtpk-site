/**
 * Индекс «Сравнения товаров» — перенос astro/scripts/build-compare-index.mjs.
 * Результат 1:1: compare-index.json (грузит /sravnenie/) и
 * compare-sections.json (список разделов с включённым сравнением).
 */

const MIN_ITEMS = 3; // меньше трёх моделей — сравнивать не с чем
const MIN_PARAMS = 5; // меньше пяти общих строк — таблица пустая
const SHARE = 0.5; // параметр общий, если есть у половины моделей

/** Разделы, где сравнение выключено принудительно. */
const DENY = new Set<string>([]);

/** Синонимы названий строк (нормализованный ключ → как показывать). */
const SYNONYMS = new Map(
  Object.entries({
    'напряжение и частота питающей сети': 'Напряжение и частота сети, В/Гц',
    'напряжение питания, в / гц': 'Напряжение и частота сети, В/Гц',
    'питающая сеть и частота': 'Напряжение и частота сети, В/Гц',
    'напряжение сети, в': 'Напряжение и частота сети, В/Гц',
  }),
);

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&times;/g, '×')
    .replace(/&[a-z#0-9]+;/gi, '');

// неразрывный пробел — в обычный, а нулевой ширины (в «м³/\u2060ч») просто выкидываем
const text = (html: string) =>
  decode(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2060\u200B\u00AD]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const key = (label: string) => label.toLowerCase().replace(/ё/g, 'е').replace(/[:\s]+$/, '').trim();

function crumbs(html: string) {
  const nav = html.match(/<nav[^>]*class="breadcrumb[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!nav) return { links: [] as { href: string; text: string }[], current: '' };
  const links = [...nav[1].matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: m[1], text: text(m[2]) }));
  const cur = nav[1].match(/<span[^>]*class="breadcrumb__current"[^>]*>([\s\S]*?)<\/span>/i);
  return { links, current: cur ? text(cur[1]) : '' };
}

function pickImage(html: string): string {
  const m = html.match(/<img[^>]+class="[^"]*phero__(?:main|hero)[^"]*"[^>]+src="([^"]+)"/i)
    || html.match(/<button[^>]*class="[^"]*phero__main[^"]*"[\s\S]{0,400}?<img[^>]+src="([^"]+)"/i)
    || html.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : '';
}

function specs(html: string): [string, string][] {
  const sec = html.match(/<section[^>]*class="[^"]*\bspec\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  if (!sec) return [];
  const out: [string, string][] = [];
  for (const row of sec[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => text(c[1]));
    if (cells.length < 2 || cells.length > 3) continue;
    const [label, value] = cells;
    if (!label || !value) continue;
    if (/^(параметр|характеристика|показатель|предварительная база|возможные опции|элемент кода)$/i.test(label)) continue;
    if (/^[а-яё]/.test(label)) continue;
    out.push([label, value]);
  }
  return out;
}

/** Сравнение путей в порядке обхода дерева raw-pages (папки и body.html вперемешку по алфавиту). */
export function compareWalkOrder(a: string, b: string): number {
  const sa = [...a.split('/').filter(Boolean), 'body.html'];
  const sb = [...b.split('/').filter(Boolean), 'body.html'];
  const n = Math.min(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    if (sa[i] !== sb[i]) return sa[i] < sb[i] ? -1 : 1;
  }
  return sa.length - sb.length;
}

export interface CompareItem {
  url: string;
  name: string;
  title: string;
  image: string;
  specs: Record<string, string>;
}

export interface CompareSection {
  title: string;
  parent: string;
  params: string[];
  common: number;
  items: CompareItem[];
}

export interface CompareIndex {
  generated: string;
  sections: Record<string, CompareSection>;
}

export interface CompareReport {
  scanned: number;
  skipped: { url: string; items: number; common: number; labels: number }[];
}

/** pages — все страницы каталога (/products/…) с исходным HTML тела. */
export function buildCompareIndex(
  pages: { path: string; body: string }[],
  today = new Date(),
): { index: CompareIndex; sections: string[]; report: CompareReport } {
  const sections = new Map<string, { title: string; parent: string; items: CompareItem[] }>();
  let scanned = 0;

  // Порядок обхода — как рекурсивный readdirSync в Astro-скрипте: внутри папки
  // записи по алфавиту, и собственный body.html раздела стоит среди подпапок
  // на своём алфавитном месте. От порядка зависит очерёдность параметров
  // с одинаковой частотой, поэтому воспроизводим его точно.
  const sorted = pages.filter((p) => p.path.startsWith('/products/')).sort((a, b) => compareWalkOrder(a.path, b.path));
  for (const page of sorted) {
    const html = page.body;
    if (!/class="phero"/.test(html)) continue;
    const rows = specs(html);
    if (!rows.length) continue;
    scanned++;
    const { links, current } = crumbs(html);
    const cat = links.filter((l) => /^\/products\/.+\//.test(l.href));
    const section = cat.length ? cat[cat.length - 1] : null;
    if (!section) continue;
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1] ?? '';
    const item: CompareItem = {
      url: page.path,
      name: current || text(h1),
      title: text(h1),
      image: pickImage(html).split('#')[0],
      specs: {},
    };
    for (const [label, value] of rows) {
      const display = SYNONYMS.get(key(label)) || label;
      if (!(display in item.specs)) item.specs[display] = value;
    }
    if (!sections.has(section.href)) {
      sections.set(section.href, { title: section.text, parent: cat.length > 1 ? cat[cat.length - 2].text : '', items: [] });
    }
    sections.get(section.href)!.items.push(item);
  }

  const result: CompareIndex = { generated: today.toISOString().slice(0, 10), sections: {} };
  const skipped: CompareReport['skipped'] = [];
  for (const [url, sec] of [...sections.entries()].sort()) {
    const freq = new Map<string, number>();
    for (const it of sec.items) for (const label of Object.keys(it.specs)) freq.set(label, (freq.get(label) || 0) + 1);
    const common = [...freq.entries()].filter(([, n]) => n >= Math.ceil(sec.items.length * SHARE)).sort((a, b) => b[1] - a[1]);
    const ok = !DENY.has(url) && sec.items.length >= MIN_ITEMS && common.length >= MIN_PARAMS;
    if (!ok) {
      skipped.push({ url, items: sec.items.length, common: common.length, labels: freq.size });
      continue;
    }
    const rest = [...freq.entries()].filter(([l]) => !common.some(([c]) => c === l)).sort((a, b) => b[1] - a[1]);
    result.sections[url] = {
      title: sec.title,
      parent: sec.parent,
      params: [...common.map(([l]) => l), ...rest.map(([l]) => l)],
      common: common.length,
      items: sec.items.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    };
  }
  return { index: result, sections: Object.keys(result.sections), report: { scanned, skipped } };
}
