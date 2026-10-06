import type { Metadata } from 'next';
import { auditLog, count, desc, ilike, or } from '@mtpk/db';
import { Badge, EmptyState, formatDate, PageHeader, Pager, Table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Журнал действий' };
const LIMIT = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ search?: string; offset?: string }> }) {
  await requireUser('audit');
  const sp = await searchParams;
  const offset = Math.max(0, Number(sp.offset ?? 0) || 0);
  const search = sp.search?.trim();
  const where = search
    ? or(ilike(auditLog.action, `%${search}%`), ilike(auditLog.target, `%${search}%`), ilike(auditLog.userEmail, `%${search}%`))
    : undefined;
  const [[{ total }], items] = await Promise.all([
    db().select({ total: count() }).from(auditLog).where(where),
    db().select().from(auditLog).where(where).orderBy(desc(auditLog.at)).offset(offset).limit(LIMIT),
  ]);

  return (
    <>
      <PageHeader title="Журнал действий" description="Кто и когда входил в админку и что менял: страницы, настройки, файлы, редиректы, пользователей." />
      <form className="mb-4 flex gap-2" action="/audit">
        <input name="search" defaultValue={search} placeholder="Действие, адрес или e-mail" className="field max-w-80" />
        <button className="rounded-lg bg-slate-800 px-4 text-sm text-white hover:bg-slate-700">Найти</button>
      </form>
      {items.length ? (
        <Table head={['Когда', 'Кто', 'Действие', 'Что', 'Подробности']}>
          {items.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-500">{formatDate(r.at)}</td>
              <td className="px-4 py-2 text-xs">{r.userEmail ?? '—'}</td>
              <td className="px-4 py-2">
                <Badge tone={r.action.includes('delete') || r.action === 'login.failed' ? 'red' : r.action.startsWith('login') ? 'gray' : 'blue'}>{r.action}</Badge>
              </td>
              <td className="max-w-xs truncate px-4 py-2 font-mono text-xs" title={r.target ?? ''}>
                {r.target}
              </td>
              <td className="max-w-sm truncate px-4 py-2 font-mono text-xs text-slate-500">{r.details ? JSON.stringify(r.details) : ''}</td>
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
