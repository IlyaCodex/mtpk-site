'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AreaChart, PALETTE, StackBar } from '@/components/charts';
import { Icon } from '@/components/icons';
import { toast } from '@/components/toast';
import { Badge, Button, Card, cx, formatDate, Stat } from '@/components/ui';
import { plural } from '@/lib/catalog';
import { api } from '@/lib/client-api';
import { CAMPAIGN_STATUS, duration, fmt, isLive, pct, RECIPIENT_STATUS, type Campaign, type CampaignReportData, type Preview, type Recipient } from '@/lib/mailing';
import { EmailPreview } from './EmailPreview';

const TZ = 'Asia/Yekaterinburg';
const LIMIT = 50;
const FILTERS = [
  { id: '', label: 'Все' },
  { id: 'sent', label: 'Отправлено' },
  { id: 'opened', label: 'Открыли' },
  { id: 'clicked', label: 'Перешли' },
  { id: 'failed', label: 'Ошибки' },
  { id: 'skipped', label: 'Пропущены' },
  { id: 'queued', label: 'В очереди' },
] as const;

/** Час «2026-10-13T15» (Екатеринбург) → следующий час в том же виде. */
const hourKey = (ms: number) => new Date(ms).toLocaleString('sv-SE', { timeZone: TZ }).slice(0, 13).replace(' ', 'T');
const hourMs = (key: string) => new Date(`${key}:00:00+05:00`).getTime();

/**
 * Переходы с часа перед запуском: первые трое суток — по часам, дальше — по дням;
 * пустые промежутки — нулями. Свежая рассылка — до текущего часа, старая — до последнего перехода.
 */
function clickPoints(byHour: CampaignReportData['byHour'], startedAt: string | null) {
  if (!byHour.length) return [];
  const map = new Map(byHour.map((h) => [h.hour, h.clicks]));
  const firstClick = hourMs(byHour[0]!.hour);
  const first = Math.min(firstClick, startedAt ? hourMs(hourKey(new Date(startedAt).getTime())) : firstClick) - 3_600_000;
  const now = hourMs(hourKey(Date.now()));
  const last = now - first <= 72 * 3_600_000 ? now : hourMs(byHour[byHour.length - 1]!.hour);
  const hours = Math.round((last - first) / 3_600_000) + 1;
  if (hours <= 72) {
    return Array.from({ length: hours }, (_, i) => {
      const key = hourKey(first + i * 3_600_000);
      const value = map.get(key) ?? 0;
      const [, m, rest] = key.split('-');
      const [d, hh] = rest!.split('T');
      return { label: `${hh}:00`, value, title: `${d}.${m} ${hh}:00 — ${value} ${plural(value, 'переход', 'перехода', 'переходов')}` };
    });
  }
  const days = new Map<string, number>();
  for (const h of byHour) days.set(h.hour.slice(0, 10), (days.get(h.hour.slice(0, 10)) ?? 0) + h.clicks);
  const n = Math.round(hours / 24) + 1;
  return Array.from({ length: n }, (_, i) => {
    const key = hourKey(first + i * 86_400_000).slice(0, 10);
    const value = days.get(key) ?? 0;
    const [, m, d] = key.split('-');
    return { label: `${d}.${m}`, value, title: `${d}.${m} — ${value} ${plural(value, 'переход', 'перехода', 'переходов')}` };
  });
}

