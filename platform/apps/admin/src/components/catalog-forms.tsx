'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { api } from '@/lib/client-api';
import { lastSegment, plain, slugify } from '@/lib/catalog';
import { BlockList, type BlockData, type BlockSchemas } from './BlockList';
import { EditorContext } from './editor-context';
import { MediaInput } from './media';
import { Label, RowsEditor, TextInput, type Row } from './text-fields';
import { toast } from './toast';
import { Badge, Button, cx } from './ui';

/** Блок формы: заголовок, подсказка, поля. */
export function FormSection({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
      <header className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

/** Обложка карточки: картинка из медиатеки и её описание. */
export function CoverField({ cover, alt, onChange, hint }: { cover: string; alt: string; onChange: (patch: { cover?: string; coverAlt?: string }) => void; hint?: string }) {
  return (
    <div className="space-y-3">
      <div>
        <Label hint={hint}>Обложка</Label>
        <MediaInput value={cover} onChange={(v) => onChange({ cover: v })} />
      </div>
      <label className="block">
        <Label hint="(для поисковиков и незрячих)">Что на обложке</Label>
        <input className="field" value={alt} onChange={(e) => onChange({ coverAlt: e.target.value })} placeholder="Например: Дробемётная установка кранового типа" />
      </label>
    </div>
  );
}

/**
 * Адрес страницы: раздел выше + своя часть латиницей. Пока адрес не меняли
 * руками, он подставляется из названия.
 */
export function PathField({
  base,
  value,
  onChange,
  locked,
  lockedHint,
  isNew,
}: {
  base: string;
  value: string;
  onChange: (path: string) => void;
  locked?: boolean;
  lockedHint?: string;
  /** новая запись: адрес подставляется из названия */
  isNew?: boolean;
}) {
  const own = value.startsWith(base) ? value.slice(base.length).replace(/\/$/, '') : lastSegment(value);
  return (
    <label className="block">
      <Label hint="(латиницей, через дефис)">Адрес страницы</Label>
      <div className={cx('flex items-center rounded-lg border border-slate-300 bg-white shadow-xs focus-within:border-brand-500', locked && 'bg-slate-50')}>
        <span className="shrink-0 pl-3 font-mono text-xs text-slate-400">{base}</span>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 font-mono text-sm outline-none disabled:text-slate-500"
          value={own}
          disabled={locked}
          onChange={(e) => onChange(`${base}${e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')}/`)}
          placeholder="nazvanie-modeli"
        />
        <span className="pr-3 font-mono text-xs text-slate-400">/</span>
      </div>
      <span className="mt-1 block text-xs text-slate-500">
        {locked ? lockedHint : isNew ? 'Подставляется из названия — можно поменять.' : 'Старый адрес после смены автоматически перенаправит на новый.'}
      </span>
    </label>
  );
}

function StatusField({ value, onChange }: { value: 'published' | 'draft'; onChange: (v: 'published' | 'draft') => void }) {
  return (
    <label className="block">
      <Label>Публикация</Label>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value as 'published' | 'draft')}>
        <option value="published">На сайте</option>
        <option value="draft">Черновик (на сайте не виден)</option>
      </select>
    </label>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Панель формы внизу экрана: сохранить, удалить. */
function Actions({
  saving,
  dirty,
  onSave,
  saveLabel,
  onDelete,
  deleteHint,
  isNew,
}: {
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  saveLabel: string;
  onDelete?: () => void;
  deleteHint?: string;
  isNew?: boolean;
}) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
      <Button variant="primary" onClick={onSave} disabled={saving || !dirty}>
        {saving ? 'Сохраняем…' : saveLabel}
      </Button>
      {dirty && !saving && !isNew && <span className="text-xs text-amber-700">Есть несохранённые изменения</span>}
      <span className="flex-1" />
      {onDelete && (
        <Button variant="danger" size="sm" onClick={onDelete} disabled={saving}>
          Удалить
        </Button>
      )}
      {!onDelete && deleteHint && <span className="text-xs text-slate-400">{deleteHint}</span>}
    </div>
  );
}

