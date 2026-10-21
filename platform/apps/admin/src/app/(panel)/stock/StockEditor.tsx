'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { GalleryField, type Photo } from '@/components/gallery-field';
import { Icon } from '@/components/icons';
import { fileSrc, MediaInput, Modal, slugify } from '@/components/media';
import { move } from '@/components/schema-form';
import { toast } from '@/components/toast';
import { Badge, Button, cx } from '@/components/ui';
import { api } from '@/lib/client-api';

export type StockKind = 'equipment' | 'parts';

/** Тип позиций: карточка блока «Склад» на главной и кнопка фильтра на /nalichie/. */
export type StockGroup = { key: string; kind: StockKind; title: string; image: string | null };

/** Позиция склада (то, что лежит на складе). Пустые поля сайт берёт из карточки товара. */
export type StockItem = {
  group: string | null;
  url: string;
  qty: number | null;
  shipping: string | null;
  /** цена, ₽: на карточке /nalichie/; нет — «по запросу» */
  price?: number | null;
  /** «от» перед ценой */
  priceFrom?: boolean;
  /** пояснение к цене в одну строку: «с НДС», «за комплект» */
  priceNote?: string | null;
  note: string | null;
  title: string | null;
  image: string | null;
  specs: [string, string][] | null;
  photos: { src: string; alt: string }[];
  /** скрыта на сайте: остаётся здесь, но не выводится ни в блоках склада, ни бейджем «В наличии» */
  hidden?: boolean;
  /** прочие поля позиции из старого конфига — сохраняются как есть */
  extra?: Record<string, unknown>;
  /** как позицию показывает сайт: название и фото (свои, из каталога или со страницы запчасти) */
  preview?: { title: string; image: string | null };
};

export type StockData = { groups: StockGroup[]; items: StockItem[] };

/** Товар или раздел каталога — для выбора «ссылки на оборудование». */
export type CatalogOption = { path: string; name: string; cover: string | null; where: string; section: boolean; draft: boolean };

const KINDS: { kind: StockKind; label: string }[] = [
  { kind: 'equipment', label: 'Оборудование' },
  { kind: 'parts', label: 'Запчасти и расходники' },
];

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
const positions = (n: number) => `${n} ${plural(n, 'позиция', 'позиции', 'позиций')}`;

const emptyItem = (group: string): StockItem => ({
  group,
  url: '',
  qty: null,
  shipping: null,
  price: null,
  priceFrom: false,
  priceNote: null,
  note: null,
  title: null,
  image: null,
  specs: null,
  photos: [],
});

/** Цена как на сайте: «от 1 250 000 ₽». */
export const priceText = (item: Pick<StockItem, 'price' | 'priceFrom'>) =>
  item.price ? `${item.priceFrom ? 'от ' : ''}${item.price.toLocaleString('ru-RU')} ₽` : '';

/** Уникальная метка типа из названия. */
function uniqueKey(title: string, taken: string[]): string {
  const base = slugify(title) || 'tip';
  let key = base;
  for (let i = 2; taken.includes(key); i++) key = `${base}-${i}`;
  return key;
}

/** Папка медиатеки для фото со склада позиции. */
const photoFolder = (it: StockItem) => `img/stock/${it.url.split('/').filter(Boolean).pop() || slugify(it.title ?? '') || 'pozitsiya'}/`;

/**
 * Склад: вкладки «Оборудование» и «Запчасти и расходники», в них — типы
 * (карточки блока «Склад» на главной), в типах — позиции (карточки страницы
 * /nalichie/). Каждое действие сохраняется сразу.
 */