export function CampaignReport({ campaign, listName, initial }: { campaign: Campaign; listName: string | null; initial: CampaignReportData }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<'clicks' | 'recipients' | 'letter'>('clicks');
  const [busy, setBusy] = useState(false);
  const { stats, status } = data;
  const live = isLive(status);
  const test = data.transport === 'log';
  const done = stats.sent + stats.failed + stats.skipped;
  const [label, tone] = CAMPAIGN_STATUS[status] ?? [status, 'gray'];

  const reload = useCallback(async () => {
    try {
      setData(await api<CampaignReportData>(`mailing/campaigns/${campaign.id}/stats`));
    } catch {
      // нет связи — попробуем при следующем обновлении
    }
  }, [campaign.id]);

  // пока рассылка идёт — счётчики обновляются сами
  useEffect(() => {
    if (!live) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [live, reload]);

  async function act(action: 'pause' | 'resume' | 'cancel' | 'unschedule') {
    if (action === 'cancel' && !confirm('Остановить рассылку? Неотправленные письма не уйдут, продолжить её будет нельзя (только копией).')) return;
    setBusy(true);
    try {
      await api(`mailing/campaigns/${campaign.id}/${action}`, { method: 'POST' });
      if (action === 'unschedule') {
        router.refresh();
        return;
      }
      await reload();
      toast.ok({ pause: 'Рассылка на паузе', resume: 'Отправка продолжается', cancel: 'Рассылка остановлена' }[action]);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    try {
      const copy = await api<{ id: number }>(`mailing/campaigns/${campaign.id}/duplicate`, { method: 'POST' });
      router.push(`/mailing/${copy.id}`);
    } catch (err) {
      toast.error(err);
    }
  }

  async function remove() {
    if (!confirm(`Удалить рассылку «${campaign.name}» вместе со статистикой?`)) return;
    try {
      await api(`mailing/campaigns/${campaign.id}`, { method: 'DELETE' });
      router.push('/mailing');
    } catch (err) {
      toast.error(err);
    }
  }

  const deletable = (status === 'sent' || status === 'cancelled') && (test || stats.sent === 0);

  return (
    <div className="-mx-8 -my-8">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-8 py-3 backdrop-blur">
        <nav className="mb-1 flex items-center gap-1 text-xs text-slate-500" aria-label="Раздел">
          <Link href="/mailing" className="inline-flex items-center gap-1 hover:text-brand-600">
            <Icon name="left" className="h-3.5 w-3.5" />
            Email-рассылки
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-slate-900">{campaign.name}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone={tone}>{label}</Badge>
              {test && <Badge tone="amber">тестовый режим — письма не уходили</Badge>}
              {campaign.listId && listName && (
                <Link href={`/mailing/lists/${campaign.listId}`} className="hover:text-brand-600">
                  база «{listName}»
                </Link>
              )}
              <span>· тема: {campaign.subject}</span>
            </div>
          </div>
          {status === 'scheduled' && (
            <Button onClick={() => act('unschedule')} disabled={busy}>
              Снять с расписания
            </Button>
          )}
          {status === 'sending' && (
            <Button onClick={() => act('pause')} disabled={busy}>
              Пауза
            </Button>
          )}
          {status === 'paused' && (
            <Button variant="primary" onClick={() => act('resume')} disabled={busy}>
              Продолжить
            </Button>
          )}
          {(live || status === 'paused') && (
            <Button variant="danger" onClick={() => act('cancel')} disabled={busy}>
              Остановить
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={duplicate} title="Новая рассылка с тем же письмом">
            <Icon name="copy" className="h-4 w-4" />
            Копия
          </Button>
          {deletable && (
            <Button variant="ghost" size="sm" onClick={remove} title="Удалить рассылку">
              <Icon name="trash" className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-6 px-8 py-6">
        <Progress campaign={campaign} data={data} done={done} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Получателей" value={fmt(stats.total || data.total)} hint={stats.skipped ? `пропущено ${fmt(stats.skipped)}: отписались после запуска или недоставляемы` : 'активные адреса базы на момент запуска'} />
          <Stat label="Отправлено" value={fmt(stats.sent)} hint={stats.failed ? `не доставлено: ${fmt(stats.failed)}` : stats.queued ? `в очереди ${fmt(stats.queued)}` : 'ошибок нет'} tone={stats.failed ? 'red' : undefined} />
          <Stat label="Открыли" value={`${pct(stats.opened, stats.sent)}%`} hint={`${fmt(stats.opened)} ${plural(stats.opened, 'получатель', 'получателя', 'получателей')}; часть почты прячет картинки — открытий больше`} />
          <Stat label="Перешли на сайт" value={`${pct(stats.clicked, stats.sent)}%`} hint={`${fmt(stats.clicked)} ${plural(stats.clicked, 'получатель', 'получателя', 'получателей')}`} tone={stats.clicked ? 'green' : undefined} />
          <Stat label="Переходов" value={fmt(stats.clicks)} hint={stats.clicked ? `${(stats.clicks / stats.clicked).toFixed(1).replace('.', ',')} на перешедшего` : 'по всем ссылкам письма'} />
        </div>

        <div className="flex gap-1 border-b border-slate-200">
          {(
            [
              ['clicks', 'Переходы по ссылкам'],
              ['recipients', 'Получатели'],
              ['letter', 'Письмо'],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cx(
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
                tab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
              )}
            >
              {text}
            </button>
          ))}
        </div>

        {tab === 'clicks' && <ClicksTab data={data} startedAt={campaign.startedAt} />}
        {tab === 'recipients' && <RecipientsTab campaignId={campaign.id} version={done + stats.opened + stats.clicks} />}
        {tab === 'letter' && <LetterTab campaign={campaign} />}
      </div>
    </div>
  );
}

/** Ход отправки: расписание, полоса прогресса, сколько осталось. */
function Progress({ campaign, data, done }: { campaign: Campaign; data: CampaignReportData; done: number }) {
  const { status, stats } = data;
  const total = stats.total || data.total;
  if (status === 'scheduled') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-900">
        <Icon name="today" className="h-5 w-5 text-brand-600" />
        Рассылка запланирована на <b>{formatDate(campaign.scheduledAt)}</b> (Екатеринбург). До запуска её можно снять с расписания и поправить письмо.
      </div>
    );
  }
  if (status === 'preparing') {
    return <div className="rounded-xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-900">Готовим список получателей и ссылки с метками…</div>;
  }
  const left = Math.max(0, total - done);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-800">
          {status === 'sent'
            ? `Отправлена ${formatDate(campaign.finishedAt)}`
            : status === 'cancelled'
              ? `Остановлена ${formatDate(campaign.finishedAt)}`
              : status === 'paused'
                ? 'На паузе'
                : 'Отправляется'}
          {campaign.startedAt && <span className="font-normal text-slate-500"> · начата {formatDate(campaign.startedAt)}</span>}
        </span>
        <span className="text-slate-500 tabular-nums">
          {fmt(done)} из {fmt(total)} ({pct(done, total)}%)
          {status === 'sending' && left > 0 && ` · осталось ${duration(left, campaign.rate)}`}
        </span>
      </div>
      <StackBar
        parts={[
          { label: 'отправлено', value: stats.sent, color: PALETTE[1] },
          { label: 'ошибка', value: stats.failed, color: PALETTE[5] },
          { label: 'пропущено', value: stats.skipped, color: PALETTE[2] },
          { label: 'в очереди', value: stats.queued, color: '#e2e8f0' },
        ]}
      />
    </div>
  );
}

function ClicksTab({ data, startedAt }: { data: CampaignReportData; startedAt: string | null }) {
  const points = useMemo(() => clickPoints(data.byHour, startedAt), [data.byHour, startedAt]);
  const sent = data.stats.sent;
  const maxClicks = Math.max(1, ...data.links.map((l) => l.clicks));
  return (
    <div className="space-y-6">
      {points.length > 0 && (
        <Card title="Переходы по времени">
          <AreaChart id="campaign-clicks" points={points} height={200} />
        </Card>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Ссылки письма" className="xl:col-span-2">
          {data.links.length ? (
            <div className="-mx-5 -my-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Ссылка</th>
                    <th className="px-3 py-2.5 text-right font-medium">Переходов</th>
                    <th className="px-3 py-2.5 text-right font-medium">Уникальных</th>
                    <th className="px-5 py-2.5 text-right font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.links.map((l) => (
                    <tr key={l.id}>
                      <td className="max-w-md px-5 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-800">{l.label || 'без текста'}</span>
                          {l.utmContent && <Badge tone="blue">{l.utmContent}</Badge>}
                        </div>
                        <a href={l.target} target="_blank" rel="noopener" className="block truncate font-mono text-xs text-slate-500 hover:text-brand-600" title={l.target}>
                          {l.target}
                        </a>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(l.clicks / maxClicks) * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(l.clicks)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(l.uniqueClicks)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{sent ? `${pct(l.uniqueClicks, sent)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">В письме не было отслеживаемых ссылок.</p>
          )}
        </Card>
        <Card title="Последние переходы">
          {data.recent.length ? (
            <ol className="space-y-2.5">
              {data.recent.slice(0, 15).map((r, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-slate-800">{r.recipient?.email ?? 'получатель удалён'}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(r.at)}</span>
                  </div>
                  <div className="truncate text-xs text-slate-500">→ {r.link.label || r.link.utmContent}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">Переходов пока нет.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecipientsTab({ campaignId, version }: { campaignId: number; version: number }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<{ total: number; items: Recipient[] } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) });
    if (filter) q.set('status', filter);
    if (query) q.set('search', query);
    let stale = false;
    api<{ total: number; items: Recipient[] }>(`mailing/campaigns/${campaignId}/recipients?${q}`)
      .then((r) => !stale && setRows(r))
      .catch((err) => !stale && toast.error(err));
    return () => {
      stale = true;
    };
  }, [campaignId, filter, query, offset, version]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-xs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => (setFilter(f.id), setOffset(0))}
              className={cx('rounded-md px-2.5 py-1 font-medium transition', f.id === filter ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
            setOffset(0);
          }}
        >
          <input className="field w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Адрес или имя" />
          <Button type="submit">Найти</Button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              {['Получатель', 'Статус', 'Отправлено', 'Открыл', 'Перешёл', 'Переходов'].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows?.items.map((r) => {
              const [text, tone] = RECIPIENT_STATUS[r.status] ?? [r.status, 'gray'];
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{r.email}</div>
                    {r.name && <div className="text-xs text-slate-500">{r.name}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={tone}>{text}</Badge>
                    {r.error && <div className="mt-1 max-w-xs truncate text-xs text-red-600" title={r.error}>{r.error}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(r.sentAt)}</td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(r.openedAt)}</td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(r.clickedAt)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.clicks || '—'}</td>
                </tr>
              );
            })}
            {rows && !rows.items.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  Никого не найдено.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows && rows.total > LIMIT && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            {offset + 1}–{Math.min(offset + LIMIT, rows.total)} из {fmt(rows.total)}
          </span>
          <div className="flex gap-2">
            <Button size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
              <Icon name="chevronLeft" className="h-4 w-4" />
              Назад
            </Button>
            <Button size="sm" disabled={offset + LIMIT >= rows.total} onClick={() => setOffset(offset + LIMIT)}>
              Вперёд
              <Icon name="chevronRight" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Письмо, как его получили (ссылки — сразу на адреса с метками). */
function LetterTab({ campaign }: { campaign: Campaign }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    api<Preview>(`mailing/campaigns/${campaign.id}/render`, { json: {} })
      .then(setPreview)
      .catch((err) => toast.error(err));
  }, [campaign.id]);
  return (
    <div className="max-w-4xl">
      <EmailPreview html={preview?.html ?? ''} subject={campaign.subject} preheader={campaign.preheader} fromName={campaign.fromName} fromEmail={campaign.fromEmail} loading={!preview} />
    </div>
  );
}
