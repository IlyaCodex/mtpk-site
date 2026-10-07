import { withBase } from './base-path';

/**
 * Каталог продукции и типы страниц — словарь для людей: вместо технических
 * кодов шаблонов (product, spare-category…) — понятные названия, вместо
 * плоского списка адресов — дерево «категория → подкатегория → товар».
 */

/** Типы страниц: название и раздел сайта, к которому страница относится. */
export const PAGE_TYPES: Record<string, { label: string; group: SiteGroup }> = {
  home: { label: 'Главная', group: 'site' },
  'catalog-root': { label: 'Каталог: главная страница', group: 'catalog' },
  section: { label: 'Категория каталога', group: 'catalog' },
  category: { label: 'Подкатегория', group: 'catalog' },
  product: { label: 'Товар', group: 'catalog' },
  'spare-category': { label: 'Раздел запчастей', group: 'catalog' },
  spare: { label: 'Запчасть', group: 'catalog' },
  stock: { label: 'Наличие на складе', group: 'catalog' },
  'news-root': { label: 'Новости: список', group: 'news' },
  news: { label: 'Новость', group: 'news' },
  'projects-root': { label: 'Проекты: список', group: 'projects' },
  project: { label: 'Проект', group: 'projects' },
  'services-root': { label: 'Услуги: список', group: 'services' },
  service: { label: 'Услуга', group: 'services' },
  solution: { label: 'Решение', group: 'services' },
  praktikum: { label: 'Практикум: статья', group: 'praktikum' },
  'praktikum-sheet': { label: 'Практикум: рабочий лист', group: 'praktikum' },
  company: { label: 'О компании', group: 'site' },
  proizvodstvo: { label: 'Производство', group: 'site' },
  contacts: { label: 'Контакты', group: 'site' },
  reviews: { label: 'Отзывы', group: 'site' },
  legal: { label: 'Документы и политика', group: 'site' },
  utility: { label: 'Служебная страница', group: 'site' },
  page: { label: 'Страница', group: 'site' },
};

export type SiteGroup = 'site' | 'catalog' | 'news' | 'projects' | 'services' | 'praktikum';
export const SITE_GROUPS: Record<SiteGroup, string> = {
  site: 'О компании и служебные',
  catalog: 'Каталог и запчасти',
  news: 'Новости',
  projects: 'Проекты',
  services: 'Услуги и решения',
  praktikum: 'Практикум',
};

export const typeLabel = (template: string) => PAGE_TYPES[template]?.label ?? 'Страница';

/** Узел каталога (ответ GET /admin/v1/catalog контент-сервиса). */
export interface CatalogNode {
  id: number;
  path: string;
  template: string;
  status: string;
  name: string;
  short: string;
  image: string | null;
  /** родитель по хлебным крошкам страницы (у запчастей отличается от адреса) */
  parent: string | null;
  updatedAt: string;
}

export interface TreeNode extends Omit<CatalogNode, 'parent'> {
  slug: string;
  depth: number;
  parent: TreeNode | null;
  children: TreeNode[];
  /** товаров внутри (на всех уровнях ниже) */
  products: number;
}

const PRODUCT_TYPES = new Set(['product', 'spare']);
export const isProduct = (n: { template: string }) => PRODUCT_TYPES.has(n.template);

/**
 * Дерево каталога. Родитель — страница из хлебных крошек (так на сайте
 * видит посетитель), а если её нет — ближайшая страница выше по адресу.
 */
export function buildTree(nodes: CatalogNode[]): { root: TreeNode | null; byPath: Map<string, TreeNode> } {
  const byPath = new Map<string, TreeNode>();
  for (const { parent: _hint, ...n } of nodes) {
    const parts = n.path.split('/').filter(Boolean);
    byPath.set(n.path, { ...n, slug: parts[parts.length - 1] ?? '', depth: parts.length, parent: null, children: [], products: 0 });
  }
  const byAddress = (node: TreeNode): TreeNode | null => {
    const parts = node.path.split('/').filter(Boolean);
    for (let i = parts.length - 1; i > 0; i--) {
      const parent = byPath.get(`/${parts.slice(0, i).join('/')}/`);
      if (parent) return parent;
    }
    return null;
  };
  const hints = new Map(nodes.map((n) => [n.path, n.parent]));
  for (const node of byPath.values()) {
    const hinted = byPath.get(hints.get(node.path) ?? '');
    node.parent = hinted && hinted !== node && !isProduct(hinted) ? hinted : byAddress(node);
  }
  // крошки, замкнутые в круг, — по адресу
  for (const node of byPath.values()) {
    const seen = new Set<TreeNode>([node]);
    for (let p = node.parent; p; p = p.parent) {
      if (seen.has(p)) {
        node.parent = byAddress(node);
        break;
      }
      seen.add(p);
    }
  }
  for (const node of byPath.values()) node.parent?.children.push(node);
  const count = (n: TreeNode): number => (n.products = n.children.reduce((s, c) => s + count(c) + (isProduct(c) ? 1 : 0), 0));
  const root = byPath.get('/products/') ?? null;
  if (root) count(root);
  return { root, byPath };
}