export function StockEditor({ initial, catalog }: { initial: StockData; catalog: CatalogOption[] }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<StockKind>('equipment');
  const [itemDialog, setItemDialog] = useState<{ index: number | null; draft: StockItem } | null>(null);
  const [groupDialog, setGroupDialog] = useState<{ index: number | null; draft: StockGroup } | null>(null);
  const byPath = useMemo(() => new Map(catalog.map((c) => [c.path, c])), [catalog]);

  const known = new Set(data.groups.map((g) => g.key));
  const orphans = data.items.map((it, i) => ({ it, i })).filter(({ it }) => !it.group || !known.has(it.group));

  /** Сохранить склад целиком; при ошибке на экране остаётся прежнее состояние. */
  async function save(next: StockData, message = 'Сохранено — сайт обновится в течение минуты'): Promise<boolean> {
    setSaving(true);
    try {
      await api('content/stock', { method: 'PUT', json: next });
      // заново — с превью «как на сайте» (название и фото из каталога после смены ссылки)
      setData(await api<StockData>('content/stock').catch(() => next));
      toast.ok(message);
      return true;
    } catch (err) {
      toast.error(err);
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** Сдвинуть позицию на соседнее место внутри её типа. */
  function moveItem(i: number, dir: -1 | 1) {
    const same = data.items.map((it, j) => ({ it, j })).filter(({ it }) => it.group === data.items[i].group);
    const at = same.findIndex(({ j }) => j === i);
    const target = same[at + dir];
    if (!target) return;
    const items = [...data.items];
    [items[i], items[target.j]] = [items[target.j], items[i]];
    void save({ ...data, items }, 'Порядок сохранён');
  }

  /** Сдвинуть тип внутри своего раздела. */
  function moveGroup(index: number, dir: -1 | 1) {
    const same = data.groups.map((g, j) => ({ g, j })).filter(({ g }) => g.kind === data.groups[index].kind);
    const at = same.findIndex(({ j }) => j === index);
    const target = same[at + dir];
    if (!target) return;
    void save({ ...data, groups: move(data.groups, index, target.j) }, 'Порядок сохранён');
  }

  /** Показывать позицию на сайте или скрыть (в админке она остаётся). */
  function toggleHidden(i: number) {
    const hidden = !data.items[i].hidden;
    void save(
      { ...data, items: data.items.map((it, j) => (j === i ? { ...it, hidden } : it)) },
      hidden ? 'Позиция скрыта — на сайте её не видно' : 'Позиция снова показывается на сайте',
    );
  }

  function removeItem(i: number) {
    const it = data.items[i];
    const name = it.title || byPath.get(it.url)?.name || 'позицию';
    if (!window.confirm(`Убрать со склада «${name}»? Карточка исчезнет с /nalichie/, у товара пропадёт бейдж «В наличии».`)) return;
    void save({ ...data, items: data.items.filter((_, j) => j !== i) }, 'Позиция убрана со склада');
  }

  function removeGroup(index: number) {
    const g = data.groups[index];
    if (data.items.some((it) => it.group === g.key)) {
      toast.error('Сначала перенесите позиции этого типа в другой тип или уберите их со склада');
      return;
    }
    if (!window.confirm(`Удалить тип «${g.title}»?`)) return;
    void save({ ...data, groups: data.groups.filter((_, j) => j !== index) }, 'Тип удалён');
  }

  const groupsOfKind = data.groups.map((g, index) => ({ g, index })).filter(({ g }) => g.kind === kind);
  const counts = (k: StockKind) => {
    const keys = new Set(data.groups.filter((g) => g.kind === k).map((g) => g.key));
    return { groups: keys.size, items: data.items.filter((it) => it.group && keys.has(it.group)).length };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs" role="tablist" aria-label="Раздел склада">
          {KINDS.map(({ kind: k, label }) => {
            const c = counts(k);
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cx('rounded-lg px-4 py-2 text-sm font-medium transition', kind === k ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}
              >
                {label}
                <span className={cx('ml-2 text-xs', kind === k ? 'text-white/80' : 'text-slate-400')}>{positions(c.items)}</span>
              </button>
            );
          })}
        </div>
        <span className="text-xs text-slate-500">{saving ? 'Сохраняем…' : 'Каждое изменение сохраняется сразу'}</span>
      </div>

      {orphans.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Позиции без типа</h2>
          <p className="mt-1 mb-3 text-xs text-amber-800">Они видны на /nalichie/, но не попадают в карточки на главной. Откройте позицию и выберите тип.</p>
          <div className="space-y-2">
            {orphans.map(({ it, i }) => (
              <ItemRow
                key={i}
                item={it}
                option={byPath.get(it.url)}
                onEdit={() => setItemDialog({ index: i, draft: it })}
                onToggle={() => toggleHidden(i)}
                onRemove={() => removeItem(i)}
                disabled={saving}
              />
            ))}
          </div>
        </section>
      )}

      {groupsOfKind.map(({ g, index }, n) => {
        const items = data.items.map((it, i) => ({ it, i })).filter(({ it }) => it.group === g.key);
        const hiddenCount = items.filter(({ it }) => it.hidden).length;
        const cover = g.image || items.map(({ it }) => it.image || it.preview?.image || byPath.get(it.url)?.cover).find(Boolean) || null;
        return (
          <section key={g.key} className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <header className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3">
              <Thumb src={cover} className="h-12 w-16" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-slate-900">{g.title}</h2>
                <p className="text-xs text-slate-500">
                  {items.length ? positions(items.length) : 'Нет позиций — на сайте тип не показывается'}
                  {hiddenCount > 0 &&
                    (hiddenCount === items.length ? ' · все скрыты — на сайте тип не показывается' : ` · скрыто на сайте: ${hiddenCount}`)}
                  {!g.image && items.length > 0 && ' · фото карточки — первой позиции'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={() => setGroupDialog({ index, draft: g })} disabled={saving}>
                  <Icon name="pen" className="h-4 w-4" />
                  Тип
                </Button>
                <IconButton icon="up" label="Тип выше" disabled={saving || n === 0} onClick={() => moveGroup(index, -1)} />
                <IconButton icon="down" label="Тип ниже" disabled={saving || n === groupsOfKind.length - 1} onClick={() => moveGroup(index, 1)} />
                <IconButton icon="trash" label="Удалить тип" danger disabled={saving} onClick={() => removeGroup(index)} />
              </div>
            </header>
            <div className="space-y-2 p-4">
              {items.map(({ it, i }, k) => (
                <ItemRow
                  key={i}
                  item={it}
                  option={byPath.get(it.url)}
                  onEdit={() => setItemDialog({ index: i, draft: it })}
                  onToggle={() => toggleHidden(i)}
                  onUp={k > 0 ? () => moveItem(i, -1) : undefined}
                  onDown={k < items.length - 1 ? () => moveItem(i, 1) : undefined}
                  onRemove={() => removeItem(i)}
                  disabled={saving}
                />
              ))}
              <Button size="sm" variant="ghost" className="text-brand-700" onClick={() => setItemDialog({ index: null, draft: emptyItem(g.key) })} disabled={saving}>
                <Icon name="plus" className="h-4 w-4" />
                Добавить позицию
              </Button>
            </div>
          </section>
        );
      })}

      {!groupsOfKind.length && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
          В разделе «{KINDS.find((k) => k.kind === kind)?.label}» пока нет типов. Добавьте тип — например, «Индукционные печи» — и позиции в нём.
        </p>
      )}

      <Button
        variant="primary"
        onClick={() => setGroupDialog({ index: null, draft: { key: '', kind, title: '', image: null } })}
        disabled={saving}
      >
        <Icon name="plus" className="h-4 w-4" />
        {kind === 'parts' ? 'Новый тип запчастей' : 'Новый тип оборудования'}
      </Button>

      {itemDialog && (
        <ItemDialog
          initial={itemDialog.draft}
          isNew={itemDialog.index === null}
          groups={data.groups}
          catalog={catalog}
          byPath={byPath}
          saving={saving}
          onCancel={() => setItemDialog(null)}
          onSave={async (draft) => {
            const items = itemDialog.index === null ? [...data.items, draft] : data.items.map((it, j) => (j === itemDialog.index ? draft : it));
            if (await save({ ...data, items }, itemDialog.index === null ? 'Позиция добавлена на склад' : 'Позиция сохранена')) setItemDialog(null);
          }}
        />
      )}

      {groupDialog && (
        <GroupDialog
          initial={groupDialog.draft}
          isNew={groupDialog.index === null}
          taken={data.groups.filter((_, j) => j !== groupDialog.index).map((g) => g.key)}
          saving={saving}
          onCancel={() => setGroupDialog(null)}
          onSave={async (draft) => {
            const old = groupDialog.index === null ? null : data.groups[groupDialog.index];
            const groups = groupDialog.index === null ? [...data.groups, draft] : data.groups.map((g, j) => (j === groupDialog.index ? draft : g));
            // метка типа поменялась — позиции переходят вместе с ним
            const items = old && old.key !== draft.key ? data.items.map((it) => (it.group === old.key ? { ...it, group: draft.key } : it)) : data.items;
            if (await save({ groups, items }, groupDialog.index === null ? 'Тип добавлен' : 'Тип сохранён')) {
              setGroupDialog(null);
              setKind(draft.kind);
            }
          }}
        />
      )}
    </div>
  );
}

