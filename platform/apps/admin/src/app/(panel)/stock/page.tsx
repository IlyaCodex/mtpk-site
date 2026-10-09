import type { Metadata } from 'next';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { plain, type CatalogTree } from '@/lib/catalog';
import { env } from '@/lib/env';
import { serviceJson } from '@/lib/services';
import { StockEditor, type CatalogOption, type StockData } from './StockEditor';

export const metadata: Metadata = { title: 'Наличие на складе' };

type PageRow = { path: string; title: string; template: string; status: string };

/** Товары и разделы каталога, страницы запчастей — для выбора «оборудования на сайте» у позиции. */
function catalogOptions(tree: CatalogTree, spares: PageRow[]): CatalogOption[] {
  const category = new Map(tree.categories.map((c) => [c.id, plain(c.name)]));
  const subcategory = new Map(tree.subcategories.map((s) => [s.id, plain(s.name)]));
  return [
    ...tree.products.map((p) => ({
      path: p.path,
      name: plain(p.nameNote ? `${p.name} ${p.nameNote}` : p.name),
      cover: p.cover,
      where: [category.get(p.categoryId), p.subcategoryId !== null ? subcategory.get(p.subcategoryId) : undefined].filter(Boolean).join(' › '),
      section: false,
      draft: p.status !== 'published',
    })),
    ...tree.subcategories.map((s) => ({ path: s.path, name: plain(s.name), cover: s.cover, where: category.get(s.categoryId) ?? '', section: true, draft: s.status !== 'published' })),
    ...tree.categories.map((c) => ({ path: c.path, name: plain(c.name), cover: c.cover, where: '', section: true, draft: c.status !== 'published' })),
    // запчасти — страницы, а не записи каталога: название — заголовок страницы без «| УралИндуктор»
    ...spares.map((p) => ({
      path: p.path,
      name: plain(p.title.replace(/\s*[|·—]\s*УралИндуктор\s*$/, '')),
      cover: null,
      where: 'Запчасти',
      section: p.template === 'spare-category',
      draft: p.status !== 'published',
    })),
  ];
}

export default async function StockPage() {
  const user = await requireUser('content');
  const [data, tree, spares] = await Promise.all([
    serviceJson<StockData>('content', 'stock', { user }),
    serviceJson<CatalogTree>('content', 'catalog/tree', { user }),
    serviceJson<{ items: PageRow[] }>('content', 'pages?template=spare,spare-category&limit=500', { user }),
  ]);
  const site = env().PUBLIC_SITE_URL.replace(/\/$/, '');
  return (
    <>
      <PageHeader
        title="Наличие на складе"
        description="Что лежит на складе — по типам оборудования и запчастей. Типы — карточки блока «Склад» на главной, позиции — карточки страницы /nalichie/ с фото со склада. Товар из списка получает бейдж «В наличии» в каталоге и на своей странице. Пустые поля позиции (название, фото, характеристики) берутся из карточки товара."
        actions={
          <a
            href={`${site}/nalichie/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Icon name="external" className="h-4 w-4" />
            Склад на сайте
          </a>
        }
      />
      <StockEditor initial={data} catalog={catalogOptions(tree, spares.items)} />
    </>
  );
}
