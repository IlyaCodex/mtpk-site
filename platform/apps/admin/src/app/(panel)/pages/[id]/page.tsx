import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { BlockSchemas } from '@/components/BlockList';
import { PageEditor, type EditablePage } from '@/components/PageEditor';
import { ProductEditor } from '@/components/ProductEditor';
import { requireUser } from '@/lib/auth';
import { editorCrumbs } from '@/lib/catalog';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Редактор страницы' };

type Raw = Omit<EditablePage, 'source'> & {
  kind: string;
  extraMeta: Record<string, unknown>;
  /** страница категории, подкатегории или товара каталога */
  catalog: { kind: 'category' | 'subcategory' | 'product'; id: number } | null;
};

/** Редактор страницы: у товаров — карточка товара, у остальных — секции страницы. */
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('content');
  const { id } = await params;
  const [page, schemas] = await Promise.all([
    serviceJson<Raw>('content', `pages/${Number(id)}`, { user }).catch((err) => {
      if (err instanceof ServiceError && err.status === 404) notFound();
      throw err;
    }),
    serviceJson<{ blocks: BlockSchemas }>('content', 'block-schemas', { user }),
  ]);
  if (page.kind !== 'page') notFound();
  // товар каталога — на своём экране: карточка в каталоге и страница вместе
  if (page.catalog?.kind === 'product') redirect(`/catalog/products/${page.catalog.id}`);
  const { extraMeta, kind: _kind, catalog, ...rest } = page;
  const initial = { ...rest, source: String(extraMeta?.source ?? '') };
  const crumbs = editorCrumbs(page.path, page.blocks as never);
  const props = { initial, schemas: schemas.blocks, siteUrl: env().PUBLIC_SITE_URL, crumbs };
  return page.blocks.some((b) => b.type === 'productHero') ? (
    <ProductEditor {...props} />
  ) : (
    // в клиентский редактор — только данные: разметку подсказки он строит сам
    <PageEditor {...props} catalogOwner={catalog && catalog.kind !== 'product' ? { kind: catalog.kind, id: catalog.id } : undefined} />
  );
}
