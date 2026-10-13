'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  activeHoliday,
  dateLabel,
  HOLIDAY_EFFECTS,
  holidayDate,
  holidaySettings,
  localParts,
  nearestWindow,
  ruleLabel,
  type Holiday,
  type HolidayEffect,
  type HolidayRule,
  type HolidaySettings,
} from '@mtpk/content-model';
import { Icon } from '@/components/icons';
import { fileSrc, MediaInput } from '@/components/media';
import { TextInput } from '@/components/text-fields';
import { toast } from '@/components/toast';
import { Badge, Button, Card, cx, Field } from '@/components/ui';
import { api } from '@/lib/client-api';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKS: { value: 1 | 2 | 3 | 4 | -1; label: string }[] = [
  { value: 1, label: 'первый' },
  { value: 2, label: 'второй' },
  { value: 3, label: 'третий' },
  { value: 4, label: 'четвёртый' },
  { value: -1, label: 'последний' },
];
const SHORT_DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const POSITIONS = [
  { value: '72% center', label: 'Сюжет справа' },
  { value: 'center', label: 'По центру' },
  { value: '28% center', label: 'Сюжет слева' },
];
const EFFECT_HINTS: Record<HolidayEffect, string> = {
  none: 'Только баннер',
  snow: 'Падающий снег — Новый год',
  sparks: 'Раскалённые искры — металлурги, сварщики',
  petals: 'Лепестки — 8 Марта, весна',
  sparkle: 'Золотые огоньки — праздничное настроение',
};

const pad = (n: number) => String(n).padStart(2, '0');
/** «пт 17.07.2026 00:00» — местное (екатеринбургское) время. */
function fmt(ms: number, year = true): string {
  const p = localParts(ms);
  return `${SHORT_DOW[p.dow]} ${pad(p.d)}.${pad(p.m)}${year ? `.${p.y}` : ''} ${pad(p.hh)}:${pad(p.mi)}`;
}
/** Окно показа подписью: выключение — после последней минуты, показываем её саму. */
const windowText = (start: number, end: number, year = true) => `${fmt(start, year)} — ${fmt(end - 60_000, year)}`;
const daysWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'дня' : 'дней');
const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

function newHoliday(): Holiday {
  return {
    id: `holiday-${Date.now().toString(36)}`,
    enabled: true,
    name: 'Новый праздник',
    rule: { kind: 'date', day: 1, month: 1 },
    start: { daysBefore: 1, time: '00:00' },
    end: { daysAfter: 0, time: '23:59' },
    image: '',
    imagePosition: '72% center',
    title: 'С&nbsp;<em>праздником!</em>',
    text: '',
    effect: 'none',
  };
}

/** Состояние праздника для списка: на сайте сейчас, скоро или выключен. */
function statusOf(h: Holiday, now: number, onSite: string | null): { tone: 'green' | 'gray' | 'amber'; label: string } {
  if (!h.enabled) return { tone: 'gray', label: 'выключен' };
  if (!h.image.trim()) return { tone: 'amber', label: 'нет баннера' };
  if (onSite === h.id) return { tone: 'green', label: 'на сайте' };
  const w = nearestWindow(h, now);
  if (w.start <= now) return { tone: 'amber', label: 'перекрыт другим' };
  const days = Math.ceil((w.start - now) / 86_400_000);
  return { tone: 'gray', label: days <= 1 ? 'завтра' : `через ${days} ${daysWord(days)}` };
}

