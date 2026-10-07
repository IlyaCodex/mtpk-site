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
export const thumbUrl = (src: string | null, w = 160) => (src && src.startsWith('/img/') ? `/media-files${src}${src.includes('?') ? '&' : '?'}w=${w}` : src);
