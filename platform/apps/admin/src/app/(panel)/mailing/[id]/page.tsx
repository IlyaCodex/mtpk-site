import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import type { Campaign, CampaignReportData, MailListRow } from '@/lib/mailing';
import { ServiceError, serviceJson } from '@/lib/services';
import { CampaignEditor } from './CampaignEditor';
import { CampaignReport } from './CampaignReport';

export const metadata: Metadata = { title: 'Рассылка' };

/** Рассылка: черновик — редактор письма; запущенная — ход отправки и статистика. */
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('mailing');
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const campaign = await serviceJson<Campaign>('mailing', `campaigns/${id}`, { user }).catch((err) => {
    if (err instanceof ServiceError && err.status === 404) notFound();
    throw err;
  });
  const lists = await serviceJson<MailListRow[]>('mailing', 'lists', { user });

  if (campaign.status === 'draft') {
    return <CampaignEditor key={campaign.id} campaign={campaign} lists={lists} userEmail={user.email} />;
  }
  const report = await serviceJson<CampaignReportData>('mailing', `campaigns/${id}/stats`, { user });
  return <CampaignReport key={`${campaign.id}-${campaign.status}`} campaign={campaign} listName={lists.find((l) => l.id === campaign.listId)?.name ?? null} initial={report} />;
}
