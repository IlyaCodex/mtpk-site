import Link from 'next/link';
import { auditLog, desc } from '@mtpk/db';
import { BLOCK_LABELS, type Block } from '@mtpk/content-model';
import { Badge, Card, formatDate, PageHeader, Stat } from '@/components/ui';
import { can, requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { serviceJson } from '@/lib/services';

type ContentStats = {
  pages: number;
  documents: number;
  drafts: number;
  editedInAdmin: number;
  blocks: number;
  htmlBlocks: number;
  byType: Record<string, number>;
  redirects: number;
  stock: number;
};
type LeadStats = { byStatus: Record<string, number>; byDay: { day: string; count: number }[]; rejects14d: number };

/** Данные одного сервиса; недоступен — null (карточка покажет прочерк). */
const safe = <T,>(p: Promise<T>) => p.catch(() => null);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const user = await requireUser();
  const { forbidden } = await searchParams;
  const [content, leads, search, recent] = await Promise.all([
    can(user, 'content') ? safe(serviceJson<ContentStats>('content', 'stats', { user })) : null,
    can(user, 'leads') ? safe(serviceJson<LeadStats>('leads', 'leads/stats', { user })) : null,
    can(user, 'search') ? safe(serviceJson<{ documents: number; updatedAt: string | null }>('search', 'stats', { user })) : null,
    can(user, 'audit') ? db().select().from(auditLog).orderBy(desc(auditLog.at)).limit(8) : null,
  ]);
  const typedShare = content && content.blocks ? Math.round(((content.blocks - content.htmlBlocks) / content.blocks) * 100) : 0;
  const leads14 = leads?.byDay.reduce((s, d) => s + d.count, 0) ?? 0;
  const maxDay = Math.max(1, ...(leads?.byDay.map((d) => d.count) ?? [1]));

  return (
    <>
      <PageHeader title={`Здравствуйте, ${user.name.split(' ')[0]}`} description="Сводка по сайту uralinduktor.ru" />
      {forbidden && <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">У вас нет доступа к этому разделу.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {content && <Stat label="Страниц" value={content.pages} hint={`+ ${content.documents} статей Практикума · черновиков: ${content.drafts}`} />}
        {content && (
          <Stat
            label="Блоки с формами"
            value={`${typedShare}%`}
            hint={`${content.blocks - content.htmlBlocks} из ${content.blocks} блоков редактируются полями, остальные — HTML`}
            tone="green"
          />
        )}
        {leads && <Stat label="Заявок за 14 дней" value={leads14} hint={`доставлено всего: ${leads.byStatus.delivered ?? 0}`} />}
        {leads && (
          <Stat
            label="Не доставлено"
            value={(leads.byStatus.failed ?? 0) + (leads.byStatus.partial ?? 0)}
            hint="в CRM или на почту — проверьте в «Заявках»"
            tone={(leads.byStatus.failed ?? 0) + (leads.byStatus.partial ?? 0) > 0 ? 'red' : undefined}
          />
        )}
        {search && <Stat label="Страниц в поиске" value={search.documents} hint={`обновлено ${formatDate(search.updatedAt)}`} />}
        {content && <Stat label="Редиректов" value={content.redirects} hint={`позиций на складе: ${content.stock}`} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {leads && (
          <Card title="Заявки по дням" actions={<Link href="/leads" className="text-sm text-brand-600 hover:underline">Все заявки →</Link>}>
            {leads.byDay.length ? (
              <div className="flex h-40 items-end gap-1.5">
                {leads.byDay.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                    <span className="text-xs text-slate-500 tabular-nums">{d.count}</span>
                    <div className="w-full rounded-t bg-brand-500" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 2 }} />
                    <span className="text-[10px] text-slate-400">{d.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">За 14 дней заявок не было.</p>
            )}
          </Card>
        )}
        {content && (
          <Card title="Блоки на страницах" actions={<Link href="/pages" className="text-sm text-brand-600 hover:underline">Страницы →</Link>}>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {Object.entries(content.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => (
                  <li key={type} className="flex justify-between gap-3">
                    <span className="truncate text-slate-600">{BLOCK_LABELS[type as Block['type']] ?? type}</span>
                    <span className="font-medium text-slate-900 tabular-nums">{n}</span>
                  </li>
                ))}
            </ul>
          </Card>
        )}
        {recent && (
          <Card title="Последние действия" actions={<Link href="/audit" className="text-sm text-brand-600 hover:underline">Журнал →</Link>}>
            <ul className="divide-y divide-slate-100 text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="min-w-0 truncate">
                    <Badge>{r.action}</Badge> <span className="text-slate-600">{r.target}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {r.userEmail ?? '—'} · {formatDate(r.at)}
                  </span>
                </li>
              ))}
              {!recent.length && <li className="py-2 text-slate-500">Пока пусто.</li>}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
