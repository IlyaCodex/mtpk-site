import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import type { MailListFull } from '@/lib/mailing';
import { ServiceError, serviceJson } from '@/lib/services';
import { ListManager } from './ListManager';

export const metadata: Metadata = { title: 'База адресов' };

export default async function MailingListPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('mailing');
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [list, crm] = await Promise.all([
    serviceJson<MailListFull>('mailing', `lists/${id}`, { user }).catch((err) => {
      if (err instanceof ServiceError && err.status === 404) notFound();
      throw err;
    }),
    serviceJson<{ connected: boolean }>('mailing', 'crm', { user }),
  ]);
  return <ListManager key={list.id} initial={list} crmConnected={crm.connected} />;
}
