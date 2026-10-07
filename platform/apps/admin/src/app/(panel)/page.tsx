import Link from 'next/link';
import type { ReactNode } from 'react';
import { BLOCK_LABELS, type Block } from '@mtpk/content-model';
import { Badge, Card, formatDate, PageHeader, Stat } from '@/components/ui';
import { actionTone, describeAction } from '@/lib/audit-labels';
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

/** Данные одного сервиса; недоступен — null (плитка покажет прочерк). */
const safe = <T,>(p: Promise<T>) => p.catch(() => null);

/** Плитка быстрого перехода: что за раздел и сколько в нём. */
function Tile({ href, title, text, accent }: { href: string; title: string; text: ReactNode; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border bg-white px-5 py-4 shadow-xs transition hover:shadow-md ${accent ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-brand-300'}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-900 group-hover:text-brand-700">{title}</span>
        <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500">→</span>
      </div>
      <div className={`mt-1 text-sm ${accent ? 'text-red-600' : 'text-slate-500'}`}>{text}</div>
    </Link>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const user = await requireUser();
  const { forbidden } = await searchParams;
  const [content, templates, home, leads, search, recent] = await Promise.all([
    can(user, 'content') ? safe(serviceJson<ContentStats>('content', 'stats', { user })) : null,
    can(user, 'content') ? safe(serviceJson<{ template: string; count: number }[]>('content', 'pages/templates', { user })) : null,
    can(user, 'content') ? safe(serviceJson<{ items: { id: number }[] }>('content', 'pages?template=home&limit=1', { user })) : null,
    can(user, 'leads') ? safe(serviceJson<LeadStats>('leads', 'leads/stats', { user })) : null,
    can(user, 'search') ? safe(serviceJson<{ documents: number; updatedAt: string | null }>('search', 'stats', { user })) : null,
    can(user, 'audit') ? db().auditEntry.findMany({ orderBy: { at: 'desc' }, take: 8 }) : null,
  ]);
  const count = (t: string) => templates?.find((x) => x.template === t)?.count ?? 0;
  const leads14 = leads?.byDay.reduce((s, d) => s + d.count, 0) ?? 0;
  const undelivered = (leads?.byStatus.failed ?? 0) + (leads?.byStatus.partial ?? 0);
  const maxDay = Math.max(1, ...(leads?.byDay.map((d) => d.count) ?? [1]));
  const typedShare = content && content.blocks ? Math.round(((content.blocks - content.htmlBlocks) / content.blocks) * 100) : 0;

  return (
    <>
      <PageHeader title={`Здравствуйте, ${user.name.split(' ')[0]}`} description="Сайт uralinduktor.ru: что можно изменить и что пришло с сайта." />
      {forbidden && <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">У вас нет доступа к этому разделу.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {can(user, 'content') && (
          <>
            <Tile href="/catalog" title="Каталог продукции" text={`${count('product')} товаров · ${count('spare')} запчастей`} />
            {home?.items[0] && <Tile href={`/pages/${home.items[0].id}`} title="Главная страница" text="Обложка, направления, кейсы, контакты" />}
            <Tile href="/pages?group=news" title="Новости" text={`${count('news')} новостей`} />
            <Tile href="/pages?group=projects" title="Проекты" text={`${count('project')} проектов`} />
            <Tile href="/stock" title="Наличие на складе" text={`${content?.stock ?? '—'} позиций`} />
            <Tile href="/settings" title="Шапка, меню, контакты" text="Телефоны, адреса, пункты меню" />
          </>
        )}
        {can(user, 'leads') && (
          <Tile
            href="/leads"
            title="Заявки"
            text={undelivered ? `${undelivered} не доставлено в CRM или на почту — проверьте` : `${leads14} за 14 дней`}
            accent={undelivered > 0}
          />
        )}
        {can(user, 'media') && <Tile href="/media" title="Медиатека" text="Фото и файлы сайта" />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {leads && (
          <Card title="Заявки за 14 дней" actions={<Link href="/leads" className="text-sm text-brand-600 hover:underline">Все заявки →</Link>}>
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
        {recent && (
          <Card title="Последние изменения" actions={<Link href="/audit" className="text-sm text-brand-600 hover:underline">Журнал →</Link>}>
            <ul className="divide-y divide-slate-100 text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${actionTone(r.action) === 'red' ? 'bg-red-500' : actionTone(r.action) === 'gray' ? 'bg-slate-300' : 'bg-brand-500'}`} />
                    <span className="truncate text-slate-700">{describeAction(r)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {r.userEmail?.split('@')[0] ?? '—'} · {formatDate(r.at)}
                  </span>
                </li>
              ))}
              {!recent.length && <li className="py-2 text-slate-500">Пока пусто.</li>}
            </ul>
          </Card>
        )}
      </div>

      {content && (
        <details className="mt-8 rounded-xl border border-slate-200 bg-white shadow-xs">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-600">Техническая сводка (для разработчика)</summary>
          <div className="space-y-6 border-t border-slate-100 p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Страниц" value={content.pages} hint={`+ ${content.documents} статей Практикума · черновиков: ${content.drafts}`} />
              <Stat label="Блоки с полями" value={`${typedShare}%`} hint={`${content.blocks - content.htmlBlocks} из ${content.blocks}, остальные — секции HTML`} />
              {search && <Stat label="Страниц в поиске" value={search.documents} hint={`обновлено ${formatDate(search.updatedAt)}`} />}
              <Stat label="Редиректов" value={content.redirects} />
            </div>
            <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(content.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => (
                  <li key={type} className="flex justify-between gap-3">
                    <span className="truncate text-slate-600">{type === 'html' ? 'Секции HTML' : (BLOCK_LABELS[type as Block['type']] ?? type)}</span>
                    <Badge>{n}</Badge>
                  </li>
                ))}
            </ul>
          </div>
        </details>
      )}
    </>
  );
}