/** Состояние формы: черновик, «есть изменения», сохранение с сообщением об ошибке. */
function useDraft<T>(initial: T) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch }));
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    try {
      await fn();
      setSaved(JSON.stringify(draft));
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };
  return { draft, set, dirty: JSON.stringify(draft) !== saved, saving, run };
}

// ── Категория ──────────────────────────────────────────────────────────────

export type CategoryEntity = {
  id: number;
  name: string;
  crumb: string;
  cover: string | null;
  coverAlt: string;
  onHome: boolean;
  kind: string;
  productBlocks: BlockData[];
  page: { id: number; path: string; status: 'published' | 'draft' };
};

export function CategoryForm({ initial, childCount, schemas, products }: { initial?: CategoryEntity; childCount: number; schemas?: BlockSchemas; products: number }) {
  const router = useRouter();
  const isNew = !initial;
  const [pathTouched, setPathTouched] = useState(!isNew);
  const { draft, set, dirty, saving, run } = useDraft({
    name: initial?.name ?? '',
    crumb: initial && initial.crumb !== plain(initial.name) ? initial.crumb : '',
    path: initial?.page.path ?? '/products/',
    cover: initial?.cover ?? '',
    coverAlt: initial?.coverAlt ?? '',
    onHome: initial?.onHome ?? true,
    status: initial?.page.status ?? ('draft' as 'published' | 'draft'),
    productBlocks: initial?.productBlocks ?? [],
  });
  const body = () => ({ ...draft, crumb: draft.crumb || null, cover: draft.cover || null, ...(isNew ? { productBlocks: undefined } : {}) });
  const save = () =>
    run(async () => {
      if (isNew) {
        await api('content/catalog/categories', { json: body() });
        toast.ok('Категория добавлена черновиком. Добавьте подкатегории и опубликуйте её.');
        router.push(`/catalog?c=${lastSegment(draft.path)}`);
      } else {
        await api(`content/catalog/categories/${initial.id}`, { method: 'PUT', json: body() });
        toast.ok('Сохранено — сайт обновится в течение минуты');
        router.refresh();
      }
    });
  const remove = async () => {
    if (!initial || !confirm(`Удалить категорию «${plain(initial.name)}» и её страницу? Старый адрес будет вести в каталог.`)) return;
    try {
      await api(`content/catalog/categories/${initial.id}`, { method: 'DELETE' });
      toast.ok('Категория удалена');
      router.push('/catalog');
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <FormSection title="Карточка на главной" hint="Сетка «Оборудование» на главной странице: обложка и название ведут в категорию.">
        <label className="block">
          <Label>Название</Label>
          <TextInput
            value={draft.name}
            onChange={(name) => set({ name, ...(pathTouched ? {} : { path: `/products/${slugify(name)}/` }) })}
            placeholder="Например: Дробемётное оборудование"
          />
        </label>
        <CoverField cover={draft.cover} alt={draft.coverAlt} onChange={set} hint="(фото 4:3 или 16:10)" />
        <Check checked={draft.onHome} onChange={(onHome) => set({ onHome })}>
          Показывать на главной
        </Check>
      </FormSection>

      <FormSection title="Страница категории">
        <PathField
          base="/products/"
          value={draft.path}
          onChange={(path) => {
            setPathTouched(true);
            set({ path });
          }}
          locked={!isNew && childCount > 0}
          lockedHint="У категории есть подкатегории или товары — их адреса начинаются с адреса категории, поэтому он не меняется."
          isNew={isNew}
        />
        <label className="block">
          <Label hint="(в хлебных крошках; пусто — как название)">Короткое название</Label>
          <TextInput value={draft.crumb} onChange={(crumb) => set({ crumb })} placeholder={plain(draft.name) || 'Например: Дробемёты'} />
        </label>
        {!isNew && <StatusField value={draft.status} onChange={(status) => set({ status })} />}
        {isNew && <p className="text-xs text-slate-500">Категория создаётся черновиком: на сайте её не видно, пока вы не опубликуете её здесь же.</p>}
      </FormSection>

      {!isNew && schemas && (
        <FormSection
          title="Общие секции под каждым товаром категории"
          hint={
            <>
              Формы заявки, преимущества, партнёры — одна копия на все {products} товаров категории. Изменили здесь — изменилось под каждым товаром.
            </>
          }
        >
          <EditorContext.Provider value={{ pagePath: initial.page.path }}>
            <BlockList blocks={draft.productBlocks} schemas={schemas} onChange={(productBlocks) => set({ productBlocks })} />
          </EditorContext.Provider>
        </FormSection>
      )}

      <Actions
        saving={saving}
        dirty={dirty || isNew}
        onSave={() => void save()}
        saveLabel={isNew ? 'Создать категорию' : 'Сохранить'}
        isNew={isNew}
        onDelete={!isNew && childCount === 0 ? () => void remove() : undefined}
        deleteHint={!isNew ? 'Удалить можно пустую категорию' : undefined}
      />
    </div>
  );
}

// ── Подкатегория ──────────────────────────────────────────────────────────

export type Option = { id: number; name: string; path: string };

export type SubcategoryEntity = {
  id: number;
  categoryId: number;
  name: string;
  crumb: string;
  description: string;
  cover: string | null;
  coverAlt: string;
  listed: boolean;
  page: { id: number; path: string; status: 'published' | 'draft' };
};

export function SubcategoryForm({ initial, categories, categoryId, products }: { initial?: SubcategoryEntity; categories: Option[]; categoryId?: number; products: number }) {
  const router = useRouter();
  const isNew = !initial;
  const [pathTouched, setPathTouched] = useState(!isNew);
  const firstCategory = initial?.categoryId ?? categoryId ?? categories[0]?.id ?? 0;
  const catPath = (id: number) => categories.find((c) => c.id === id)?.path ?? '/products/';
  const { draft, set, dirty, saving, run } = useDraft({
    categoryId: firstCategory,
    name: initial?.name ?? '',
    crumb: initial && initial.crumb !== plain(initial.name) ? initial.crumb : '',
    description: initial?.description ?? '',
    path: initial?.page.path ?? catPath(firstCategory),
    cover: initial?.cover ?? '',
    coverAlt: initial?.coverAlt ?? '',
    listed: initial?.listed ?? true,
    status: initial?.page.status ?? ('draft' as 'published' | 'draft'),
  });
  const base = catPath(draft.categoryId);
  const body = () => ({ ...draft, crumb: draft.crumb || null, cover: draft.cover || null });
  const save = () =>
    run(async () => {
      if (isNew) {
        await api('content/catalog/subcategories', { json: body() });
        toast.ok('Подкатегория добавлена черновиком. Добавьте товары и опубликуйте её.');
        router.push(`/catalog?c=${lastSegment(base)}&s=${lastSegment(draft.path)}`);
      } else {
        await api(`content/catalog/subcategories/${initial.id}`, { method: 'PUT', json: body() });
        toast.ok('Сохранено — сайт обновится в течение минуты');
        router.refresh();
      }
    });
  const remove = async () => {
    if (!initial || !confirm(`Удалить подкатегорию «${plain(initial.name)}» и её страницу? Старый адрес будет вести в категорию.`)) return;
    try {
      await api(`content/catalog/subcategories/${initial.id}`, { method: 'DELETE' });
      toast.ok('Подкатегория удалена');
      router.push(`/catalog?c=${lastSegment(base)}`);
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <FormSection title="Карточка в «Модельном ряду» категории" hint="Обложка, название и краткое описание ведут на страницу подкатегории со списком товаров.">
        <label className="block">
          <Label>Категория</Label>
          <select
            className="field"
            value={draft.categoryId}
            disabled={!isNew && products > 0}
            onChange={(e) => {
              const categoryId = Number(e.target.value);
              set({ categoryId, ...(pathTouched ? {} : { path: `${catPath(categoryId)}${slugify(draft.name)}/` }) });
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {plain(c.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Label>Название</Label>
          <TextInput value={draft.name} onChange={(name) => set({ name, ...(pathTouched ? {} : { path: `${base}${slugify(name)}/` }) })} placeholder="Например: Дробемёт кранового типа" />
        </label>
        <label className="block">
          <Label hint="(1–2 предложения под названием)">Краткое описание</Label>
          <TextInput value={draft.description} onChange={(description) => set({ description })} multiline placeholder="Например: Для крупного литья, поковок и сварных конструкций." />
        </label>
        <CoverField cover={draft.cover} alt={draft.coverAlt} onChange={set} hint="(фото 4:3)" />
        <Check checked={draft.listed} onChange={(listed) => set({ listed })}>
          Показывать карточку в «Модельном ряду» категории
        </Check>
      </FormSection>

      <FormSection title="Страница подкатегории">
        <PathField
          base={base}
          value={draft.path}
          onChange={(path) => {
            setPathTouched(true);
            set({ path });
          }}
          locked={!isNew && products > 0}
          lockedHint="В подкатегории есть товары — их адреса начинаются с адреса подкатегории, поэтому он не меняется."
          isNew={isNew}
        />
        <label className="block">
          <Label hint="(в хлебных крошках; пусто — как название)">Короткое название</Label>
          <TextInput value={draft.crumb} onChange={(crumb) => set({ crumb })} placeholder={plain(draft.name) || 'Например: Кранового типа'} />
        </label>
        {!isNew && <StatusField value={draft.status} onChange={(status) => set({ status })} />}
        {isNew && <p className="text-xs text-slate-500">Подкатегория создаётся черновиком: на сайте её не видно, пока вы не опубликуете её здесь же.</p>}
      </FormSection>

      <Actions
        saving={saving}
        dirty={dirty || isNew}
        onSave={() => void save()}
        saveLabel={isNew ? 'Создать подкатегорию' : 'Сохранить'}
        isNew={isNew}
        onDelete={!isNew && products === 0 ? () => void remove() : undefined}
        deleteHint={!isNew ? 'Удалить можно подкатегорию без товаров' : undefined}
      />
    </div>
  );
}

// ── Товар: карточка в каталоге ──────────────────────────────────────────────

export type ProductCardDraft = {
  categoryId: number;
  subcategoryId: number | null;
  name: string;
  nameNote: string;
  path: string;
  cover: string;
  coverAlt: string;
  badge: string;
  origin: string;
  caption: string;
  label: string;
  linkText: string;
  /** гарантия в «Преимуществах» под товаром; пусто — 18 месяцев */
  warranty: string;
  specs: { label: string; value: string }[];
  listed: boolean;
};

export type SubOption = Option & { categoryId: number };

/** Тело запроса карточки товара: пустые необязательные поля — «нет значения». */
export const productCardBody = (d: ProductCardDraft) => ({
  ...d,
  nameNote: d.nameNote || null,
  cover: d.cover || null,
  badge: d.badge || null,
  origin: d.origin || null,
  caption: d.caption || null,
  label: d.label || null,
  linkText: d.linkText || null,
  warranty: d.warranty || null,
});

/** Где товар в каталоге: категория и подкатегория. */
function PlaceFields({
  draft,
  set,
  categories,
  subcategories,
  onParent,
}: {
  draft: ProductCardDraft;
  set: (patch: Partial<ProductCardDraft>) => void;
  categories: Option[];
  subcategories: SubOption[];
  onParent?: (parentPath: string) => void;
}) {
  const subs = subcategories.filter((s) => s.categoryId === draft.categoryId);
  const parentPath = (categoryId: number, subcategoryId: number | null) =>
    (subcategoryId ? subcategories.find((s) => s.id === subcategoryId)?.path : categories.find((c) => c.id === categoryId)?.path) ?? '/products/';
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <Label>Категория</Label>
        <select
          className="field"
          value={draft.categoryId}
          onChange={(e) => {
            const categoryId = Number(e.target.value);
            const first = subcategories.find((s) => s.categoryId === categoryId)?.id ?? null;
            set({ categoryId, subcategoryId: first });
            onParent?.(parentPath(categoryId, first));
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {plain(c.name)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <Label>Подкатегория</Label>
        <select
          className="field"
          value={draft.subcategoryId ?? ''}
          onChange={(e) => {
            const subcategoryId = e.target.value ? Number(e.target.value) : null;
            set({ subcategoryId });
            onParent?.(parentPath(draft.categoryId, subcategoryId));
          }}
        >
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {plain(s.name)}
            </option>
          ))}
          <option value="">— без подкатегории (прямо в категории) —</option>
        </select>
      </label>
    </div>
  );
}

const SPEC_COLUMNS = [
  { key: 'label', label: 'Параметр', placeholder: 'Например: Мощность' },
  { key: 'value', label: 'Значение', placeholder: 'Например: 24,9 кВт' },
];

/**
 * Карточка товара в каталоге: где он (категория и подкатегория), обложка,
 * название, характеристики в карточке, порядок показа и адрес страницы.
 */
export function ProductCardFields({
  draft,
  set,
  categories,
  subcategories,
  pathLocked,
  onPathEdit,
  isNew,
}: {
  draft: ProductCardDraft;
  set: (patch: Partial<ProductCardDraft>) => void;
  categories: Option[];
  subcategories: SubOption[];
  pathLocked?: boolean;
  isNew?: boolean;
  /** адрес поменяли руками — больше не подставлять его из названия */
  onPathEdit?: () => void;
}) {
  const parent = (draft.subcategoryId ? subcategories.find((s) => s.id === draft.subcategoryId)?.path : categories.find((c) => c.id === draft.categoryId)?.path) ?? '/products/';
  // своя часть адреса (после раздела) — при переносе товара в другой раздел остаётся
  const own = draft.path.startsWith(parent) ? draft.path.slice(parent.length) : `${lastSegment(draft.path)}/`;
  const [advanced, setAdvanced] = useState(Boolean(draft.badge || draft.origin || draft.caption || draft.label || draft.linkText || draft.nameNote || draft.warranty));
  return (
    <div className="space-y-5">
      <FormSection title="Где товар в каталоге" hint="Карточка появится в списке выбранной подкатегории (или категории, если подкатегории нет).">
        <PlaceFields draft={draft} set={set} categories={categories} subcategories={subcategories} onParent={(p) => set({ path: `${p}${own}` })} />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={draft.listed} onChange={(e) => set({ listed: e.target.checked })} />
          <span>Показывать в списке товаров {draft.listed ? '' : <Badge>сейчас скрыт — страница доступна по прямой ссылке</Badge>}</span>
        </label>
      </FormSection>

      <FormSection title="Карточка в списке товаров" hint="Обложка, название и характеристики — как их видят в списке. Заголовок и фото на самой странице товара — во вкладке «Страница товара».">
        <label className="block">
          <Label>Название в карточке</Label>
          <TextInput value={draft.name} onChange={(name) => set({ name })} placeholder="Например: УИД-376" />
        </label>
        <CoverField cover={draft.cover} alt={draft.coverAlt} onChange={set} />
        <div>
          <Label hint="(3–5 строк в карточке)">Характеристики в карточке</Label>
          <RowsEditor
            rows={draft.specs as Row[]}
            columns={SPEC_COLUMNS}
            addLabel="+ Характеристика"
            empty="Характеристик в карточке нет"
            onChange={(rows) => set({ specs: rows.map((r) => ({ label: r.label ?? '', value: r.value ?? '' })) })}
          />
        </div>
        <button type="button" className="text-sm text-brand-600 hover:underline" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? '▾' : '▸'} Дополнительно: плашка, подпись, надпись ссылки, гарантия
        </button>
        {advanced && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <Label hint="(после названия, не ссылкой)">Примечание к названию</Label>
              <TextInput value={draft.nameNote} onChange={(nameNote) => set({ nameNote })} placeholder="Например: (на гидравлике)" />
            </label>
            <label className="block">
              <Label hint="(на обложке)">Плашка</Label>
              <TextInput value={draft.badge} onChange={(badge) => set({ badge })} placeholder="Например: Сталь / чугун" />
            </label>
            <label className="block">
              <Label>Происхождение</Label>
              <TextInput value={draft.origin} onChange={(origin) => set({ origin })} placeholder="Например: Производство Россия" />
            </label>
            <label className="block">
              <Label>Подпись под названием</Label>
              <TextInput value={draft.caption} onChange={(caption) => set({ caption })} />
            </label>
            <label className="block">
              <Label hint="(линейки ЛВМ, ЛГМ, ХТС)">Надпись над названием</Label>
              <TextInput value={draft.label} onChange={(label) => set({ label })} placeholder="Например: Воск · Модельный автомат" />
            </label>
            <label className="block">
              <Label hint="(вместо «Подробнее»)">Надпись ссылки</Label>
              <TextInput value={draft.linkText} onChange={(linkText) => set({ linkText })} placeholder="Например: Получить расчёт" />
            </label>
            <label className="block">
              <Label hint="(в блоке «Преимущества» под товаром; пусто — 18 месяцев)">Гарантия</Label>
              <TextInput value={draft.warranty} onChange={(warranty) => set({ warranty })} placeholder="Например: 12 месяцев" />
            </label>
          </div>
        )}
      </FormSection>

      <FormSection title="Адрес страницы товара">
        <PathField
          base={parent}
          value={draft.path}
          onChange={(path) => {
            onPathEdit?.();
            set({ path });
          }}
          locked={pathLocked}
          isNew={isNew}
        />
      </FormSection>
    </div>
  );
}

/** Новый товар: где он, название, обложка, характеристики, адрес — остальное на его странице. */
export function NewProductForm({ categories, subcategories, categoryId, subcategoryId }: { categories: Option[]; subcategories: SubOption[]; categoryId?: number; subcategoryId?: number | null }) {
  const router = useRouter();
  const cat = categoryId ?? categories[0]?.id ?? 0;
  const sub = subcategoryId !== undefined ? subcategoryId : (subcategories.find((s) => s.categoryId === cat)?.id ?? null);
  const parent = (sub ? subcategories.find((s) => s.id === sub)?.path : categories.find((c) => c.id === cat)?.path) ?? '/products/';
  const [pathTouched, setPathTouched] = useState(false);
  const { draft, set, saving, run } = useDraft<ProductCardDraft>({
    categoryId: cat,
    subcategoryId: sub,
    name: '',
    nameNote: '',
    path: parent,
    cover: '',
    coverAlt: '',
    badge: '',
    origin: '',
    caption: '',
    label: '',
    linkText: '',
    warranty: '',
    specs: [],
    listed: true,
  });
  // пока адрес не меняли руками, он подставляется из названия
  const setWithPath = (patch: Partial<ProductCardDraft>) => {
    if (!pathTouched && patch.name !== undefined) {
      const next = { ...draft, ...patch };
      const base = (next.subcategoryId ? subcategories.find((s) => s.id === next.subcategoryId)?.path : categories.find((c) => c.id === next.categoryId)?.path) ?? '/products/';
      patch = { ...patch, path: `${base}${slugify(next.name)}/` };
    }
    set(patch);
  };
  const create = () =>
    run(async () => {
      const { warranty, ...body } = productCardBody(draft);
      // гарантия не задана — у нового товара такая же, как у соседних
      const res = await api<{ id: number }>('content/catalog/products', { json: warranty ? { ...body, warranty } : body });
      toast.ok('Товар создан черновиком. Заполните фото и описание и опубликуйте его.');
      router.push(`/catalog/products/${res.id}`);
    });
  return (
    <div className="max-w-4xl space-y-5">
      <ProductCardFields draft={draft} set={setWithPath} categories={categories} subcategories={subcategories} onPathEdit={() => setPathTouched(true)} isNew />
      <p className="text-xs text-slate-500">
        Товар создаётся черновиком. Его страница заполнится из карточки: название, обложка как главное фото, характеристики; кнопки, доставка и гарантия — как у соседних товаров. Формы и преимущества под товаром — общие для категории.
      </p>
      <Actions saving={saving} dirty onSave={() => void create()} saveLabel="Создать товар" isNew />
    </div>
  );
}
