import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageEditor, type EditablePage } from '@/components/PageEditor';
import type { BlockSchemas } from '@/components/BlockList';
import { requireUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Редактор страницы' };

type Raw = Omit<EditablePage, 'source'> & { kind: string; extraMeta: Record<string, unknown> };

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
  const { extraMeta, kind: _kind, ...rest } = page;
  return (
    <PageEditor
      initial={{ ...rest, source: String(extraMeta?.source ?? '') }}
      schemas={schemas.blocks}
      siteUrl={env().PUBLIC_SITE_URL}
    />
  );
}
