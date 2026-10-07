import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, formatDate, PageHeader, Pager, Table } from '@/components/ui';
import { LEAD_STATUS } from '@/lib/leads';
import { requireUser } from '@/lib/auth';
import { withBase } from '@/lib/base-path';
import { serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Заявки' };

type Lead = {
  id: number;
  createdAt: string;
  source: string | null;
  pageUrl: string | null;
  phone: string;
  name: string | null;
  email: string | null;
  status: string;
  mailStatus: string;
  b24Status: string;
  b24LeadId: number | null;
  hasAttachment: boolean;
};

const LIMIT = 50;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; offset?: string }> }) {
  const user = await requireUser('leads');
  const sp = await searchParams;
  const offset = Math.max(0, Number(sp.offset ?? 0) || 0);
  const q = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) });
  if (sp.status) q.set('status', sp.status);
  if (sp.search) q.set('search', sp.search);
  const data = await serviceJson<{ total: number; items: Lead[] }>('leads', `leads?${q}`, { user });
  const href = (o: number) => `/leads?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.search ? { search: sp.search } : {}), offset: String(o) })}`;

  return (
    <>
      <PageHeader
        title="Заявки"
        description="Все заявки с форм сайта. Каждая сохраняется до отправки, поэтому не теряется: если почта или Битрикс24 были недоступны, доставка повторяется автоматически, а здесь её можно запустить вручную."
      />
      <form className="mb-4 flex flex-wrap gap-2" action={withBase('/leads')}>
        <input name="search" defaultValue={sp.search} placeholder="Телефон, имя, e-mail, текст" className="field max-w-80" />
        <select name="status" defaultValue={sp.status ?? ''} className="field max-w-56">
          <option value="">Все статусы</option>
          {Object.entries(LEAD_STATUS).map(([k, [label]]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-800 px-4 text-sm text-white hover:bg-slate-700">Найти</button>
      </form>
      {data.items.length ? (
        <Table head={['№', 'Когда', 'Контакт', 'Источник', 'Доставка']}>
          {data.items.map((l) => {
            const [label, tone] = LEAD_STATUS[l.status] ?? [l.status, 'gray'];
            return (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/leads/${l.id}`} className="font-medium text-brand-600 hover:underline">
                    #{l.id}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(l.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{l.phone}</div>
                  <div className="text-xs text-slate-500">{[l.name, l.email].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="max-w-xs truncate px-4 py-2.5 text-xs text-slate-600" title={l.source ?? ''}>
                  {l.source}
                  {l.hasAttachment && ' 📎'}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Badge tone={tone}>{label}</Badge>
                  {l.b24LeadId && <span className="ml-2 text-xs text-slate-500">лид {l.b24LeadId}</span>}
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState>Заявок не найдено.</EmptyState>
      )}
      <Pager total={data.total} offset={offset} limit={LIMIT} href={href} />
    </>
  );
}
