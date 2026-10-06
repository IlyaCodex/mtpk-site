import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, formatDate, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { ServiceError, serviceJson } from '@/lib/services';
import { LEAD_STATUS } from '@/lib/leads';
import { ResendButton } from './ResendButton';

export const metadata: Metadata = { title: 'Заявка' };

type LeadFull = Record<string, unknown> & {
  id: number;
  createdAt: string;
  status: string;
  phone: string;
  fields: Record<string, string>;
  utm: Record<string, string>;
  jobs: { id: string; state: string; attempts: number; failedReason: string | null }[];
};

const CHANNEL: Record<string, string> = { sent: 'отправлено', pending: 'ожидает', failed: 'ошибка', skipped: 'не настроено' };

function Row({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words whitespace-pre-wrap text-slate-900">{String(value)}</dd>
    </div>
  );
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('leads');
  const id = Number((await params).id);
  const lead = await serviceJson<LeadFull>('leads', `leads/${id}`, { user }).catch((err) => {
    if (err instanceof ServiceError && err.status === 404) notFound();
    throw err;
  });
  const [label, tone] = LEAD_STATUS[lead.status] ?? [lead.status, 'gray'];

  return (
    <>
      <Link href="/leads" className="text-sm text-slate-500 hover:text-brand-600">
        ← Заявки
      </Link>
      <PageHeader
        title={`Заявка №${lead.id}`}
        description={formatDate(lead.createdAt)}
        actions={
          <>
            <Badge tone={tone}>{label}</Badge>
            {lead.status !== 'delivered' && <ResendButton id={lead.id} />}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Клиент">
          <dl>
            <Row label="Телефон" value={lead.phone} />
            <Row label="Имя" value={lead.name} />
            <Row label="E-mail" value={lead.email} />
            <Row label="Задача" value={lead.task} />
            {Object.entries(lead.fields ?? {}).map(([k, v]) => (
              <Row key={k} label={k} value={v} />
            ))}
            <Row label="Вложение" value={lead.attachmentName ?? lead.attachmentNote} />
            <Row label="Согласие" value={lead.consent} />
          </dl>
        </Card>
        <Card title="Источник и доставка">
          <dl>
            <Row label="Форма" value={lead.source} />
            <Row label="Страница" value={lead.pageUrl} />
            <Row label="Почта" value={`${CHANNEL[String(lead.mailStatus)] ?? lead.mailStatus}${lead.mailError ? ` — ${lead.mailError}` : ''}`} />
            <Row label="Битрикс24" value={`${CHANNEL[String(lead.b24Status)] ?? lead.b24Status}${lead.b24LeadId ? ` · лид ${lead.b24LeadId}` : ''}${lead.b24Error ? ` — ${lead.b24Error}` : ''}`} />
            <Row label="Сквозная аналитика" value={lead.b24TraceStatus} />
            <Row label="Доставлена" value={lead.deliveredAt ? formatDate(String(lead.deliveredAt)) : null} />
            {Object.entries(lead.utm ?? {}).map(([k, v]) => (
              <Row key={k} label={k} value={v} />
            ))}
            <Row label="IP" value={lead.ip} />
          </dl>
          {lead.jobs.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Очередь доставки:{' '}
              {lead.jobs.map((j) => `${j.state} (попыток ${j.attempts}${j.failedReason ? `: ${j.failedReason}` : ''})`).join('; ')}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
