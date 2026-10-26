import { applyHidden, HIDDEN_STATUS, hiddenPages, type CatalogData, type CatalogProduct } from '@mtpk/content-kit/catalog';
import type { Block } from '@mtpk/content-model';
import type { Db } from './db.ts';

const page = { select: { path: true, status: true } } as const;
const obj = (v: unknown) => (v ?? {}) as Record<string, string>;

/**
 * Категории, подкатегории и товары с адресами и статусами их страниц — для сборки карточек. Скрытые тумблером
 * (сами или вместе с разделом выше) — со статусом HIDDEN_STATUS: на сайте их нет нигде (applyHidden).
 */
export async function loadCatalog(db: Db): Promise<CatalogData> {
  const [categories, subcategories, products] = await Promise.all([
    db.category.findMany({ include: { page } }),
    db.subcategory.findMany({ include: { page } }),
    db.product.findMany({ include: { page } }),
  ]);
  return applyHidden({
    categories: categories.map(({ page: p, createdAt: _c, updatedAt: _u, ...c }) => ({
      ...c,
      path: p.path,
      status: p.status,
      coverAttrs: obj(c.coverAttrs),
      productBlocks: c.productBlocks as Block[],
    })),
    subcategories: subcategories.map(({ page: p, createdAt: _c, updatedAt: _u, ...s }) => ({
      ...s,
      path: p.path,
      status: p.status,
      coverAttrs: obj(s.coverAttrs),
    })),
    products: products.map(({ page: p, createdAt: _c, updatedAt: _u, ...x }) => ({
      ...x,
      path: p.path,
      status: p.status,
      coverAttrs: obj(x.coverAttrs),
      specs: x.specs as CatalogProduct['specs'],
      actions: x.actions as CatalogProduct['actions'],
      attrs: obj(x.attrs),
    })),
  });
}

/**
 * Страницы, на которых видна карточка или шаблон страницы pageId: главная
 * (категории), страница категории (её подкатегории и товары без
 * подкатегории), страница подкатегории (её товары), страницы товаров
 * категории (общие блоки). Их кеш сбрасывается при правке каталога.
 */
export function catalogDependents(data: CatalogData, pageId: number, opts: { productBlocks?: boolean } = {}): string[] {
  const out = new Set<string>();
  const category = data.categories.find((c) => c.pageId === pageId);
  const subcategory = data.subcategories.find((s) => s.pageId === pageId);
  const product = data.products.find((p) => p.pageId === pageId);
  const categoryPath = (id: number) => data.categories.find((c) => c.id === id)?.path;
  const subcategoryPath = (id: number) => data.subcategories.find((s) => s.id === id)?.path;
  if (category) {
    out.add('/');
    if (opts.productBlocks) for (const p of data.products) if (p.categoryId === category.id) out.add(p.path);
  }
  if (subcategory) out.add(categoryPath(subcategory.categoryId) ?? '/');
  if (product) out.add((product.subcategoryId !== null ? subcategoryPath(product.subcategoryId) : categoryPath(product.categoryId)) ?? '/');
  return [...out];
}

/**
 * Все страницы, скрытые с сайта тумблерами: записи каталога (applyHidden) и прочие страницы внутри скрытых
 * разделов — подборки, статьи, опросные листы (по адресу: скрыт раздел — скрыто всё под его адресом).
 */
export async function hiddenSitePages(db: Db, data: CatalogData): Promise<{ ids: Set<number>; paths: Set<string> }> {
  const out = hiddenPages(data);
  const prefixes = [...data.categories, ...data.subcategories].filter((x) => x.status === HIDDEN_STATUS).map((x) => x.path);
  if (prefixes.length) {
    const rows = await db.page.findMany({ where: { OR: prefixes.map((p) => ({ path: { startsWith: p } })) }, select: { id: true, path: true } });
    for (const r of rows) {
      out.ids.add(r.id);
      out.paths.add(r.path);
    }
  }
  return out;
}