/** Все товары внутри узла (на любой глубине). */
export function productsIn(node: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    for (const c of n.children) {
      if (isProduct(c)) out.push(c);
      walk(c);
    }
  };
  walk(node);
  return out;
}

/** Путь от категории к узлу: [категория, подкатегория, …] (без корня каталога). */
export function lineage(node: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  for (let n: TreeNode | null = node; n && n.path !== '/products/'; n = n.parent) out.unshift(n);
  return out;
}

/** Миниатюра картинки сайта (уменьшенная копия из медиасервиса). */
export const thumbUrl = (src: string | null, w = 160) => (src && src.startsWith('/img/') ? withBase(`/media-files${src}${src.includes('?') ? '&' : '?'}w=${w}`) : src);

type CrumbBlock = { type: string; breadcrumbs?: { href?: string; label?: string }[]; html?: string };

/**
 * Хлебные крошки редактора: страницы каталога — «Каталог / категория /
 * подкатегория» со ссылками на нужный уровень раздела «Каталог продукции»
 * (берутся из крошек самой страницы), остальные — «Все страницы».
 */
export function editorCrumbs(path: string, blocks: CrumbBlock[]): { href: string; label: string }[] {
  if (!path.startsWith('/products/')) return [{ href: '/pages', label: 'Все страницы' }];
  let links: [string, string][] = [];
  for (const b of blocks) {
    if (b.breadcrumbs?.length) links = b.breadcrumbs.filter((c) => c.href && c.label).map((c) => [c.href!, c.label!]);
    else if (b.type === 'html' && b.html?.includes('class="breadcrumbs"')) {
      const box = b.html.match(/<div class="breadcrumbs">([\s\S]*?)<\/div>/)?.[1] ?? '';
      links = [...box.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [m[1], m[2]]);
    }
    if (links.length) break;
  }
  const levels = links
    .map(([href, label]) => [href.replace(/^https?:\/\/[^/]+/, ''), label.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()] as const)
    .filter(([href]) => href.startsWith('/products/') && href !== '/products/' && href !== path)
    .slice(0, 3);
  const keys = ['c', 's', 'g'];
  return [
    { href: '/catalog', label: 'Каталог' },
    ...levels.map(([href, label], i) => {
      const query = levels.slice(0, i + 1).map(([h], k) => `${keys[k]}=${h.split('/').filter(Boolean).pop()}`);
      return { href: `/catalog?${query.join('&')}`, label: label || href };
    }),
  ];
}

// ── Каталог как данные: категории, подкатегории, товары ────────────────────

/** Категория (раздел на главной) — ответ GET /admin/v1/catalog/tree. */
export interface CatCategory {
  id: number;
  pageId: number;
  path: string;
  status: string;
  name: string;
  crumb: string;
  cover: string | null;
  coverAlt: string;
  sort: number;
  onHome: boolean;
  /** equipment — оборудование, hub — витрина запчастей */
  kind: string;
  subcategories: number;
  products: number;
  updatedAt: string;
}

export interface CatSubcategory {
  id: number;
  pageId: number;
  categoryId: number;
  path: string;
  status: string;
  name: string;
  crumb: string;
  description: string;
  cover: string | null;
  coverAlt: string;
  sort: number;
  listed: boolean;
  products: number;
  updatedAt: string;
}

export interface CatProduct {
  id: number;
  pageId: number;
  categoryId: number;
  subcategoryId: number | null;
  path: string;
  status: string;
  name: string;
  nameNote: string | null;
  cover: string | null;
  sort: number;
  listed: boolean;
  updatedAt: string;
}

export interface CatalogTree {
  categories: CatCategory[];
  subcategories: CatSubcategory[];
  products: CatProduct[];
}

/** Карточка товара целиком — GET /admin/v1/catalog/products/:id. */
export interface ProductEntity extends Omit<CatProduct, 'path' | 'status' | 'updatedAt'> {
  coverAlt: string;
  badge: string | null;
  origin: string | null;
  caption: string | null;
  label: string | null;
  linkText: string | null;
  warranty: string | null;
  specs: { label: string; value: string }[];
  actions: unknown[];
  attrs: Record<string, string>;
  page: { id: number; path: string; status: string; updatedAt: string };
}

/** Последний сегмент адреса: '/products/a/b/' → 'b' (так раздел выбирается в адресе каталога). */
export const lastSegment = (path: string) => path.split('/').filter(Boolean).pop() ?? '';

/** Название без разметки: «Дробемёт&nbsp;кранового типа» → «Дробемёт кранового типа». */
export function plain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Адрес из названия: «Дробемёт УИД-376» → «drobemet-uid-376». */
export function slugify(name: string): string {
  return plain(name)
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** Склонение: 1 товар, 2 товара, 5 товаров. */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
