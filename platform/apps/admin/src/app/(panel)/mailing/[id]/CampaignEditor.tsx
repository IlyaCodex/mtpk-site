'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { Icon } from '@/components/icons';
import { Modal } from '@/components/media';
import { toast } from '@/components/toast';
import { Badge, Button, Card, cx, Field } from '@/components/ui';
import { plural } from '@/lib/catalog';
import { api } from '@/lib/client-api';
import { campaignUtm, duration, fmt, type Campaign, type MailListRow, type Preview } from '@/lib/mailing';
import { EmailPreview } from './EmailPreview';

type Draft = Pick<Campaign, 'name' | 'subject' | 'preheader' | 'fromName' | 'html' | 'listId' | 'utmCampaign'>;
const pick = (c: Campaign): Draft => ({ name: c.name, subject: c.subject, preheader: c.preheader, fromName: c.fromName, html: c.html, listId: c.listId, utmCampaign: c.utmCampaign });

/** Замечания, с которыми рассылку не запустить (сервис проверяет то же самое). */
const isBlocking = (w: string) => /^Нет темы|^Нет ссылки отписки/.test(w);

const HINTS = [
  { code: '{{name|коллеги}}', text: 'имя получателя; после черты — слово на случай, если имени в базе нет' },
  { code: '{{email}}', text: 'адрес получателя' },
  { code: '{{unsubscribe_url}}', text: 'ссылка отписки — обязательна, без неё рассылку не запустить' },
  { code: '{{site_url}}', text: 'адрес сайта, например {{site_url}}/products/' },
  { code: 'data-utm="akciya"', text: 'атрибут ссылки: своё значение utm_content (иначе — из текста ссылки)' },
  { code: 'data-notrack', text: 'атрибут ссылки: не считать переходы и не ставить метки' },
];

