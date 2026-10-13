import type { Metadata } from 'next';
import { Badge, EmptyState, formatDate, PageHeader, Pager, Table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { withBase } from '@/lib/base-path';
import { CONTACT_SOURCE, CONTACT_STATUS, fmt, type Contact } from '@/lib/mailing';
import { serviceJson } from '@/lib/services';
import { MailingTabs } from '../MailingTabs';
import { ContactStatusButton } from './ContactStatusButton';

export const metadata: Metadata = { title: 'Адреса рассылок' };

const LIMIT = 50;
const FILTERS: Record<Contact['status'], string> = { active: 'Получают рассылки', unsubscribed: 'Отписались', bounced: 'Недоставляемые' };

export default async function MailingContactsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; offset?: string }> }) {
  const user = await requireUser('mailing');
  const sp = await searchParams;
  const offset = Math.max(0, Number(sp.offset ?? 0) || 0);
  const status = sp.status && sp.status in CONTACT_STATUS ? sp.status : '';
  const q = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) });
  if (status) q.set('status', status);
  if (sp.search) q.set('search', sp.search);
  const data = await serviceJson<{ total: number; items: Contact[] }>('mailing', `contacts?${q}`, { user });
  const href = (o: number) => `/mailing/contacts?${new URLSearchParams({ ...(status ? { status } : {}), ...(sp.search ? { search: sp.search } : {}), offset: String(o) })}`;

  return (
    <>
      <PageHeader
        title="Email-рассылки"
        description="Все адреса из всех баз. Отписка действует на все базы сразу: отписавшимся и недоставляемым письма не уходят, даже если адрес загрузят снова. Отписать вручную — например, если клиент попросил по телефону."
      />
      <MailingTabs active="contacts" />
      <form className="mb-4 flex flex-wrap gap-2" action={withBase('/mailing/contacts')}>
        <input name="search" defaultValue={sp.search} placeholder="Адрес, имя, компания" className="field max-w-80" />
        <select name="status" defaultValue={status} className="field max-w-56">
          <option value="">Все адреса</option>
          {Object.entries(FILTERS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-800 px-4 text-sm text-white hover:bg-slate-700">Найти</button>
      </form>
      {data.items.length ? (
        <Table head={[`Адрес · ${fmt(data.total)}`, 'Имя и компания', 'Откуда', 'Статус', 'Добавлен', '']}>
          {data.items.map((c) => {
            const [label, tone] = CONTACT_STATUS[c.status] ?? [c.status, 'gray'];
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{c.email}</td>
                <td className="px-4 py-2.5">
                  <div>{c.name ?? <span className="text-slate-400">—</span>}</div>
                  {c.company && <div className="text-xs text-slate-500">{c.company}</div>}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{CONTACT_SOURCE[c.source] ?? c.source}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Badge tone={tone}>{label}</Badge>
                  {c.unsubscribedAt && <div className="mt-0.5 text-xs text-slate-400">{formatDate(c.unsubscribedAt)}</div>}
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-2.5 text-right">
                  <ContactStatusButton id={c.id} email={c.email} status={c.status} />
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState>{sp.search || status ? 'Никого не найдено.' : 'Адресов пока нет — загрузите их в базу во вкладке «Базы адресов».'}</EmptyState>
      )}
      <Pager total={data.total} offset={offset} limit={LIMIT} href={href} />
    </>
  );
}
