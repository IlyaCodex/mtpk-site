import type { Db } from './db.ts';

/**
 * Каталог продукции для админки: все страницы /products/… плоским списком —
 * название (заголовок H1 товара или категории), короткое название (как в
 * хлебных крошках), фото, тип и статус. Дерево «категория → подкатегория →
 * товар» строит админка по адресам.
 * Нужные поля достаются из блоков прямо в базе: сами блоки (десятки мегабайт
 * HTML) не загружаются.
 */
export interface CatalogNode {
  id: number;
  path: string;
  template: string;
  status: string;
  /** полное название — заголовок H1 */
  name: string;
  /** короткое название, как в хлебных крошках сайта: «Кранового типа», «УИД-376» */
  short: string;
  image: string | null;
  /**
   * родитель по хлебным крошкам страницы. У запчастей он не совпадает с
   * адресом: позиция /zapchasti/drobemetnoe/baraban/ лежит в группе
   * /zapchasti/drobemetnoe/telfery/ — рядом по адресу, но ниже по смыслу
   */
  parent: string | null;
  updatedAt: Date;
}

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  laquo: '«',
  raquo: '»',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lt: '<',
  gt: '>',
  times: '×',
};

/** Текст без разметки и сущностей: «Крановый дробемёт для&nbsp;очистки» → «Крановый дробемёт для очистки». */
export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (m, e: string) => (e.startsWith('#') ? String.fromCodePoint(Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Последняя ссылка хлебных крошек на раздел каталога (не на саму страницу). */
function crumbParent(r: Row): string | null {
  const hrefs = r.crumbs ? r.crumbs.map((c) => c.href ?? '') : [...(r.crumbsHtml ?? '').matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const paths = hrefs.map((h) => h.replace(/^https?:\/\/[^/]+/, '')).filter((h) => h.startsWith('/products/') && h !== r.path);
  return paths.at(-1) ?? null;
}

const unquote = (url: string | null) => (url ? url.trim().replace(/^['"]|['"]$/g, '') : null);

type Row = {
  id: number;
  path: string;
  template: string;
  status: string;
  title: string;
  updatedAt: Date;
  heroTitle: string | null;
  crumb: string | null;
  crumbs: { href?: string; label?: string }[] | null;
  crumbsHtml: string | null;
  photo: string | null;
  bg: string | null;
  h1: string | null;
  img: string | null;
};

/** Ссылки хлебных крошек страницы: [адрес, подпись]. */
function crumbLinks(r: Row): [string, string][] {
  const links: [string, string][] = r.crumbs
    ? r.crumbs.filter((c) => c.href && c.label).map((c) => [c.href!, c.label!])
    : [...(r.crumbsHtml ?? '').matchAll(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map((m) => [m[1], m[2]]);
  return links.map(([h, l]) => [h.replace(/^https?:\/\/[^/]+/, ''), plainText(l)]);
}

export async function catalogNodes(db: Db): Promise<CatalogNode[]> {
  const rows = await db.$queryRaw<Row[]>`
    select p.id, p.path, p.template, p.status, p.title, p.updated_at as "updatedAt",
      hero.title as "heroTitle", hero.crumb, hero.crumbs, html."crumbsHtml", hero.photo, hero.bg, html.h1, html.img
    from content.pages p
    left join lateral (
      select b->>'title' as title,
        b->'breadcrumbs'->-1->>'label' as crumb,
        b->'breadcrumbs' as crumbs,
        coalesce(b->'media'->'photos'->0->>'thumb', b->'media'->'photos'->0->>'src') as photo,
        substring(b->'imageAttrs'->>'style' from 'url\\(([^)]+)\\)') as bg
      from jsonb_array_elements(p.blocks) b
      where b->>'type' in ('productHero', 'categoryHero')
      limit 1
    ) hero on true
    left join lateral (
      select substring(b->>'html' from '<h1[^>]*>(.*?)</h1>') as h1,
        substring(b->>'html' from '<div class="breadcrumbs">(.*?)</div>') as "crumbsHtml",
        substring(b->>'html' from '<img[^>]*?src="(/img/[^"]+)"') as img
      from jsonb_array_elements(p.blocks) b
      where b->>'type' = 'html' and b->>'html' ~ '<h1|<img'
      limit 1
    ) html on true
    where p.kind = 'page' and p.path like '/products/%'
    order by p.path
  `;
  // как раздел подписан в хлебных крошках его страниц: «Для дробемётных установок»
  const labels = new Map<string, string>();
  for (const r of rows) for (const [href, label] of crumbLinks(r)) if (label && !labels.has(href)) labels.set(href, label);
  return rows.map((r) => {
    const name = plainText(r.heroTitle ?? r.h1 ?? r.title.split('|')[0]) || r.path;
    return {
      id: r.id,
      path: r.path,
      template: r.template,
      status: r.status,
      name,
      short: labels.get(r.path) || plainText(r.crumb ?? '') || name,
      image: r.photo ?? unquote(r.bg) ?? r.img,
      parent: crumbParent(r),
      updatedAt: r.updatedAt,
    };
  });
}
