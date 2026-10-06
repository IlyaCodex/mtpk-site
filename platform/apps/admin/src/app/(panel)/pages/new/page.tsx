import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { serviceJson } from '@/lib/services';
import { NewPageForm } from './NewPageForm';

export const metadata: Metadata = { title: 'Новая страница' };

export default async function NewPage() {
  const user = await requireUser('content');
  const templates = await serviceJson<{ template: string; count: number }[]>('content', 'pages/templates', { user });
  return (
    <>
      <PageHeader title="Новая страница" description="Адрес, заголовок и тип; блоки добавите в редакторе. Страница создаётся черновиком — на сайте её не видно, пока не опубликуете." />
      <NewPageForm templates={templates.map((t) => t.template)} />
    </>
  );
}
