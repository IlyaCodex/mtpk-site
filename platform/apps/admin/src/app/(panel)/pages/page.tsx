import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoSubmitForm } from '@/components/AutoSubmitForm';
import { Badge, EmptyState, formatDate, LinkButton, PageHeader, Pager } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { PAGE_TYPES, SITE_GROUPS, typeLabel, type SiteGroup } from '@/lib/catalog';
import { env } from '@/lib/env';
import { serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Все страницы' };

type Row = {
  id: number;
  path: string;
  title: string;
  kind: 'page' | 'document';
  template: string;
  status: string;
  noindex: boolean;
  source: string;
  updatedAt: string;
};
type Search = { search?: string; group?: string; template?: string; status?: string; offset?: string };

const LIMIT = 50;
const templatesOf = (group: string) => Object.keys(PAGE_TYPES).filter((t) => PAGE_TYPES[t].group === group);

export default async function PagesList({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser('content');
  const sp = await searchParams;
  const offset = Math.max(0, Number(sp.offset ?? 0) || 0);
  const query = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) });
  if (sp.search) query.set('search', sp.search);
  if (sp.status) query.set('status', sp.status);
  // тип из другого раздела (раздел сменили) не учитываем
  const template = sp.template && (!sp.group || PAGE_TYPES[sp.template]?.group === sp.group) ? sp.template : undefined;
  if (template) query.set('template', template);
  else if (sp.group) query.set('template', templatesOf(sp.group).join(','));

  const [list, templates] = await Promise.all([
    serviceJson<{ total: number; items: Row[] }>('content', `pages?${query}`, { user }),
    serviceJson<{ template: string; count: number }[]>('content', 'pages/templates', { user }),
  ]);
  const href = (patch: Partial<Search>) => {
    const q = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/pages?${q}`;
  };
  const site = env().PUBLIC_SITE_URL;
  const counts = new Map(templates.map((t) => [t.template, t.count]));
  const groupCount = (g: string) => templatesOf(g).reduce((n, t) => n + (counts.get(t) ?? 0), 0);
  const typeOptions = templates
    .filter((t) => !sp.group || PAGE_TYPES[t.template]?.group === sp.group)
    .sort((a, b) => typeLabel(a.template).localeCompare(typeLabel(b.template), 'ru'));

  return (
    <>
      <PageHeader
        title="Все страницы"
        description="Все страницы сайта по разделам. Товары и запчасти удобнее искать в «Каталоге продукции»."
        actions={
          <LinkButton href="/pages/new" variant="primary">
            + Новая страница
          </LinkButton>
        }
      />

      <AutoSubmitForm className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs" action="/pages">
        <label className="block w-56">
          <span className="mb-1 block text-xs font-medium text-slate-500">Раздел сайта</span>
          <select name="group" defaultValue={sp.group ?? ''} className="field">
            <option value="">Все разделы</option>
            {(Object.keys(SITE_GROUPS) as SiteGroup[]).map((g) => (
              <option key={g} value={g}>
                {SITE_GROUPS[g]} · {groupCount(g)}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-60">
          <span className="mb-1 block text-xs font-medium text-slate-500">Тип страницы</span>
          <select name="template" defaultValue={template ?? ''} className="field">
            <option value="">Все типы</option>
            {typeOptions.map((t) => (
              <option key={t.template} value={t.template}>
                {typeLabel(t.template)} · {t.count}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-500">Поиск</span>
          <input name="search" defaultValue={sp.search} placeholder="Название или адрес страницы" className="field" />
        </label>
        <label className="block w-44">
          <span className="mb-1 block text-xs font-medium text-slate-500">Статус</span>
          <select name="status" defaultValue={sp.status ?? ''} className="field">
            <option value="">Любой</option>
            <option value="published">На сайте</option>
            <option value="draft">Черновики</option>
          </select>
        </label>
        <button className="h-9 rounded-lg bg-slate-800 px-5 text-sm font-medium text-white hover:bg-slate-700">Найти</button>
        {(sp.search || sp.group || sp.template || sp.status) && (
          <Link href="/pages" className="h-9 self-end px-1 text-sm leading-9 text-slate-500 hover:text-slate-800 hover:underline">
            Сбросить
          </Link>
        )}
      </AutoSubmitForm>

      <div className="mb-2 text-sm font-semibold text-slate-700">Найдено: {list.total}</div>
      {list.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Страница</th>
                <th className="px-4 py-2.5 font-medium">Тип</th>
                <th className="px-4 py-2.5 font-medium">Статус</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Изменена</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="max-w-xl px-4 py-2.5">
                    {p.kind === 'page' ? (
                      <Link href={`/pages/${p.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-600">
                        {p.title.split('|')[0].trim() || p.path}
                      </Link>
                    ) : (
                      <span className="block truncate font-medium text-slate-900">{p.title.split('|')[0].trim() || p.path}</span>
                    )}
                    <span className="block truncate font-mono text-xs text-slate-500">{p.path}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Badge>{typeLabel(p.template)}</Badge>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {p.status === 'published' ? <Badge tone="green">На сайте</Badge> : <Badge tone="amber">Черновик</Badge>}
                    {p.noindex && (
                      <span className="ml-1" title="Скрыта от поисковиков">
                        <Badge tone="gray">скрыта от поиска</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {p.kind === 'page' ? (
                      <LinkButton size="sm" href={`/pages/${p.id}`}>
                        Изменить
                      </LinkButton>
                    ) : (
                      <span className="text-xs text-slate-400" title="Статьи Практикума — готовые документы, правятся в исходниках">
                        только просмотр
                      </span>
                    )}
                    <a href={`${site}${p.path}`} target="_blank" rel="noopener" className="ml-3 text-xs text-brand-600 hover:underline" title="Открыть на сайте">
                      ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>Ничего не нашлось.</EmptyState>
      )}
      <Pager total={list.total} offset={offset} limit={LIMIT} href={(o) => href({ offset: String(o) })} />
    </>
  );
}
