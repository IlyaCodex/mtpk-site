import type { Metadata } from 'next';
import { SubcategoryForm } from '@/components/catalog-forms';
import { catalogTrail, CatalogFormHeader } from '@/components/catalog-trail';
import { requireUser } from '@/lib/auth';
import type { CatalogTree } from '@/lib/catalog';
import { serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Новая подкатегория' };

export default async function NewSubcategoryPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const user = await requireUser('content');
  const sp = await searchParams;
  const tree = await serviceJson<CatalogTree>('content', 'catalog/tree', { user });
  const categories = tree.categories.filter((c) => c.kind === 'equipment');
  const categoryId = Number(sp.category) || undefined;
  return (
    <>
      <CatalogFormHeader
        trail={catalogTrail(tree, categoryId)}
        title="Новая подкатегория"
        description="Подкатегория — карточка в «Модельном ряду» категории и своя страница со списком товаров. Укажите название, краткое описание и обложку — адрес подставится сам."
      />
      <SubcategoryForm categories={categories} categoryId={categoryId} products={0} />
    </>
  );
}
