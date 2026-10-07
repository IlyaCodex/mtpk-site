import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SubcategoryForm, type SubcategoryEntity } from '@/components/catalog-forms';
import { catalogTrail, CatalogFormHeader } from '@/components/catalog-trail';
import { LinkButton } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { plain, type CatalogTree } from '@/lib/catalog';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Подкатегория' };

export default async function SubcategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('content');
  const { id } = await params;
  const [sub, tree] = await Promise.all([
    serviceJson<SubcategoryEntity>('content', `catalog/subcategories/${Number(id)}`, { user }).catch((err) => {
      if (err instanceof ServiceError && err.status === 404) notFound();
      throw err;
    }),
    serviceJson<CatalogTree>('content', 'catalog/tree', { user }),
  ]);
  const products = tree.subcategories.find((s) => s.id === sub.id)?.products ?? 0;
  return (
    <>
      <CatalogFormHeader
        trail={catalogTrail(tree, sub.categoryId, sub.id)}
        title={plain(sub.name)}
        description="Карточка подкатегории в «Модельном ряду» категории и адрес её страницы. Список товаров на странице собирается сам."
        actions={
          <>
            <LinkButton size="sm" href={`/catalog/${sub.page.id}`}>
              Тексты и SEO страницы
            </LinkButton>
            <a href={`${env().PUBLIC_SITE_URL}${sub.page.path}`} target="_blank" rel="noopener" className="text-sm text-brand-600 hover:underline">
              на сайте ↗
            </a>
          </>
        }
      />
      <SubcategoryForm initial={sub} categories={tree.categories.filter((c) => c.kind === 'equipment')} products={products} />
    </>
  );
}