function Thumb({ src, className }: { src: string | null | undefined; className?: string }) {
  return src ? (
    <img src={fileSrc(src)} alt="" className={cx('shrink-0 rounded-md border border-slate-200 bg-white object-contain', className)} />
  ) : (
    <span className={cx('flex shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-400', className)}>нет фото</span>
  );
}

function IconButton({ icon, label, onClick, disabled, danger }: { icon: 'up' | 'down' | 'trash' | 'pen'; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx('rounded-md p-1.5 text-slate-400 transition disabled:pointer-events-none disabled:opacity-30', danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700')}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

/** Тумблер «Показывать на сайте»: включён — позиция на сайте, выключен — скрыта (в админке остаётся). */
function SiteSwitch({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      disabled={disabled}
      title={on ? 'Показывается на сайте — выключите, чтобы скрыть' : 'Скрыта на сайте — включите, чтобы показывать'}
      className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
    >
      <span className={cx('relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', on ? 'left-[18px]' : 'left-0.5')} />
      </span>
      <span className="w-[5.5rem] text-left">{on ? 'Показывать' : 'Скрыта'}</span>
    </button>
  );
}

/** Строка позиции: фото, название, ссылка, количество и срок, фото со склада; тумблер «на сайте». */
function ItemRow({
  item,
  option,
  onEdit,
  onToggle,
  onUp,
  onDown,
  onRemove,
  disabled,
}: {
  item: StockItem;
  option: CatalogOption | undefined;
  onEdit: () => void;
  onToggle: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const title = item.title || item.preview?.title || option?.name || item.url || 'Без названия';
  const hidden = Boolean(item.hidden);
  return (
    <div className={cx('flex items-center gap-4 rounded-lg border p-2.5', hidden ? 'border-dashed border-slate-300 bg-white' : 'border-slate-200 bg-slate-50/60 hover:border-slate-300')}>
      <button type="button" onClick={onEdit} className={cx('shrink-0', hidden && 'opacity-50 grayscale')} title="Изменить позицию">
        <Thumb src={item.image || item.preview?.image || option?.cover} className="h-14 w-20" />
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onEdit} className={cx('block max-w-full truncate text-left text-sm font-semibold hover:text-brand-700', hidden ? 'text-slate-500' : 'text-slate-900')}>
          {title}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {hidden && <Badge tone="gray">скрыта на сайте</Badge>}
          {item.url ? (
            <span className="inline-flex min-w-0 items-center gap-1 font-mono">
              <Icon name="link" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.url}</span>
            </span>
          ) : (
            <span>без ссылки на страницу</span>
          )}
          {item.url && !option && <Badge tone="amber">нет в каталоге</Badge>}
          {option?.draft && <Badge tone="amber">страница — черновик</Badge>}
          <span className={item.price ? 'font-semibold text-slate-800' : 'text-slate-400'}>{item.price ? priceText(item) : 'цена по запросу'}</span>
          {item.qty != null && <span>{item.qty} шт.</span>}
          {item.shipping && <span>отгрузка {item.shipping}</span>}
          <span className={cx('inline-flex items-center gap-1', item.photos.length ? 'text-accent-700' : 'text-slate-400')}>
            <Icon name="camera" className="h-3.5 w-3.5" />
            {item.photos.length ? `${item.photos.length} фото со склада` : 'нет фото со склада'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <SiteSwitch on={!hidden} onChange={onToggle} disabled={disabled} />
        <Button size="sm" onClick={onEdit} disabled={disabled}>
          <Icon name="pen" className="h-4 w-4" />
          Изменить
        </Button>
        {(onUp || onDown) && (
          <>
            <IconButton icon="up" label="Выше" disabled={disabled || !onUp} onClick={() => onUp?.()} />
            <IconButton icon="down" label="Ниже" disabled={disabled || !onDown} onClick={() => onDown?.()} />
          </>
        )}
        <IconButton icon="trash" label="Убрать со склада" danger disabled={disabled} onClick={onRemove} />
      </div>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** Окно позиции: тип, оборудование из каталога, название, количество, срок, цена, фото, фото со склада, характеристики. */
function ItemDialog({
  initial,
  isNew,
  groups,
  catalog,
  byPath,
  saving,
  onCancel,
  onSave,
}: {
  initial: StockItem;
  isNew: boolean;
  groups: StockGroup[];
  catalog: CatalogOption[];
  byPath: Map<string, CatalogOption>;
  saving: boolean;
  onCancel: () => void;
  onSave: (item: StockItem) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<StockItem>) => setDraft((d) => ({ ...d, ...patch }));
  const option = byPath.get(draft.url);

  function submit() {
    const e: Record<string, string> = {};
    if (!draft.group || !groups.some((g) => g.key === draft.group)) e.group = 'Выберите тип';
    if (draft.url && !draft.url.startsWith('/')) e.url = 'Адрес страницы сайта начинается с «/», например /products/…/';
    if (!draft.url && !draft.title?.trim()) e.title = 'У позиции без ссылки на страницу нужно название';
    setErrors(e);
    if (Object.keys(e).length) return;
    const specs = (draft.specs ?? []).filter(([k, v]) => k.trim() || v.trim());
    onSave({
      ...draft,
      url: draft.url.trim(),
      title: draft.title?.trim() || null,
      image: draft.image?.trim() || null,
      shipping: draft.shipping?.trim() || null,
      price: draft.price && draft.price > 0 ? Math.round(draft.price) : null,
      priceFrom: Boolean(draft.price && draft.priceFrom),
      priceNote: draft.price ? draft.priceNote?.trim() || null : null,
      note: draft.note?.trim() || null,
      specs: specs.length ? specs : null,
    });
  }

  return (
    <Modal title={isNew ? 'Новая позиция на складе' : 'Позиция на складе'} onClose={onCancel}>
      <div className="space-y-5">
        <Field label="Тип" error={errors.group} hint="Карточка типа на главной ведёт на /nalichie/ с фильтром по нему">
          <select className="field" value={draft.group ?? ''} onChange={(e) => set({ group: e.target.value || null })}>
            <option value="">— выберите —</option>
            {KINDS.map(({ kind, label }) => (
              <optgroup key={kind} label={label}>
                {groups
                  .filter((g) => g.kind === kind)
                  .map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Оборудование на сайте</span>
          <CatalogPicker value={draft.url} option={option} catalog={catalog} onChange={(url) => set({ url })} />
          {errors.url && <span className="mt-1 block text-xs text-red-600">{errors.url}</span>}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Наименование" error={errors.title} hint={option || (draft.url && initial.preview) ? 'Пусто — как на странице товара' : undefined}>
            <input
              className="field"
              value={draft.title ?? ''}
              placeholder={option?.name ?? (draft.url === initial.url ? initial.preview?.title : undefined) ?? 'Например: Индукционная печь УИ-0.25Т-250'}
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Количество, шт.">
              <input
                className="field"
                type="number"
                min={0}
                value={draft.qty ?? ''}
                onChange={(e) => set({ qty: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })}
              />
            </Field>
            <Field label="Срок отгрузки">
              <input className="field" value={draft.shipping ?? ''} placeholder="от 3 дней" onChange={(e) => set({ shipping: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Цена, ₽</span>
            <div className="flex items-center gap-3">
              <input
                className="field"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                aria-label="Цена, ₽"
                value={draft.price ?? ''}
                placeholder="Например: 1250000"
                onChange={(e) => set({ price: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })}
              />
              <label className={cx('inline-flex shrink-0 items-center gap-2 text-sm', draft.price ? 'text-slate-700' : 'text-slate-400')}>
                <input type="checkbox" checked={Boolean(draft.priceFrom)} disabled={!draft.price} onChange={(e) => set({ priceFrom: e.target.checked })} />
                «от»
              </label>
            </div>
            <span className="mt-1 block text-xs text-slate-500">
              {draft.price
                ? `На сайте: ${priceText(draft)} — в «Наличии» и на странице товара (с разметкой цены для поисковиков)`
                : 'Пусто — на сайте «Цена по запросу»'}
            </span>
          </div>
          <Field label="Пояснение к цене" hint="Коротко, в одну строку рядом с ценой">
            <input className="field" maxLength={40} value={draft.priceNote ?? ''} placeholder="с НДС" disabled={!draft.price} onChange={(e) => set({ priceNote: e.target.value })} />
          </Field>
        </div>

        <Field label="Фото в карточке" hint={option?.cover || (draft.url === initial.url && initial.preview?.image) ? 'Пусто — фото со страницы товара' : 'Главное фото карточки на /nalichie/'}>
          <MediaInput value={draft.image ?? ''} onChange={(image) => set({ image })} />
        </Field>

        <div>
          <GalleryField
            label="Фото со склада — подтверждают, что позиция действительно в наличии"
            value={draft.photos as Photo[]}
            onChange={(photos) => set({ photos: photos.map((p) => ({ src: p.src, alt: p.alt })) })}
            primary={false}
            folder={photoFolder(draft)}
          />
          <p className="mt-1 text-xs text-slate-500">На сайте — миниатюры под фото карточки; по щелчку и значком справа вверху фото открываются на весь экран.</p>
        </div>

        <SpecsField value={draft.specs ?? []} onChange={(specs) => set({ specs })} fromCatalog={Boolean(option && !option.section)} />

        <Field label="Примечание для себя" hint="На сайт не выводится">
          <textarea className="field min-h-16" value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
        </Field>

        <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
          <Button onClick={onCancel}>Отмена</Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Сохраняем…' : isNew ? 'Добавить на склад' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Выбор товара или раздела каталога (поиск по названию и адресу) или свой адрес. */
function CatalogPicker({ value, option, catalog, onChange }: { value: string; option: CatalogOption | undefined; catalog: CatalogOption[]; onChange: (url: string) => void }) {
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState(Boolean(value && !option));
  const q = query.trim().toLowerCase();
  const found = q
    ? catalog
        .filter((c) => c.name.toLowerCase().includes(q) || c.path.includes(q) || c.where.toLowerCase().includes(q))
        .sort((a, b) => Number(a.section) - Number(b.section))
        .slice(0, 12)
    : [];

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <Thumb src={option?.cover} className="h-12 w-16" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{option?.name ?? 'Страница не из каталога'}</div>
            <div className="truncate text-xs text-slate-500">
              {option ? `${option.section ? 'Раздел' : 'Товар'}${option.where ? ` · ${option.where}` : ''} · ` : ''}
              <span className="font-mono">{value}</span>
            </div>
          </div>
          {option?.draft && <Badge tone="amber">черновик — на сайте без ссылки</Badge>}
          <Button size="sm" variant="ghost" onClick={() => onChange('')}>
            Убрать ссылку
          </Button>
        </div>
      )}
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        <input
          className="field pl-9"
          value={query}
          placeholder={value ? 'Выбрать другое: название товара или раздела…' : 'Найдите в каталоге: название товара или раздела…'}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {q && (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {found.map((c) => (
            <li key={c.path}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50"
                onClick={() => {
                  onChange(c.path);
                  setQuery('');
                  setManual(false);
                }}
              >
                <Thumb src={c.cover} className="h-9 w-12" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-900">{c.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {c.section ? 'Раздел' : 'Товар'}
                    {c.where && ` · ${c.where}`}
                  </span>
                </span>
                {c.draft && <Badge tone="amber">черновик</Badge>}
              </button>
            </li>
          ))}
          {!found.length && <li className="px-3 py-3 text-sm text-slate-500">Ничего не нашлось — проверьте название или укажите адрес вручную.</li>}
        </ul>
      )}
      {manual ? (
        <input className="field font-mono text-xs" value={value} placeholder="/products/…/" onChange={(e) => onChange(e.target.value)} />
      ) : (
        <button type="button" className="text-xs text-slate-500 underline-offset-2 hover:text-brand-700 hover:underline" onClick={() => setManual(true)}>
          Указать адрес страницы вручную
        </button>
      )}
    </div>
  );
}

/** Характеристики позиции: пары «параметр — значение». */
function SpecsField({ value, onChange, fromCatalog }: { value: [string, string][]; onChange: (v: [string, string][]) => void; fromCatalog: boolean }) {
  const set = (i: number, k: 0 | 1, v: string) => onChange(value.map((row, j) => (j === i ? ((k === 0 ? [v, row[1]] : [row[0], v]) as [string, string]) : row)));
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">Характеристики</span>
      <p className="mb-2 text-xs text-slate-500">
        {fromCatalog ? 'Пусто — характеристики из карточки товара. Заполните, если на складе другое исполнение.' : 'Что именно лежит на складе: модель, мощность, размер…'}
      </p>
      <div className="space-y-2">
        {value.map(([k, v], i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="field" value={k} placeholder="Параметр, например «Мощность, кВт»" onChange={(e) => set(i, 0, e.target.value)} />
            <input className="field" value={v} placeholder="Значение" onChange={(e) => set(i, 1, e.target.value)} />
            <IconButton icon="up" label="Выше" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} />
            <IconButton icon="trash" label="Удалить строку" danger onClick={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
        ))}
        <Button size="sm" variant="ghost" className="text-brand-700" onClick={() => onChange([...value, ['', '']])}>
          <Icon name="plus" className="h-4 w-4" />
          Строка
        </Button>
      </div>
    </div>
  );
}

/** Окно типа: название, раздел, фото карточки, метка в адресе фильтра. */
function GroupDialog({
  initial,
  isNew,
  taken,
  saving,
  onCancel,
  onSave,
}: {
  initial: StockGroup;
  isNew: boolean;
  taken: string[];
  saving: boolean;
  onCancel: () => void;
  onSave: (g: StockGroup) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [keyEdited, setKeyEdited] = useState(!isNew);
  const [error, setError] = useState<Record<string, string>>({});

  function submit() {
    const e: Record<string, string> = {};
    const key = draft.key || uniqueKey(draft.title, taken);
    if (!draft.title.trim()) e.title = 'Нужно название';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) e.key = 'Только латиница, цифры и дефисы';
    else if (taken.includes(key)) e.key = 'Такая метка уже есть у другого типа';
    setError(e);
    if (Object.keys(e).length) return;
    onSave({ ...draft, key, title: draft.title.trim(), image: draft.image?.trim() || null });
  }

  return (
    <Modal title={isNew ? 'Новый тип' : 'Тип позиций'} onClose={onCancel}>
      <div className="max-w-2xl space-y-5">
        <Field label="Название" error={error.title} hint="Так называется карточка на главной и кнопка фильтра на /nalichie/">
          <input
            className="field"
            value={draft.title}
            autoFocus
            placeholder="Например: Индукционные нагреватели и печи"
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value, key: keyEdited ? d.key : uniqueKey(e.target.value, taken) }))}
          />
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Раздел</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map(({ kind, label }) => (
              <label key={kind} className={cx('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', draft.kind === kind ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 hover:bg-slate-50')}>
                <input type="radio" name="stock-kind" checked={draft.kind === kind} onChange={() => setDraft((d) => ({ ...d, kind }))} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Фото карточки на главной" hint="Пусто — фото первой позиции этого типа">
          <MediaInput value={draft.image ?? ''} onChange={(image) => setDraft((d) => ({ ...d, image }))} />
        </Field>
        <Field label="Метка в адресе" error={error.key} hint={`Ссылка с главной: /nalichie/?type=${draft.key || '…'}`}>
          <input
            className="field font-mono text-xs"
            value={draft.key}
            onChange={(e) => {
              setKeyEdited(true);
              setDraft((d) => ({ ...d, key: e.target.value.trim().toLowerCase() }));
            }}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button onClick={onCancel}>Отмена</Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Сохраняем…' : isNew ? 'Добавить тип' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