export function HolidaysEditor({ initial }: { initial: HolidaySettings }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sorted = useMemo(
    () => [...value.items].sort((a, b) => nearestWindow(a, now).start - nearestWindow(b, now).start),
    [value.items, now],
  );
  const [selectedId, setSelectedId] = useState(() => (activeHoliday(initial, Date.now())?.id ?? sorted[0]?.id ?? ''));
  const dirty = JSON.stringify(value) !== saved;
  const onSite = useMemo(() => activeHoliday(JSON.parse(saved) as HolidaySettings, now), [saved, now]);
  const current = value.items.find((h) => h.id === selectedId) ?? null;

  // статусы («через 3 дня», «на сайте») — по текущему времени
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const update = (patch: Partial<Holiday>) =>
    setValue((v) => ({ ...v, items: v.items.map((h) => (h.id === selectedId ? { ...h, ...patch } : h)) }));

  async function save() {
    const parsed = holidaySettings.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const at = issue?.path[0] === 'items' && typeof issue.path[1] === 'number' ? `«${value.items[issue.path[1]]?.name}»: ` : '';
      toast.error(`${at}${issue?.message ?? 'проверьте поля'}`);
      return;
    }
    setSaving(true);
    try {
      await api('content/holidays', { method: 'PUT', json: parsed.data });
      setSaved(JSON.stringify(value));
      toast.ok('Праздники сохранены — главная обновится в течение минуты');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  const add = () => {
    const h = newHoliday();
    setValue((v) => ({ ...v, items: [...v.items, h] }));
    setSelectedId(h.id);
  };
  const remove = () => {
    if (!current || !window.confirm(`Удалить праздник «${current.name}»?`)) return;
    const rest = value.items.filter((h) => h.id !== current.id);
    setValue((v) => ({ ...v, items: rest }));
    setSelectedId(rest[0]?.id ?? '');
  };

  return (
    <div className="space-y-6">
      {/* что сейчас на сайте и общий выключатель */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
        <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', onSite ? 'bg-accent-50 text-accent-700' : 'bg-slate-100 text-slate-500')}>
          <Icon name="gift" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {!JSON.parse(saved).enabled ? (
            <p className="font-medium text-slate-800">Праздничные баннеры выключены — на главной обычная обложка.</p>
          ) : onSite ? (
            <>
              <p className="font-medium text-slate-800">Сейчас на главной: {onSite.name}</p>
              <p className="text-slate-500">
                до {fmt(nearestWindow(value.items.find((h) => h.id === onSite.id) ?? sorted[0]!, now).end - 60_000)} (время ЕКБ)
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-800">Сейчас на главной обычная обложка.</p>
              {sorted.find((h) => h.enabled && h.image.trim()) && (
                <p className="text-slate-500">
                  Следующий праздник — {sorted.find((h) => h.enabled && h.image.trim())!.name}, с{' '}
                  {fmt(nearestWindow(sorted.find((h) => h.enabled && h.image.trim())!, now).start)}
                </p>
              )}
            </>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={value.enabled} onChange={(e) => setValue((v) => ({ ...v, enabled: e.target.checked }))} />
          Праздничные баннеры включены
        </label>
        <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Сохранено'}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* список праздников — по ближайшему показу */}
        <div className="space-y-3">
          <ul className="space-y-2">
            {sorted.map((h) => {
              const w = nearestWindow(h, now);
              const st = statusOf(h, now, onSite?.id ?? null);
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(h.id)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-xl border bg-white p-2.5 text-left shadow-xs transition',
                      h.id === selectedId ? 'border-brand-500 ring-3 ring-brand-100' : 'border-slate-200 hover:border-slate-300',
                      !h.enabled && 'opacity-60',
                    )}
                  >
                    {h.image ? (
                      <img src={fileSrc(`${h.image}?w=320`)} alt="" className="h-12 w-20 shrink-0 rounded-md bg-slate-900 object-cover" />
                    ) : (
                      <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-400">нет баннера</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{h.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {ruleLabel(h.rule)} · {HOLIDAY_EFFECTS[h.effect].toLowerCase()}
                      </span>
                      <span className="block truncate text-xs text-slate-400">{windowText(w.start, w.end, false)}</span>
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button className="w-full" onClick={add}>
            <Icon name="plus" className="h-4 w-4" />
            Добавить праздник
          </Button>
          <Card title="Подпись под поздравлением">
            <input className="field" value={value.signature} onChange={(e) => setValue((v) => ({ ...v, signature: e.target.value }))} placeholder="Команда «УралИндуктор»" />
            <p className="mt-1.5 text-xs text-slate-500">Одна для всех праздников; пусто — без подписи.</p>
          </Card>
        </div>

        {current ? <HolidayForm key={current.id} h={current} now={now} signature={value.signature} onChange={update} onRemove={remove} /> : null}
      </div>
    </div>
  );
}

function HolidayForm({
  h,
  now,
  signature,
  onChange,
  onRemove,
}: {
  h: Holiday;
  now: number;
  signature: string;
  onChange: (patch: Partial<Holiday>) => void;
  onRemove: () => void;
}) {
  const w = nearestWindow(h, now);
  const next = nearestWindow(h, w.end + 1);
  const setRule = (r: HolidayRule) => onChange({ rule: r });
  const year = localParts(now).y;
  const known = POSITIONS.some((p) => p.value === h.imagePosition);

  return (
    <div className="min-w-0 space-y-5">
      <Card
        title="Праздник и показ"
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={h.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
            Показывать
          </label>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Название" hint="В админке и в надзаголовке по умолчанию">
            <input className="field" value={h.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Дата праздника" hint={`В ${year} году — ${dateLabel(holidayDate(h.rule, year))}, в ${year + 1} — ${dateLabel(holidayDate(h.rule, year + 1))}`}>
            <div className="flex flex-wrap gap-2">
              <select
                className="field w-auto"
                value={h.rule.kind}
                onChange={(e) =>
                  setRule(e.target.value === 'date' ? { kind: 'date', day: 1, month: h.rule.month } : { kind: 'weekday', week: -1, weekday: 5, month: h.rule.month })
                }
              >
                <option value="date">Число месяца</option>
                <option value="weekday">День недели</option>
              </select>
              {h.rule.kind === 'date' ? (
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="field w-20"
                  value={h.rule.day}
                  onChange={(e) => setRule({ kind: 'date', day: Math.min(31, Math.max(1, Number(e.target.value) || 1)), month: h.rule.month })}
                />
              ) : (
                <>
                  <select className="field w-auto" value={h.rule.week} onChange={(e) => setRule({ ...(h.rule as Extract<HolidayRule, { kind: 'weekday' }>), week: Number(e.target.value) as 1 | 2 | 3 | 4 | -1 })}>
                    {WEEKS.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                  <select className="field w-auto" value={h.rule.weekday} onChange={(e) => setRule({ ...(h.rule as Extract<HolidayRule, { kind: 'weekday' }>), weekday: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <option key={d} value={d}>
                        {WEEKDAYS[d]}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <select className="field w-auto" value={h.rule.month} onChange={(e) => setRule({ ...h.rule, month: Number(e.target.value) })}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Включить баннер" hint="За сколько дней до праздника и во сколько">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="number"
                min={0}
                max={60}
                className="field w-20"
                value={h.start.daysBefore}
                onChange={(e) => onChange({ start: { ...h.start, daysBefore: Math.min(60, Math.max(0, Number(e.target.value) || 0)) } })}
              />
              <span className="whitespace-nowrap">дн. до, в</span>
              <input type="time" className="field w-32" value={h.start.time} onChange={(e) => onChange({ start: { ...h.start, time: e.target.value || '00:00' } })} />
            </div>
          </Field>
          <Field label="Выключить баннер" hint="Через сколько дней после праздника; минута включительно">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="number"
                min={0}
                max={60}
                className="field w-20"
                value={h.end.daysAfter}
                onChange={(e) => onChange({ end: { ...h.end, daysAfter: Math.min(60, Math.max(0, Number(e.target.value) || 0)) } })}
              />
              <span className="whitespace-nowrap">дн. после, до</span>
              <input type="time" className="field w-32" value={h.end.time} onChange={(e) => onChange({ end: { ...h.end, time: e.target.value || '23:59' } })} />
            </div>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-800">
            <Icon name="calendar" className="h-4 w-4 text-slate-500" />
            {w.start <= now ? 'Показывается сейчас' : 'Ближайший показ'}: {windowText(w.start, w.end)}
          </span>
          <span className="text-slate-500">следующий: {windowText(next.start, next.end)} · время ЕКБ</span>
        </div>
      </Card>

      <Card title="Баннер и поздравление">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
          <Field label="Баннер" hint="От 1920 px в ширину; сюжет — справа, слева — тёмное поле под текст. Папка медиатеки img/holidays/">
            <MediaInput value={h.image} onChange={(v) => onChange({ image: v })} />
          </Field>
          <Field label="На телефоне в кадре">
            <select className="field" value={known ? h.imagePosition : '__own'} onChange={(e) => e.target.value !== '__own' && onChange({ imagePosition: e.target.value })}>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              {!known && <option value="__own">Своё: {h.imagePosition}</option>}
            </select>
          </Field>
        </div>
        <div className="mt-4 grid gap-4">
          <Field label="Надзаголовок" hint="Пусто — дата и название праздника">
            <TextInput value={h.eyebrow ?? ''} placeholder={`${dateLabel(w.date)} · ${h.name}`} onChange={(v) => onChange({ eyebrow: v || undefined })} />
          </Field>
          <Field label="Заголовок поздравления" hint="Слова, выделенные тегами <em>…</em>, — золотом">
            <TextInput value={h.title} onChange={(v) => onChange({ title: v })} />
          </Field>
          <Field label="Текст поздравления" hint={`${plain(h.text).length} знаков; лучше до 200`}>
            <TextInput multiline value={h.text} onChange={(v) => onChange({ text: v })} />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Эффект</span>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(HOLIDAY_EFFECTS) as HolidayEffect[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onChange({ effect: e })}
                  className={cx(
                    'rounded-lg border px-3 py-2 text-left transition',
                    h.effect === e ? 'border-brand-500 bg-brand-50 ring-3 ring-brand-100' : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-800">{HOLIDAY_EFFECTS[e]}</span>
                  <span className="block text-xs text-slate-500">{EFFECT_HINTS[e]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <HolidayPreview h={h} signature={signature} />

      <div className="flex justify-end">
        <Button variant="danger" size="sm" onClick={onRemove}>
          <Icon name="trash" className="h-4 w-4" />
          Удалить праздник
        </Button>
      </div>
    </div>
  );
}

/** Предпросмотр шапки главной с праздником — как на сайте, с эффектом; перерисовывается после правок. */
function HolidayPreview({ h, signature }: { h: Holiday; signature: string }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [doc, setDoc] = useState('');
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const sig = JSON.stringify({ h, signature });

  useEffect(() => {
    if (!h.image) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const html = await api<string>('preview-holiday', { json: { holiday: h, signature } });
        if (alive) setDoc(html);
      } catch {
        /* предпросмотр не мешает правке */
      }
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // экран компьютера 1440×900 и телефона 390×844 (высота шапки — от высоты экрана); видна только шапка: 640 и 692 px
  const frame = device === 'desktop' ? { w: 1440, h: 900, show: 640 } : { w: 390, h: 844, show: 692 };
  const scale = width ? Math.min(1, width / frame.w, device === 'mobile' ? 520 / frame.show : 1) : 0;

  return (
    <Card
      title="Предпросмотр шапки главной"
      actions={
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
          {(['desktop', 'mobile'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)} className={cx('rounded-md px-3 py-1 font-medium', device === d ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500')}>
              {d === 'desktop' ? 'Компьютер' : 'Телефон'}
            </button>
          ))}
        </div>
      }
    >
      <div ref={box} className="w-full">
        {!h.image ? (
          <p className="py-10 text-center text-sm text-slate-500">Выберите баннер — здесь появится шапка главной.</p>
        ) : (
          <div className="mx-auto overflow-hidden rounded-lg border border-slate-200 bg-slate-900" style={{ width: frame.w * scale, height: frame.show * scale }}>
            {doc && scale > 0 && (
              <iframe
                title="Предпросмотр праздника"
                srcDoc={doc}
                sandbox="allow-scripts"
                style={{ width: frame.w, height: frame.h, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0 }}
              />
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">Так шапка выглядит на сайте в дни показа (эффект движется). Ссылки в предпросмотре не работают.</p>
      </div>
    </Card>
  );
}
