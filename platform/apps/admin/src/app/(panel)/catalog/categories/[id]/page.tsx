import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { BlockSchemas } from '@/components/BlockList';
import { CategoryForm, type CategoryEntity } from '@/components/catalog-forms';
import { catalogTrail, CatalogFormHeader } from '@/components/catalog-trail';
import { LinkButton } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { plain, type CatalogTree } from '@/lib/catalog';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Категория' };

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('content');
  const { id } = await params;
  const [category, tree, schemas] = await Promise.all([
    serviceJson<CategoryEntity>('content', `catalog/categories/${Number(id)}`, { user }).catch((err) => {
      if (err instanceof ServiceError && err.status === 404) notFound();
      throw err;
    }),
    serviceJson<CatalogTree>('content', 'catalog/tree', { user }),
    serviceJson<{ blocks: BlockSchemas }>('content', 'block-schemas', { user }),
  ]);
  const counts = tree.categories.find((c) => c.id === category.id);
  return (
    <>
      <CatalogFormHeader
        trail={catalogTrail(tree, category.id)}
        title={plain(category.name)}
        description={
          category.kind === 'hub'
            ? 'Раздел запчастей: карточка на главной (название, обложка) и страница раздела. Позиции правятся в каталоге запчастей.'
            : 'Карточка категории на главной, адрес страницы и общие секции под товарами категории.'
        }
        actions={
          <>
            <LinkButton size="sm" href={`/catalog/${category.page.id}`}>
              Тексты и SEO страницы
            </LinkButton>
            <a href={`${env().PUBLIC_SITE_URL}${category.page.path}`} target="_blank" rel="noopener" className="text-sm text-brand-600 hover:underline">
              на сайте ↗
            </a>
          </>
        }
      />
      <CategoryForm initial={category} childCount={(counts?.subcategories ?? 0) + (counts?.products ?? 0)} products={counts?.products ?? 0} schemas={schemas.blocks} />
    </>
  );
}
