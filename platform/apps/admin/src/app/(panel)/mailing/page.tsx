import type { Metadata } from 'next';
import Link from 'next/link';
import { AreaChart } from '@/components/charts';
import { Badge, EmptyState, formatDate, PageHeader, Stat, Table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { plural } from '@/lib/catalog';
import { CAMPAIGN_STATUS, fmt, pct, type CampaignRow, type MailingSummary } from '@/lib/mailing';
import { serviceJson } from '@/lib/services';
import { MailingTabs, TestModeNote } from './MailingTabs';
import { NewCampaignButton } from './NewButtons';

export const metadata: Metadata = { title: 'Email-рассылки' };

const TZ = 'Asia/Yekaterinburg';

/** Переходы по дням за 30 дней — с нулями в днях без переходов. */
function clickSeries(byDay: MailingSummary['clicksByDay']) {
  const map = new Map(byDay.map((d) => [d.day, d.clicks]));
  return Array.from({ length: 30 }, (_, i) => {
    const key = new Date(Date.now() - (29 - i) * 86_400_000).toLocaleDateString('sv-SE', { timeZone: TZ });
    const value = map.get(key) ?? 0;
    const [, m, d] = key.split('-');
    return { label: `${d}.${m}`, value, title: `${d}.${m}: ${value} ${plural(value, 'переход', 'перехода', 'переходов')}` };
  });
}

export default async function MailingPage() {
  const user = await requireUser('mailing');
  const [summary, campaigns] = await Promise.all([
    serviceJson<MailingSummary>('mailing', 'summary', { user }),
    serviceJson<CampaignRow[]>('mailing', 'campaigns', { user }),
  ]);
  const { contacts, last30 } = summary;
  const series = clickSeries(summary.clicksByDay);

  return (
    <>
      <PageHeader
        title="Email-рассылки"
        description="Письма по базам адресов: из заявок сайта, файлов Excel и TXT, CRM Битрикс24. К ссылкам письма система сама добавляет UTM-метки, переходы считаются — статистика здесь и на «Обзоре», визиты — в Метрике."
        actions={<NewCampaignButton />}
      />
      <MailingTabs active="campaigns" />
      {!summary.sendsForReal && <TestModeNote />}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Адресов для рассылок"
          value={fmt(contacts.active)}
          hint={`в ${summary.lists} ${plural(summary.lists, 'базе', 'базах', 'базах')} · отписались ${fmt(contacts.unsubscribed)} · недоставляемых ${fmt(contacts.bounced)}`}
        />
        <Stat label="Отправлено за 30 дней" value={fmt(last30.sent)} hint={plural(last30.sent, 'письмо', 'письма', 'писем')} />
        <Stat label="Открыли" value={`${pct(last30.opened, last30.sent)}%`} hint={`${fmt(last30.opened)} из ${fmt(last30.sent)} за 30 дней`} />
        <Stat label="Перешли на сайт" value={`${pct(last30.clicked, last30.sent)}%`} hint={`${fmt(last30.clicked)} ${plural(last30.clicked, 'получатель', 'получателя', 'получателей')} · ${fmt(last30.clicks)} ${plural(last30.clicks, 'переход', 'перехода', 'переходов')}`} tone={last30.clicked ? 'green' : undefined} />
      </div>

      {last30.clicks > 0 && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Переходы из писем за 30 дней</h2>
          <AreaChart id="mailing-clicks" points={series} height={200} />
        </section>
      )}

      {campaigns.length ? (
        <Table head={['Рассылка', 'База', 'Статус', 'Отправлено', 'Открыли', 'Перешли', 'Дата']}>
          {campaigns.map((c) => {
            const [label, tone] = CAMPAIGN_STATUS[c.status] ?? [c.status, 'gray'];
            const s = c.stats;
            const done = s.sent + s.failed + s.skipped;
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="max-w-md px-4 py-2.5">
                  <Link href={`/mailing/${c.id}`} className="font-medium text-brand-600 hover:underline">
                    {c.name}
                  </Link>
                  <div className="truncate text-xs text-slate-500">{c.subject || 'без темы'}</div>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{c.listName ?? '—'}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Badge tone={tone}>{label}</Badge>
                  {c.transport === 'log' && c.status !== 'draft' && (
                    <span className="ml-1.5">
                      <Badge>тест</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  {s.total ? (
                    <>
                      <div className="text-sm">
                        {fmt(s.sent)} <span className="text-slate-400">из {fmt(s.total)}</span>
                      </div>
                      {done < s.total && (
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct(done, s.total)}%` }} />
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{s.sent ? `${pct(s.opened, s.sent)}%` : '—'}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {s.sent ? (
                    <>
                      {pct(s.clicked, s.sent)}% <span className="text-xs text-slate-400">· {fmt(s.clicks)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">
                  {c.status === 'scheduled' ? `на ${formatDate(c.scheduledAt)}` : formatDate(c.startedAt ?? c.updatedAt)}
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState>
          Рассылок пока нет. Сначала соберите базу адресов во вкладке «Базы адресов», затем нажмите «Новая рассылка» — письмо создастся из фирменного шаблона.
        </EmptyState>
      )}
    </>
  );
}
