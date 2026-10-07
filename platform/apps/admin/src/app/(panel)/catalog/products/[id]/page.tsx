import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { BlockSchemas } from '@/components/BlockList';
import { catalogTrail } from '@/components/catalog-trail';
import { ProductEditor } from '@/components/ProductEditor';
import type { EditablePage } from '@/components/use-page-draft';
import { requireUser } from '@/lib/auth';
import type { CatalogTree, ProductEntity } from '@/lib/catalog';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Товар' };

type Raw = Omit<EditablePage, 'source'> & { kind: string; extraMeta: Record<string, unknown> };

/**
 * Товар целиком на одном экране: карточка в каталоге (где он, обложка,
 * название, характеристики в списке, адрес) и его страница (фото,
 * заголовок, ключевые параметры, характеристики и описание, SEO).
 */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('content');
  const { id } = await params;
  const product = await serviceJson<ProductEntity>('content', `catalog/products/${Number(id)}`, { user }).catch((err) => {
    if (err instanceof ServiceError && err.status === 404) notFound();
    throw err;
  });
  const [page, schemas, tree] = await Promise.all([
    serviceJson<Raw>('content', `pages/${product.page.id}`, { user }),
    serviceJson<{ blocks: BlockSchemas }>('content', 'block-schemas', { user }),
    serviceJson<CatalogTree>('content', 'catalog/tree', { user }),
  ]);
  const { extraMeta, kind: _kind, ...rest } = page;
  return (
    <ProductEditor
      initial={{ ...rest, source: String(extraMeta?.source ?? '') }}
      schemas={schemas.blocks}
      siteUrl={env().PUBLIC_SITE_URL}
      crumbs={catalogTrail(tree, product.categoryId, product.subcategoryId)}
      catalog={{ product, categories: tree.categories.filter((c) => c.kind === 'equipment'), subcategories: tree.subcategories }}
    />
  );
}