/** Значение для поля «дата и время»: завтра в 10:00 по часам компьютера. */
function tomorrowAt10(): string {
  const d = new Date(Date.now() + 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export function CampaignEditor({ campaign, lists, userEmail }: { campaign: Campaign; lists: MailListRow[]; userEmail: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => pick(campaign));
  const [saved, setSaved] = useState(() => JSON.stringify(pick(campaign)));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rendering, setRendering] = useState(true);
  const [dialog, setDialog] = useState<'test' | 'launch' | null>(null);
  const seq = useRef(0);
  const dirty = JSON.stringify(draft) !== saved;
  const list = lists.find((l) => l.id === draft.listId) ?? null;
  const blocking = preview?.warnings.filter(isBlocking) ?? [];
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // предпросмотр — через полсекунды после правки: письмо, ссылки с метками, замечания
  useEffect(() => {
    const n = ++seq.current;
    setRendering(true);
    const t = setTimeout(async () => {
      try {
        const p = await api<Preview>(`mailing/campaigns/${campaign.id}/render`, {
          json: { subject: draft.subject, preheader: draft.preheader, html: draft.html, utmCampaign: draft.utmCampaign },
        });
        if (n === seq.current) setPreview(p);
      } catch (err) {
        if (n === seq.current) toast.error(err);
      } finally {
        if (n === seq.current) setRendering(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [campaign.id, draft.subject, draft.preheader, draft.html, draft.utmCampaign]);

  async function save(silent = false): Promise<boolean> {
    setSaving(true);
    try {
      await api(`mailing/campaigns/${campaign.id}`, { method: 'PUT', json: draft });
      setSaved(JSON.stringify(draft));
      if (!silent) toast.ok('Рассылка сохранена');
      return true;
    } catch (err) {
      toast.error(err);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Ctrl+S — сохранить; уход со страницы с несохранёнными правками — с вопросом
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const stop = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', stop);
    return () => window.removeEventListener('beforeunload', stop);
  }, [dirty]);

  async function loadTemplate() {
    if (!confirm('Заменить вёрстку письма фирменным шаблоном? Текущий HTML пропадёт (до сохранения можно уйти со страницы без изменений).')) return;
    try {
      const { html } = await api<{ html: string }>('mailing/template');
      set('html', html);
    } catch (err) {
      toast.error(err);
    }
  }

  async function duplicate() {
    try {
      if (dirty && !(await save(true))) return;
      const copy = await api<{ id: number }>(`mailing/campaigns/${campaign.id}/duplicate`, { method: 'POST' });
      router.push(`/mailing/${copy.id}`);
    } catch (err) {
      toast.error(err);
    }
  }

  async function remove() {
    if (!confirm(`Удалить черновик «${draft.name}»?`)) return;
    try {
      await api(`mailing/campaigns/${campaign.id}`, { method: 'DELETE' });
      setSaved(JSON.stringify(draft));
      router.push('/mailing');
    } catch (err) {
      toast.error(err);
    }
  }

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
            <div className="truncate text-lg font-semibold text-slate-900">{draft.name || 'Без названия'}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge>черновик</Badge>
              {list ? (
                <span>
                  база «{list.name}» — {fmt(list.active)} {plural(list.active, 'адрес', 'адреса', 'адресов')}
                </span>
              ) : (
                <span className="text-amber-700">база получателей не выбрана</span>
              )}
              {dirty && <span className="text-amber-700">· есть несохранённые правки</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={duplicate} title="Сделать копию рассылки">
            <Icon name="copy" className="h-4 w-4" />
            Копия
          </Button>
          <Button variant="ghost" size="sm" onClick={remove} title="Удалить черновик">
            <Icon name="trash" className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDialog('test')}>
            <Icon name="letter" className="h-4 w-4" />
            Тестовое письмо
          </Button>
          <Button onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? 'Сохраняю…' : dirty ? 'Сохранить' : 'Сохранено'}
          </Button>
          <Button variant="primary" onClick={() => setDialog('launch')}>
            <Icon name="right" className="h-4 w-4" />
            Запустить
          </Button>
        </div>
      </header>

      <div className="grid gap-6 px-8 py-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card title="Письмо">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Название рассылки" hint="Видно только в админке." className="md:col-span-2">
                <input className="field" value={draft.name} maxLength={200} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Тема письма" hint="Можно с именем: «{{name|Коллеги}}, новинки октября»." className="md:col-span-2">
                <input className="field" value={draft.subject} maxLength={300} onChange={(e) => set('subject', e.target.value)} placeholder="Тема, которую увидят во «Входящих»" />
              </Field>
              <Field label="Прехедер" hint="Серый текст рядом с темой во «Входящих» — до 100 знаков." className="md:col-span-2">
                <input className="field" value={draft.preheader} maxLength={300} onChange={(e) => set('preheader', e.target.value)} placeholder="Например: печи и дробемёты в наличии — отгрузка за 10 дней" />
              </Field>
              <Field label="Отправитель" hint={`Адрес — ${campaign.fromEmail} (задаётся на сервере).`}>
                <input className="field" value={draft.fromName} maxLength={100} onChange={(e) => set('fromName', e.target.value)} />
              </Field>
              <Field
                label="База получателей"
                hint={
                  lists.length ? (
                    <Link href="/mailing/lists" className="text-brand-600 hover:underline">
                      Базы адресов →
                    </Link>
                  ) : (
                    <Link href="/mailing/lists" className="text-amber-700 hover:underline">
                      Баз пока нет — создайте во вкладке «Базы адресов»
                    </Link>
                  )
                }
              >
                <select className="field" value={draft.listId ?? ''} onChange={(e) => set('listId', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— не выбрана —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {fmt(l.active)} {plural(l.active, 'адрес', 'адреса', 'адресов')}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="UTM-метки ссылок">
            <p className="mb-3 text-sm text-slate-600">
              Метки система ставит сама на все ссылки на свой сайт: <code className="rounded bg-slate-100 px-1 text-xs">utm_source=email</code>{' '}
              <code className="rounded bg-slate-100 px-1 text-xs">utm_medium=email</code> <code className="rounded bg-slate-100 px-1 text-xs">utm_campaign</code> — метка рассылки,{' '}
              <code className="rounded bg-slate-100 px-1 text-xs">utm_content</code> — текст кнопки или ссылки. По ним визиты из письма видны в Яндекс Метрике.
            </p>
            <Field label="utm_campaign" hint="Латиница, цифры, точка, дефис, подчёркивание.">
              <div className="flex gap-2">
                <input
                  className="field font-mono text-sm"
                  value={draft.utmCampaign}
                  maxLength={100}
                  onChange={(e) => set('utmCampaign', e.target.value.replace(/[^a-z0-9._-]/gi, '').toLowerCase())}
                />
                <Button onClick={() => set('utmCampaign', campaignUtm(draft.name))} title="Сделать метку из названия рассылки">
                  По названию
                </Button>
              </div>
            </Field>
          </Card>

          <Card
            title="Вёрстка письма (HTML)"
            actions={
              <Button size="sm" variant="ghost" onClick={loadTemplate}>
                Фирменный шаблон
              </Button>
            }
          >
            <CodeEditor value={draft.html} onChange={(v) => set('html', v)} lang="html" />
            <details className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-slate-700">Подстановки и правила вёрстки</summary>
              <ul className="mt-3 space-y-1.5">
                {HINTS.map((h) => (
                  <li key={h.code} className="flex flex-wrap items-baseline gap-x-2">
                    <button
                      type="button"
                      className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
                      title="Скопировать"
                      onClick={() => void navigator.clipboard.writeText(h.code).then(() => toast.ok(`Скопировано: ${h.code}`))}
                    >
                      {h.code}
                    </button>
                    <span className="text-slate-600">{h.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-slate-600">
                Письма собираются таблицами шириной до 600 px со стилями в атрибуте <code className="text-xs">style</code>: почтовые программы не понимают внешние стили, скрипты и
                шрифты сайта. Картинки — из медиатеки (адреса <code className="text-xs">{'{{site_url}}'}/img/…</code>), по https.
              </p>
            </details>
          </Card>
        </div>

        <div className="min-w-0 space-y-4 2xl:sticky 2xl:top-24 2xl:self-start">
          {preview?.warnings.length ? (
            <ul className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              {preview.warnings.map((w) => (
                <li key={w} className={cx('flex gap-2', isBlocking(w) ? 'font-medium text-red-700' : 'text-amber-900')}>
                  <span aria-hidden>{isBlocking(w) ? '✕' : '!'}</span>
                  {w}
                </li>
              ))}
            </ul>
          ) : null}
          <EmailPreview
            html={preview?.html ?? ''}
            subject={draft.subject.replace(/\{\{\s*name\s*(?:\|\s*([^}]*?)\s*)?\}\}/g, 'Иван Петров')}
            preheader={draft.preheader}
            fromName={draft.fromName}
            fromEmail={campaign.fromEmail}
            loading={rendering}
          />
          <LinksCard links={preview?.links ?? []} />
          {preview?.text && (
            <details className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-xs">
              <summary className="cursor-pointer font-medium text-slate-700">Текстовая версия письма</summary>
              <p className="mt-2 text-xs text-slate-500">Уходит вместе с HTML — для почтовых программ без картинок и для фильтров спама.</p>
              <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700">{preview.text}</pre>
            </details>
          )}
        </div>
      </div>

      {dialog === 'test' && (
        <TestDialog
          defaultEmail={userEmail}
          sendsForReal={campaign.sendsForReal}
          onClose={() => setDialog(null)}
          onSend={async (emails) => {
            const r = await api<{ sent: number; forReal: boolean }>(`mailing/campaigns/${campaign.id}/test`, {
              json: { emails, subject: draft.subject, preheader: draft.preheader, html: draft.html, utmCampaign: draft.utmCampaign, fromName: draft.fromName },
            });
            toast.ok(r.forReal ? `Тестовое письмо отправлено: ${emails.join(', ')}` : 'Тестовое письмо собрано, но не отправлено — включён тестовый режим');
            setDialog(null);
          }}
        />
      )}
      {dialog === 'launch' && (
        <LaunchDialog
          list={list}
          rate={campaign.rate}
          sendsForReal={campaign.sendsForReal}
          blocking={blocking}
          onClose={() => setDialog(null)}
          onLaunch={async (at) => {
            if (dirty && !(await save(true))) return;
            await api(`mailing/campaigns/${campaign.id}/schedule`, { json: at ? { at } : {} });
            setSaved(JSON.stringify(draft));
            toast.ok(at ? 'Рассылка запланирована' : 'Рассылка запущена');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Ссылки письма: куда ведут и с какими метками. */
function LinksCard({ links }: { links: Preview['links'] }) {
  return (
    <Card title={`Ссылки и метки — ${links.length}`}>
      {links.length ? (
        <ol className="space-y-3">
          {links.map((l) => {
            const tagged = /[?&]utm_source=/.test(l.target);
            return (
              <li key={l.position} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">{l.position}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{l.label || 'без текста'}</span>
                    {tagged ? <Badge tone="blue">utm_content={l.utmContent}</Badge> : <Badge>без меток — чужой сайт</Badge>}
                  </div>
                  <a href={l.target} target="_blank" rel="noopener" className="mt-0.5 block truncate font-mono text-xs text-slate-500 hover:text-brand-600" title={l.target}>
                    {l.target}
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-slate-500">В письме нет ссылок — переходы считать не по чему.</p>
      )}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        В отправленных письмах ссылки ведут через сайт (/r/…): переход засчитывается и сразу переадресует на адрес с метками. Почта, телефон и отписка не отслеживаются.
      </p>
    </Card>
  );
}

function TestDialog({ defaultEmail, sendsForReal, onClose, onSend }: { defaultEmail: string; sendsForReal: boolean; onClose: () => void; onSend: (emails: string[]) => Promise<void> }) {
  const [value, setValue] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const emails = value.split(/[\s,;]+/).filter(Boolean);
  return (
    <Modal title="Тестовое письмо" onClose={onClose} width="max-w-lg">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSend(emails);
          } catch (err) {
            toast.error(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Кому" hint="До 5 адресов через запятую. Тема — с пометкой «[Тест]», переходы по ссылкам не считаются.">
          <input autoFocus className="field" value={value} onChange={(e) => setValue(e.target.value)} placeholder="you@uralinduktor.ru" />
        </Field>
        {!sendsForReal && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Тестовый режим: письмо соберётся, но не уйдёт.</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="primary" disabled={busy || !emails.length || emails.length > 5}>
            {busy ? 'Отправляю…' : 'Отправить'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LaunchDialog({
  list,
  rate,
  sendsForReal,
  blocking,
  onClose,
  onLaunch,
}: {
  list: MailListRow | null;
  rate: number;
  sendsForReal: boolean;
  blocking: string[];
  onClose: () => void;
  onLaunch: (at: string | null) => Promise<void>;
}) {
  const [mode, setMode] = useState<'now' | 'at'>('now');
  const [at, setAt] = useState(tomorrowAt10);
  const [busy, setBusy] = useState(false);
  const audience = list?.active ?? 0;
  const problems = [...blocking, ...(!list ? ['Выберите базу получателей.'] : !audience ? ['В выбранной базе нет активных адресов.'] : [])];
  const when = mode === 'at' ? new Date(at) : null;
  const badTime = when !== null && (Number.isNaN(when.getTime()) || when.getTime() < Date.now());

  return (
    <Modal title="Запуск рассылки" onClose={onClose} width="max-w-xl">
      {problems.length ? (
        <div className="space-y-4">
          <ul className="space-y-1.5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {problems.map((p) => (
              <li key={p}>✕ {p}</li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onClick={onClose}>Понятно</Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onLaunch(when ? when.toISOString() : null);
            } catch (err) {
              toast.error(err);
              setBusy(false);
            }
          }}
        >
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-sm text-slate-500">Получатели</div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {fmt(audience)} <span className="text-base font-normal text-slate-500">{plural(audience, 'адрес', 'адреса', 'адресов')}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              база «{list!.name}», без отписавшихся и недоставляемых · отправка {duration(audience, rate)} ({rate} {plural(Math.round(rate), 'письмо', 'письма', 'писем')} в секунду)
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Когда</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="when" checked={mode === 'now'} onChange={() => setMode('now')} />
              Сейчас
            </label>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <input type="radio" name="when" checked={mode === 'at'} onChange={() => setMode('at')} />
              По расписанию
              <input type="datetime-local" className="field w-auto" value={at} onChange={(e) => (setAt(e.target.value), setMode('at'))} />
            </label>
            {badTime && <p className="text-xs text-red-600">Укажите время в будущем.</p>}
          </fieldset>
          <p className="text-sm text-slate-600">После запуска письмо не меняется. Рассылку можно поставить на паузу или остановить — неотправленные письма не уйдут.</p>
          {!sendsForReal && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Тестовый режим: рассылка пройдёт все шаги, но письма не уйдут.</p>}
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Отмена</Button>
            <Button type="submit" variant="primary" disabled={busy || badTime}>
              {busy ? 'Запускаю…' : mode === 'now' ? `Отправить ${fmt(audience)} ${plural(audience, 'адресату', 'адресатам', 'адресатам')}` : 'Запланировать'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
