'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { Modal } from '@/components/media';
import { toast } from '@/components/toast';
import { Badge, Button, Card, cx, Field, formatDate, Stat } from '@/components/ui';
import { withBase } from '@/lib/base-path';
import { plural } from '@/lib/catalog';
import { api } from '@/lib/client-api';
import { CAMPAIGN_STATUS, CONTACT_SOURCE, CONTACT_STATUS, fmt, type AddResult, type Contact, type ImportJob, type ImportReport, type MailListFull } from '@/lib/mailing';

const LIMIT = 50;
const METHODS = [
  { id: 'file', label: 'Файл Excel, CSV, TXT', icon: 'form' },
  { id: 'text', label: 'Вставить списком', icon: 'textPlain' },
  { id: 'leads', label: 'Из заявок сайта', icon: 'leads' },
  { id: 'crm', label: 'Из CRM Битрикс24', icon: 'handshake' },
] as const;
const CRM_KINDS = [
  { id: 'contact', label: 'Контакты' },
  { id: 'company', label: 'Компании' },
  { id: 'lead', label: 'Лиды' },
] as const;

const addresses = (n: number) => `${fmt(n)} ${plural(n, 'адрес', 'адреса', 'адресов')}`;

/** Итог пополнения базы — одной строкой для уведомления. */
function resultText(r: AddResult): string {
  const parts = [`Добавлено ${addresses(r.added)}`];
  if (r.created) parts.push(`новых контактов — ${fmt(r.created)}`);
  if (r.already) parts.push(`уже были в базе — ${fmt(r.already)}`);
  if (r.unsubscribed) parts.push(`отписались раньше или недоставляемы — ${fmt(r.unsubscribed)} (писем не получат)`);
  return parts.join(', ');
}

