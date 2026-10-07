import type { Metadata } from 'next';
import { Badge, EmptyState, formatDate, PageHeader, Pager, Table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { listAudit } from '@/lib/audit';
import { actionTone, describeAction } from '@/lib/audit-labels';

export const metadata: Metadata = { title: 'Журнал действий' };
const LIMIT = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ search?: string; offset?: string }> }) {
  await requireUser('audit');
  const sp = await searchParams;
  const offset = Math.max(0, Number(sp.offset ?? 0) || 0);
  const search = sp.search?.trim();
  const { total, items } = await listAudit(search, offset, LIMIT);

  return (
    <>
      <PageHeader title="Журнал действий" description="Кто и когда входил в админку и что менял: страницы, настройки, файлы, редиректы, пользователей." />
      <form className="mb-4 flex gap-2" action="/audit">
        <input name="search" defaultValue={search} placeholder="E-mail, адрес страницы или файла" className="field max-w-80" />
        <button className="rounded-lg bg-slate-800 px-4 text-sm text-white hover:bg-slate-700">Найти</button>
      </form>
      {items.length ? (
        <Table head={['Когда', 'Кто', 'Что сделано', 'IP']}>
          {items.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-500">{formatDate(r.at)}</td>
              <td className="px-4 py-2 text-xs">{r.userEmail ?? '—'}</td>
              <td className="max-w-2xl px-4 py-2" title={[r.action, r.target, r.details ? JSON.stringify(r.details) : ''].filter(Boolean).join(' · ')}>
                <span className="flex items-center gap-2">
                  <Badge tone={actionTone(r.action)}>{r.action.startsWith('login') || r.action === 'logout' ? 'вход' : r.action.endsWith('.delete') ? 'удаление' : 'правка'}</Badge>
                  <span className="truncate text-sm text-slate-700">{describeAction(r)}</span>
                </span>
              </td>
              <td className="px-4 py-2 font-mono text-xs text-slate-400">{r.ip ?? ''}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState>Записей нет.</EmptyState>
      )}
      <Pager total={total} offset={offset} limit={LIMIT} href={(o) => `/audit?${new URLSearchParams({ ...(search ? { search } : {}), offset: String(o) })}`} />
    </>
  );
}
