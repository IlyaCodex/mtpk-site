/**
 * Каталог при выводе страниц: карточки в сетках собираются из категорий,
 * подкатегорий и товаров, под страницей товара подставляются общие блоки
 * его категории (формы, преимущества, партнёры). Чистая функция — данные
 * каталога передаёт тот, кто выводит (контент-сервис, скрипт переноса).
 */
import type { Block, CatalogCardItem, ProductCard } from '@mtpk/content-model';

export interface CatalogCategory {
  id: number;
  pageId: number;
  path: string;
  /** статус страницы: черновик в сетках не показывается */
  status: string;
  name: string;
  crumb: string;
  cover: string | null;
  coverAlt: string;
  coverAttrs: Record<string, string>;
  sort: number;
  onHome: boolean;
  kind: string;
  productBlocks: Block[];
  /** скрыта тумблером в админке (вместе с подкатегориями и товарами) */
  hidden?: boolean;
}

export interface CatalogSubcategory {
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
  coverAttrs: Record<string, string>;
  sort: number;
  /** карточка в «Модельном ряду» категории */
  listed: boolean;
  /** скрыта тумблером в админке (вместе с товарами) */
  hidden?: boolean;
}

export interface CatalogProduct {
  id: number;
  pageId: number;
  categoryId: number;
  subcategoryId: number | null;
  path: string;
  status: string;
  name: string;
  nameNote: string | null;
  cover: string | null;
  coverAlt: string;
  coverAttrs: Record<string, string>;
  badge: string | null;
  origin: string | null;
  caption: string | null;
  label: string | null;
  linkText: string | null;
  /** срок гарантии в блоке «Преимущества» под товаром (если не 18 месяцев) */
  warranty: string | null;
  specs: { label: string; value: string }[];
  actions: ProductCard['actions'];
  attrs: Record<string, string>;
  sort: number;
  /** карточка в списке товаров */
  listed: boolean;
  /** скрыт тумблером в админке */
  hidden?: boolean;
}

export interface CatalogData {
  categories: CatalogCategory[];
  subcategories: CatalogSubcategory[];
  products: CatalogProduct[];
}

const bySort = <T extends { sort: number; path: string }>(a: T, b: T) => a.sort - b.sort || a.path.localeCompare(b.path);

/** Статус страницы, скрытой с сайта тумблером каталога (её или раздела выше): не published — всюду не видна. */
export const HIDDEN_STATUS = 'hidden';

/**
 * Скрытие с сайта по цепочке: скрытая категория скрывает свои подкатегории и товары, подкатегория — свои
 * товары. У скрытых записей статус страницы — HIDDEN_STATUS: сетки, списки и шаблоны показывают только
 * published, страница отвечает 404, её нет в карте сайта и поиске. Собственный флаг hidden не меняется.
 */
export function applyHidden(data: CatalogData): CatalogData {
  const cats = new Set(data.categories.filter((c) => c.hidden).map((c) => c.id));
  const subs = new Set(data.subcategories.filter((s) => s.hidden || cats.has(s.categoryId)).map((s) => s.id));
  const off = <T extends { status: string }>(x: T, hidden: boolean): T => (hidden ? { ...x, status: HIDDEN_STATUS } : x);
  return {
    categories: data.categories.map((c) => off(c, cats.has(c.id))),
    subcategories: data.subcategories.map((s) => off(s, subs.has(s.id))),
    products: data.products.map((p) => off(p, Boolean(p.hidden) || cats.has(p.categoryId) || (p.subcategoryId !== null && subs.has(p.subcategoryId)))),
  };
}

/** Страницы, скрытые с сайта тумблерами каталога: id и адреса. */
export function hiddenPages(data: CatalogData): { ids: Set<number>; paths: Set<string> } {
  const all = [...data.categories, ...data.subcategories, ...data.products].filter((x) => x.status === HIDDEN_STATUS);
  return { ids: new Set(all.map((x) => x.pageId)), paths: new Set(all.map((x) => x.path)) };
}

/** Чья это страница: категории, подкатегории или товара. */
export function catalogOwner(pageId: number, data: CatalogData) {
  return {
    category: data.categories.find((c) => c.pageId === pageId),
    subcategory: data.subcategories.find((s) => s.pageId === pageId),
    product: data.products.find((p) => p.pageId === pageId),
  };
}

/** Товары в списке страницы: у подкатегории — её товары, у категории — товары прямо в ней (без подкатегории). */
export function pageProducts(pageId: number, data: CatalogData): CatalogProduct[] {
  const { category, subcategory } = catalogOwner(pageId, data);
  const list = subcategory
    ? data.products.filter((p) => p.subcategoryId === subcategory.id)
    : category
      ? data.products.filter((p) => p.categoryId === category.id && p.subcategoryId === null)
      : [];
  return list.filter((p) => p.listed && p.status === 'published').sort(bySort);
}

