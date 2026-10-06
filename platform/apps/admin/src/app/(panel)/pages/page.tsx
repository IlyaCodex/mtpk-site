import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, formatDate, LinkButton, PageHeader, Pager, Table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { serviceJson } from '@/lib/services';

export const metadata: Metadata = { title: 'Страницы' };

type Row = {
  id: number;
  path: string;
  title: string;
  kind: 'page' | 'document';
  template: string;
  status: string;
  noindex: boolean;
  source: string;
  blocks: number;
  htmlBlocks: number;
  updatedAt: string;
};
type Search = { search?: string; template?: string; status?: string; kind?: string; offset?: string };

const LIMIT = 50;

export default async function PagesList({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser('content');
  const sp = await searchParams;
  const offset = Math.max(0, Number(sp.offset ?? 0) || 0);
  const query = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) });
  for (const k of ['search', 'template', 'status', 'kind'] as const) if (sp[k]) query.set(k, sp[k]!);

  const [list, templates] = await Promise.all([
    serviceJson<{ total: number; items: Row[] }>('content', `pages?${query}`, { user }),
    serviceJson<{ template: string; count: number }[]>('content', 'pages/templates', { user }),
  ]);
  const href = (patch: Partial<Search>) => {
    const q = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/pages?${q}`;
  };
  const site = env().PUBLIC_SITE_URL;

  return (
    <>
      <PageHeader
        title="Страницы"
        description="Все страницы сайта. Содержимое страницы — список блоков: у карточек товара, характеристик, каталогов, FAQ свои поля, остальные секции пока редактируются как HTML."
        actions={
          <LinkButton href="/pages/new" variant="primary">
            + Новая страница
          </LinkButton>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" action="/pages">
        <input name="search" defaultValue={sp.search} placeholder="Адрес или заголовок" className="field max-w-80" />
        <select name="template" defaultValue={sp.template ?? ''} className="field max-w-56">
          <option value="">Все типы</option>
          {templates.map((t) => (
            <option key={t.template} value={t.template}>
              {t.template} ({t.count})
            </option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className="field max-w-48">
          <option value="">Любой статус</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
        </select>
        <button className="rounded-lg bg-slate-800 px-4 text-sm text-white hover:bg-slate-700">Найти</button>
        {(sp.search || sp.template || sp.status) && (
          <Link href="/pages" className="self-center text-sm text-slate-500 hover:underline">
            сбросить
          </Link>
        )}
      </form>

      {list.items.length ? (
        <Table head={['Страница', 'Тип', 'Блоки', 'Источник', 'Изменена', '']}>
          {list.items.map((p) => {
            const typed = p.blocks ? Math.round(((p.blocks - p.htmlBlocks) / p.blocks) * 100) : 0;
            return (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="max-w-md px-4 py-2.5">
                  {p.kind === 'page' ? (
                    <Link href={`/pages/${p.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-600">
                      {p.title.split('|')[0].trim() || p.path}
                    </Link>
                  ) : (
                    <span className="block truncate font-medium text-slate-900">{p.title || p.path}</span>
                  )}
                  <span className="block truncate font-mono text-xs text-slate-500">{p.path}</span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Badge>{p.template}</Badge>
                  {p.status === 'draft' && (
                    <span className="ml-1">
                      <Badge tone="amber">черновик</Badge>
                    </span>
                  )}
                  {p.noindex && (
                    <span className="ml-1">
                      <Badge tone="gray">noindex</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {p.kind === 'page' ? (
                    <div className="w-28" title={`${p.blocks - p.htmlBlocks} из ${p.blocks} блоков с полями`}>
                      <div className="h-1.5 overflow-hidden rounded-full bg-amber-100">
                        <div className="h-full bg-accent-500" style={{ width: `${typed}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">
                        {p.blocks} · {typed}% с полями
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">статья Практикума</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{p.source === 'admin' ? 'правки в админке' : 'перенос'}</td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(p.updatedAt)}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <a href={`${site}${p.path}`} target="_blank" rel="noopener" className="text-xs text-brand-600 hover:underline">
                    на сайте ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState>Ничего не нашлось.</EmptyState>
      )}
      <Pager total={list.total} offset={offset} limit={LIMIT} href={(o) => href({ offset: String(o) })} />
    </>
  );
}
