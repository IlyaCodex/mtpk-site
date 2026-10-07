'use client';

import { useRouter } from 'next/navigation';

export type Option = { value: string; label: string; count: number };
export type CatalogQuery = { c?: string; s?: string; g?: string; q?: string; status?: string };

/**
 * Фильтры каталога: категория → подкатегория → группа (есть у запчастей) →
 * поиск по названию или модели → статус. Выбор в списке сразу применяется;
 * смена уровня сбрасывает уровни ниже.
 */
export function CatalogFilters({
  categories,
  subcategories,
  groups,
  values,
}: {
  categories: Option[];
  subcategories: Option[];
  groups: Option[];
  values: CatalogQuery;
}) {
  const router = useRouter();
  const go = (patch: CatalogQuery) => {
    const next = Object.entries({ ...values, ...patch }).filter(([, v]) => v) as [string, string][];
    router.push(next.length ? `/catalog?${new URLSearchParams(next)}` : '/catalog');
  };

  return (
    <form
      className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
      onSubmit={(e) => {
        e.preventDefault();
        go({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() });
      }}
    >
      <div className={`grid gap-3 ${groups.length ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <Select label="Категория" value={values.c} onChange={(c) => go({ c, s: '', g: '' })} empty="Все категории" options={categories} />
        <Select
          label="Подкатегория"
          value={values.s}
          onChange={(s) => go({ s, g: '' })}
          empty={values.c ? (subcategories.length ? 'Все подкатегории' : 'Нет подкатегорий') : 'Сначала выберите категорию'}
          options={subcategories}
          disabled={!values.c || !subcategories.length}
        />
        {groups.length > 0 && <Select label="Группа" value={values.g} onChange={(g) => go({ g })} empty="Все группы" options={groups} />}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-500">Товар</span>
          <input name="q" key={values.q ?? ''} defaultValue={values.q} placeholder="Название или модель, например УИД-376" className="field" />
        </label>
        <label className="block w-44">
          <span className="mb-1 block text-xs font-medium text-slate-500">Статус</span>
          <select className="field" value={values.status ?? ''} onChange={(e) => go({ status: e.target.value })}>
            <option value="">Любой</option>
            <option value="published">На сайте</option>
            <option value="draft">Черновики</option>
          </select>
        </label>
        <button className="h-9 rounded-lg bg-slate-800 px-5 text-sm font-medium text-white hover:bg-slate-700">Найти</button>
        {(values.c || values.q || values.status) && (
          <button type="button" className="h-9 px-1 text-sm text-slate-500 hover:text-slate-800 hover:underline" onClick={() => router.push('/catalog')}>
            Сбросить
          </button>
        )}
      </div>
    </form>
  );
}

function Select({
  label,
  value,
  onChange,
  empty,
  options,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  empty: string;
  options: Option[];
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <select className="field" value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} · {o.count}
          </option>
        ))}
      </select>
    </label>
  );
}