export function ListManager({ initial, crmConnected }: { initial: MailListFull; crmConnected: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('file');
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setList(await api<MailListFull>(`mailing/lists/${initial.id}`));
      setVersion((v) => v + 1);
    } catch (err) {
      toast.error(err);
    }
  }, [initial.id]);

  async function remove() {
    if (!confirm(`Удалить базу «${list.name}»? Адреса останутся в других базах; отписки сохраняются.`)) return;
    try {
      await api(`mailing/lists/${list.id}`, { method: 'DELETE' });
      router.push('/mailing/lists');
    } catch (err) {
      toast.error(err);
    }
  }

  const { counts } = list;
  return (
    <>
      <nav className="mb-2 text-xs text-slate-500">
        <Link href="/mailing/lists" className="inline-flex items-center gap-1 hover:text-brand-600">
          <Icon name="left" className="h-3.5 w-3.5" />
          Базы адресов
        </Link>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            {list.name}
            <button type="button" onClick={() => setEditing(true)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Переименовать" aria-label="Переименовать">
              <Icon name="pen" className="h-4 w-4" />
            </button>
          </h1>
          {list.description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{list.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={withBase(`/api/v1/mailing/lists/${list.id}/export`)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50">
            <Icon name="down" className="h-4 w-4" />
            Скачать CSV
          </a>
          <Button variant="danger" onClick={remove}>
            <Icon name="trash" className="h-4 w-4" />
            Удалить базу
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Адресов в базе" value={fmt(counts.total)} />
        <Stat label="Получат письмо" value={fmt(counts.active)} tone={counts.active ? 'green' : undefined} hint="активные адреса" />
        <Stat label="Отписались" value={fmt(counts.unsubscribed)} hint="по ссылке в письме или вручную" />
        <Stat label="Недоставляемы" value={fmt(counts.bounced)} hint="почтовый сервер ответил: адреса нет" tone={counts.bounced ? 'red' : undefined} />
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-xs">
        <header className="border-b border-slate-100 px-5 pt-3">
          <h2 className="text-sm font-semibold text-slate-800">Пополнить базу</h2>
          <div className="mt-2 flex flex-wrap gap-1">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cx(
                  '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition',
                  m.id === method ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
                )}
              >
                <Icon name={m.icon} className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>
        </header>
        <div className="p-5">
          {method === 'file' && <FileImport listId={list.id} onDone={refresh} />}
          {method === 'text' && <TextImport listId={list.id} onDone={refresh} />}
          {method === 'leads' && <LeadsImport listId={list.id} onDone={refresh} />}
          {method === 'crm' && <CrmImport listId={list.id} connected={crmConnected} running={list.imports.find((i) => i.status === 'running') ?? null} onDone={refresh} />}
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Members listId={list.id} version={version} onChange={refresh} />
        <div className="space-y-6">
          <Card title="Рассылки по базе">
            {list.campaigns.length ? (
              <ul className="space-y-2 text-sm">
                {list.campaigns.map((c) => {
                  const [label, tone] = CAMPAIGN_STATUS[c.status] ?? [c.status, 'gray'];
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <Link href={`/mailing/${c.id}`} className="truncate text-brand-600 hover:underline">
                        {c.name}
                      </Link>
                      <Badge tone={tone}>{label}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">По этой базе рассылок ещё не было.</p>
            )}
          </Card>
          {list.imports.length > 0 && (
            <Card title="Загрузки из CRM">
              <ul className="space-y-2 text-sm">
                {list.imports.map((i) => (
                  <li key={i.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">{formatDate(i.startedAt)}</span>
                      <Badge tone={i.status === 'done' ? 'green' : i.status === 'failed' ? 'red' : 'blue'}>{i.status === 'done' ? 'готово' : i.status === 'failed' ? 'ошибка' : 'идёт'}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      просмотрено {fmt(i.processed)}, добавлено {fmt(i.added)}
                      {i.error && <span className="block text-red-600">{i.error}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {editing && (
        <RenameDialog
          list={list}
          onClose={() => setEditing(false)}
          onSave={async (name, description) => {
            await api(`mailing/lists/${list.id}`, { method: 'PUT', json: { name, description } });
            setEditing(false);
            await refresh();
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/** Что нашлось в файле или тексте — до загрузки в базу. */
function ReportView({ report }: { report: ImportReport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          Найдено: <b className="tabular-nums">{addresses(report.found)}</b>
        </span>
        {report.rows > 0 && <span className="text-slate-500">строк: {fmt(report.rows)}</span>}
        {report.duplicates > 0 && <span className="text-slate-500">повторов убрано: {fmt(report.duplicates)}</span>}
        {report.invalid > 0 && <span className="text-amber-700">с ошибкой (пропущены): {fmt(report.invalid)}</span>}
      </div>
      {report.note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{report.note}</p>}
      {report.sample.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['E-mail', 'Имя', 'Компания', 'Телефон'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.sample.map((c) => (
                <tr key={c.email}>
                  <td className="px-3 py-1.5 font-medium">{c.email}</td>
                  <td className="px-3 py-1.5">{c.name ?? '—'}</td>
                  <td className="px-3 py-1.5">{c.company ?? '—'}</td>
                  <td className="px-3 py-1.5">{c.phone ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.found > report.sample.length && <div className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">первые {report.sample.length} из {fmt(report.found)}</div>}
        </div>
      )}
    </div>
  );
}

function FileImport({ listId, onDone }: { listId: number; onDone: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(f: File, dry: boolean): Promise<ImportReport> {
    const body = new FormData();
    body.append('file', f);
    return api<ImportReport>(`mailing/lists/${listId}/import-file${dry ? '?dry=1' : ''}`, { body });
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) return toast.error('Файл больше 25 МБ — разделите его на части.');
    setFile(f);
    setReport(null);
    setBusy(true);
    try {
      setReport(await upload(f, true));
    } catch (err) {
      toast.error(err);
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!file) return;
    setBusy(true);
    try {
      const r = await upload(file, false);
      toast.ok(r.result ? resultText(r.result) : 'Адресов не найдено');
      setFile(null);
      setReport(null);
      await onDone();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!report && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void pick(e.dataTransfer.files[0]);
          }}
          className={cx(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
            over ? 'border-brand-400 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40',
          )}
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-xs">
            <Icon name="up" className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-slate-800">{busy ? `Читаю «${file?.name}»…` : 'Перетащите файл сюда или нажмите, чтобы выбрать'}</span>
          <span className="max-w-xl text-xs text-slate-500">
            Excel (.xlsx, .xls), CSV или TXT, до 25 МБ. Колонки «E-mail», «Имя», «Компания», «Телефон» найдутся по заголовкам; без заголовков адреса ищутся во всех ячейках. Выгрузка из
            Битрикс24 и 1С (Windows-1251) читается как есть.
          </span>
          <input ref={input} type="file" accept=".xlsx,.xls,.csv,.txt,.tsv" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        </div>
      )}
      {report && file && (
        <>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Icon name="form" className="h-4 w-4" />
            {file.name}
          </div>
          <ReportView report={report} />
          <div className="flex gap-2">
            <Button variant="primary" onClick={confirmImport} disabled={busy || !report.found}>
              {busy ? 'Загружаю…' : `Добавить ${addresses(report.found)} в базу`}
            </Button>
            <Button onClick={() => (setFile(null), setReport(null))} disabled={busy}>
              Другой файл
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function TextImport({ listId, onDone }: { listId: number; onDone: () => Promise<void> }) {
  const [text, setText] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(dry: boolean) {
    setBusy(true);
    try {
      const r = await api<ImportReport>(`mailing/lists/${listId}/import-text${dry ? '?dry=1' : ''}`, { json: { text } });
      if (dry) setReport(r);
      else {
        toast.ok(r.result ? resultText(r.result) : 'Адресов не найдено');
        setText('');
        setReport(null);
        await onDone();
      }
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Адреса" hint="По одному на строку или через запятую; можно «Иван Петров <ivan@example.com>» или «Имя; адрес» — имя подставится в письмо.">
        <textarea
          className="field min-h-40 font-mono text-sm"
          value={text}
          onChange={(e) => (setText(e.target.value), setReport(null))}
          placeholder={'ivan@example.com\nПётр Сидоров <petr@example.com>\nsnab@example.org, info@example.net'}
        />
      </Field>
      {report && <ReportView report={report} />}
      <div className="flex gap-2">
        {report ? (
          <Button variant="primary" onClick={() => run(false)} disabled={busy || !report.found}>
            {busy ? 'Добавляю…' : `Добавить ${addresses(report.found)}`}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => run(true)} disabled={busy || !text.trim()}>
            {busy ? 'Проверяю…' : 'Проверить'}
          </Button>
        )}
      </div>
    </div>
  );
}

function LeadsImport({ listId, onDone }: { listId: number; onDone: () => Promise<void> }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // границы периода — начало первого и конец последнего дня по часам компьютера
  const period = { ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}), ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}) };
  const key = JSON.stringify(period);

  useEffect(() => {
    let stale = false;
    setCount(null);
    api<{ count: number }>(`mailing/leads-emails?${new URLSearchParams(JSON.parse(key) as Record<string, string>)}`)
      .then((r) => !stale && setCount(r.count))
      .catch((err) => !stale && toast.error(err));
    return () => {
      stale = true;
    };
  }, [key]);

  async function run() {
    setBusy(true);
    try {
      const r = await api<{ found: number; result: AddResult | null }>(`mailing/lists/${listId}/import-leads`, { json: period });
      toast.ok(r.result ? resultText(r.result) : 'В заявках за этот период адресов нет');
      await onDone();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Адреса клиентов, которые оставили заявку на сайте и указали e-mail, — с именем и телефоном из заявки. Повторный запуск добавит только новые адреса: так базу удобно пополнять раз
        в неделю или месяц.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <Field label="С даты">
          <input type="date" className="field w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="По дату">
          <input type="date" className="field w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="pb-2 text-sm text-slate-600">{count === null ? 'Считаю…' : count ? <>В заявках {from || to ? 'за период' : 'за всё время'}: <b>{addresses(count)}</b></> : 'В заявках за период адресов нет'}</div>
      </div>
      <Button variant="primary" onClick={run} disabled={busy || !count}>
        {busy ? 'Добавляю…' : count ? `Добавить ${addresses(count)} из заявок` : 'Добавить из заявок'}
      </Button>
    </div>
  );
}

function CrmImport({ listId, connected, running, onDone }: { listId: number; connected: boolean; running: ImportJob | null; onDone: () => Promise<void> }) {
  const [kinds, setKinds] = useState<string[]>(['contact', 'company']);
  const [job, setJob] = useState<ImportJob | null>(running);
  const [busy, setBusy] = useState(false);

  // загрузка идёт в фоне на сервере — показываем ход, пока не закончится
  useEffect(() => {
    if (!job || job.status !== 'running') return;
    const t = setInterval(async () => {
      try {
        const next = await api<ImportJob>(`mailing/imports/${job.id}`);
        setJob(next);
        if (next.status === 'done') {
          toast.ok(`Загрузка из CRM закончена: добавлено ${addresses(next.added)}`);
          await onDone();
        } else if (next.status === 'failed') {
          toast.error(`Загрузка из CRM прервалась: ${next.error ?? 'ошибка'}`);
          await onDone();
        }
      } catch {
        // связь пропала — спросим ещё раз
      }
    }, 2000);
    return () => clearInterval(t);
  }, [job, onDone]);

  if (!connected) {
    return (
      <div className="flex gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <Icon name="handshake" className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <div className="font-medium text-slate-900">CRM не подключена</div>
          <p className="mt-1">
            Для загрузки на сервере задаётся входящий вебхук Битрикс24 (переменная B24_WEBHOOK — тот же, что передаёт заявки) с правом «CRM». После этого здесь можно забрать
            контакты, компании и лиды с e-mail: 15 000 адресов загружаются в фоне за 5–10 минут, повторы не задваиваются.
          </p>
          <p className="mt-2 text-slate-500">Пока вебхука нет — выгрузите список из Битрикс24 в Excel и загрузите файлом во вкладке «Файл Excel, CSV, TXT».</p>
        </div>
      </div>
    );
  }

  async function start() {
    setBusy(true);
    try {
      const { importId } = await api<{ importId: number }>(`mailing/lists/${listId}/import-crm`, { json: { kinds } });
      setJob(await api<ImportJob>(`mailing/imports/${importId}`));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Забирает из Битрикс24 всех, у кого заполнен e-mail, — с именем, компанией и телефоном. Идёт в фоне: страницу можно закрыть. Повторный запуск добавит только новых.
      </p>
      {job?.status === 'running' ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <div className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
            Загружаю из CRM…
          </div>
          <div className="mt-1 tabular-nums">
            просмотрено записей: {fmt(job.processed)} · добавлено в базу: {fmt(job.added)}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {CRM_KINDS.map((k) => (
              <label key={k.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={kinds.includes(k.id)} onChange={(e) => setKinds(e.target.checked ? [...kinds, k.id] : kinds.filter((x) => x !== k.id))} />
                {k.label}
              </label>
            ))}
          </div>
          {job && (
            <p className={cx('text-sm', job.status === 'failed' ? 'text-red-600' : 'text-slate-600')}>
              {job.status === 'failed' ? `Прошлая загрузка прервалась: ${job.error}` : `Прошлая загрузка: просмотрено ${fmt(job.processed)}, добавлено ${addresses(job.added)}.`}
            </p>
          )}
          <Button variant="primary" onClick={start} disabled={busy || !kinds.length}>
            {busy ? 'Запускаю…' : 'Загрузить из CRM'}
          </Button>
        </>
      )}
    </div>
  );
}

function Members({ listId, version, onChange }: { listId: number; version: number; onChange: () => Promise<void> }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<{ total: number; items: Contact[] } | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) });
    if (status) q.set('status', status);
    if (query) q.set('search', query);
    let stale = false;
    api<{ total: number; items: Contact[] }>(`mailing/lists/${listId}/members?${q}`)
      .then((r) => {
        if (stale) return;
        setRows(r);
        setSelected([]);
      })
      .catch((err) => !stale && toast.error(err));
    return () => {
      stale = true;
    };
  }, [listId, status, query, offset, version, reload]);

  async function removeSelected() {
    if (!confirm(`Убрать из базы ${addresses(selected.length)}? Из других баз они не пропадут.`)) return;
    try {
      const r = await api<{ removed: number }>(`mailing/lists/${listId}/remove`, { json: { ids: selected } });
      toast.ok(`Убрано: ${addresses(r.removed)}`);
      setReload((n) => n + 1);
      await onChange();
    } catch (err) {
      toast.error(err);
    }
  }

  const all = rows?.items ?? [];
  const allChecked = all.length > 0 && all.every((c) => selected.includes(c.id));
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold text-slate-800">Адреса в базе{rows ? ` — ${fmt(rows.total)}` : ''}</h2>
        {selected.length > 0 && (
          <Button variant="danger" size="sm" onClick={removeSelected}>
            Убрать из базы ({selected.length})
          </Button>
        )}
        <select className="field w-auto" value={status} onChange={(e) => (setStatus(e.target.value), setOffset(0))}>
          <option value="">Все</option>
          <option value="active">Получат письмо</option>
          <option value="unsubscribed">Отписались</option>
          <option value="bounced">Недоставляемы</option>
        </select>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
            setOffset(0);
          }}
        >
          <input className="field w-56" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Адрес, имя, компания" />
          <Button type="submit">Найти</Button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" aria-label="Выбрать все на странице" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? all.map((c) => c.id) : [])} />
              </th>
              {['E-mail', 'Имя и компания', 'Телефон', 'Статус', 'Откуда', 'Добавлен'].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {all.map((c) => {
              const [label, tone] = CONTACT_STATUS[c.status] ?? [c.status, 'gray'];
              return (
                <tr key={c.id} className={selected.includes(c.id) ? 'bg-brand-50/50' : undefined}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Выбрать ${c.email}`}
                      checked={selected.includes(c.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter((x) => x !== c.id))}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium">{c.email}</td>
                  <td className="px-4 py-2">
                    <div>{c.name ?? <span className="text-slate-400">—</span>}</div>
                    {c.company && <div className="text-xs text-slate-500">{c.company}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{CONTACT_SOURCE[c.source] ?? c.source}</td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-500">{formatDate(c.addedAt)}</td>
                </tr>
              );
            })}
            {rows && !all.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  {query || status ? 'Никого не найдено.' : 'База пуста — пополните её выше.'}
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
    </section>
  );
}

function RenameDialog({ list, onClose, onSave }: { list: MailListFull; onClose: () => void; onSave: (name: string, description: string) => Promise<void> }) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="База адресов" onClose={onClose} width="max-w-lg">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(name.trim(), description.trim());
          } catch (err) {
            toast.error(err);
            setBusy(false);
          }
        }}
      >
        <Field label="Название">
          <input autoFocus className="field" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Описание" hint="Откуда адреса и для каких рассылок — для коллег.">
          <textarea className="field min-h-20" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
