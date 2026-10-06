import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { RedirectsManager } from './RedirectsManager';

export const metadata: Metadata = { title: 'Редиректы' };

export default async function RedirectsPage() {
  await requireUser('content');
  return (
    <>
      <PageHeader
        title="Редиректы"
        description="Переадресация старых адресов (в том числе с прежнего WordPress) на актуальные страницы. 301 — постоянный: поисковики переносят вес страницы."
      />
      <RedirectsManager />
    </>
  );
}