const item = (x: { path: string; cover: string | null; coverAlt: string; coverAttrs: Record<string, string> }, title: string, extra: Partial<CatalogCardItem> = {}): CatalogCardItem => ({
  href: x.path,
  title,
  ...(x.cover ? { image: x.cover } : {}),
  alt: x.coverAlt,
  ...(Object.keys(x.coverAttrs).length ? { imageAttrs: x.coverAttrs } : {}),
  ...extra,
});

/** Карточка товара для стандартного списка («Запросить цену», «Подробнее», «К сравнению»). */
export function productCard(p: CatalogProduct): ProductCard {
  return {
    href: p.path,
    ...(p.badge !== null ? { badge: p.badge } : {}),
    image: { src: p.cover ?? '', alt: p.coverAlt, ...(Object.keys(p.coverAttrs).length ? { attrs: p.coverAttrs } : {}) },
    title: p.name,
    ...(p.nameNote !== null ? { titleNote: p.nameNote } : {}),
    ...(p.origin !== null ? { origin: p.origin } : {}),
    ...(p.caption !== null ? { caption: p.caption } : {}),
    specs: p.specs,
    actions: p.actions,
    attrs: p.attrs,
  } as ProductCard;
}

/** Блоки страницы для вывода: карточки — из каталога, у товара — общие блоки категории. */
export function resolveCatalogBlocks(page: { id: number }, blocks: Block[], data: CatalogData): Block[] {
  const { category, subcategory, product } = catalogOwner(page.id, data);
  const ownCategory = category ?? (subcategory ? data.categories.find((c) => c.id === subcategory.categoryId) : undefined);

  // дополнительные карточки и списки «по адресам» не ведут на черновики и скрытые разделы каталога
  const unpublished = new Set([...data.categories, ...data.subcategories, ...data.products].filter((x) => x.status !== 'published').map((x) => x.path));
  const productByPath = new Map(data.products.map((p) => [p.path, p]));
  const asPath = (href: string) => `/${href.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '')}/`;

  const resolve = (b: Block): Block => {
    if (b.type === 'container') return { ...b, children: b.children.map(resolve) };
    // товары по адресам (подборка из разных подкатегорий: «Транзисторные печи для стали») — карточки из каталога
    if (b.type === 'catalogList' && b.paths?.length) {
      const list = b.paths.map((x) => productByPath.get(asPath(x))).filter((p): p is CatalogProduct => p !== undefined && p.status === 'published');
      return { ...b, cards: list.map(productCard) };
    }
    if (b.type === 'catalogList' && b.auto) return { ...b, cards: pageProducts(page.id, data).map(productCard) };
    if (b.type !== 'catalogCards') return b;
    const auto = cardsFor(b.source).map((it) => (b.group ? { ...it, group: b.group } : it));
    return { ...b, items: [...auto, ...(b.extra ?? []).filter((it) => !unpublished.has(asPath(it.href)))] };
  };

  const cardsFor = (source: Extract<Block, { type: 'catalogCards' }>['source']): CatalogCardItem[] => {
    switch (source) {
      case 'none':
        return [];
      case 'categories':
      case 'spares': {
        const list = data.categories
          .filter((c) => c.status === 'published' && (source === 'categories' ? c.onHome : c.kind === 'spares'))
          .sort(bySort);
        return list.map((c) => item(c, c.name));
      }
      case 'subcategories': {
        const list = ownCategory ? data.subcategories.filter((s) => s.categoryId === ownCategory.id && s.listed && s.status === 'published').sort(bySort) : [];
        return list.map((s) => item(s, s.name, s.description ? { caption: s.description } : {}));
      }
      case 'products':
        return pageProducts(page.id, data).map((p) =>
          item(p, p.name, {
            ...(p.caption !== null ? { caption: p.caption } : {}),
            ...(p.label !== null ? { label: p.label } : {}),
            ...(p.linkText !== null ? { linkText: p.linkText } : {}),
          }),
        );
    }
  };

  let out = blocks.map(resolve);
  // страница товара: общие блоки категории — перед просмотром фото (он в конце страницы)
  if (product) {
    // «Преимущества» — с гарантией товара (у чиллеров, транзисторных печей — 12 месяцев)
    const shared = (data.categories.find((c) => c.id === product.categoryId)?.productBlocks ?? []).map((b) =>
      b.type === 'adv' && !b.warranty && product.warranty ? { ...b, warranty: product.warranty } : b,
    );
    if (shared.length) {
      const at = out.length && out[out.length - 1].type === 'lightbox' ? out.length - 1 : out.length;
      out = [...out.slice(0, at), ...shared, ...out.slice(at)];
    }
  }
  return out;
}
