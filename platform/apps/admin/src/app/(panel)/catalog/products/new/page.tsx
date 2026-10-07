import type { Metadata } from 'next';
import { NewProductForm } from '@/components/catalog-forms';
import { catalogTrail, CatalogFormHeader } from '@/components/catalog-trail';
import { requireUser } from '@/lib/auth';
import type { CatalogTree } from '@/lib/catalog';
import { serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Новый товар' };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ category?: string; subcategory?: string }> }) {
  const user = await requireUser('content');
  const sp = await searchParams;
  const tree = await serviceJson<CatalogTree>('content', 'catalog/tree', { user });
  const categories = tree.categories.filter((c) => c.kind === 'equipment');
  const categoryId = Number(sp.category) || undefined;
  // из страницы категории без подкатегорий — товар прямо в категорию
  const subcategoryId = sp.subcategory ? Number(sp.subcategory) : sp.category ? null : undefined;
  return (
    <>
      <CatalogFormHeader
        trail={catalogTrail(tree, categoryId, subcategoryId)}
        title="Новый товар"
        description="Выберите, где товар в каталоге, укажите название, обложку и главные характеристики. Фото, описание и полные характеристики добавите на следующем шаге."
      />
      <NewProductForm categories={categories} subcategories={tree.subcategories} categoryId={categoryId} subcategoryId={subcategoryId} />
    </>
  );
}
