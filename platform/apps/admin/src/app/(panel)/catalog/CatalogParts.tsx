'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { toast } from '@/components/toast';
import { api } from '@/lib/client-api';

type Kind = 'categories' | 'subcategories' | 'products';

/**
 * Стрелки «выше / ниже»: порядок карточек на сайте (категорий — на главной,
 * подкатегорий — в «Модельном ряду», товаров — в списке подкатегории).
 */
export function Reorder({ kind, ids, index, label }: { kind: Kind; ids: number[]; index: number; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const move = async (to: number) => {
    const next = [...ids];
    const [x] = next.splice(index, 1);
    next.splice(to, 0, x);
    setBusy(true);
    try {
      await api('content/catalog/reorder', { json: { kind, ids: next } });
      router.refresh();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  const btn = 'flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700 disabled:opacity-30';
  return (
    <span className="inline-flex gap-1" onClick={(e) => e.preventDefault()}>
      <button type="button" className={btn} disabled={busy || index === 0} onClick={() => void move(index - 1)} title={`${label}: выше`} aria-label={`${label}: выше`}>
        <Icon name="up" className="h-4 w-4" />
      </button>
      <button type="button" className={btn} disabled={busy || index === ids.length - 1} onClick={() => void move(index + 1)} title={`${label}: ниже`} aria-label={`${label}: ниже`}>
        <Icon name="down" className="h-4 w-4" />
      </button>
    </span>
  );
}

const INSIDE: Record<Kind, string> = {
  categories: ' вместе со всеми подкатегориями и товарами',
  subcategories: ' вместе со всеми товарами',
  products: '',
};

/**
 * Тумблер «На сайте / Скрыта»: скрытая категория, подкатегория или товар (и всё, что внутри) пропадают с сайта —
 * страницы 404, нет в карте сайта, поиске, сетках и меню. Данные не удаляются: включили — всё вернулось.
 * parent — раздел выше уже скрыт: запись не видна на сайте независимо от своего тумблера.
 */
export function SiteToggle({ kind, id, hidden, parent, label }: { kind: Kind; id: number; hidden: boolean; parent?: string | null; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    const next = !hidden;
    if (next && !window.confirm(`Скрыть «${label}» с сайта${INSIDE[kind]}?\n\nСтраницы перестанут открываться, пропадут из карты сайта, поиска, меню и сеток каталога. Данные сохранятся — тумблер вернёт всё обратно.`)) return;
    setBusy(true);
    try {
      const res = await api<{ pages: number }>(`content/catalog/${kind}/${id}/hidden`, { method: 'PUT', json: { hidden: next } });
      toast.ok(next ? `Скрыто с сайта (страниц: ${res.pages})` : `Снова на сайте (страниц: ${res.pages})`);
      router.refresh();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  const on = !hidden;
  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label}: ${on ? 'показывается на сайте' : 'скрыта на сайте'}`}
        title={on ? `Показывается на сайте — выключите, чтобы скрыть${INSIDE[kind]}` : 'Скрыта на сайте — включите, чтобы показывать'}
        disabled={busy}
        onClick={() => void toggle()}
        className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
      >
        <span className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
        <span className="whitespace-nowrap">{on ? 'На сайте' : 'Скрыта'}</span>
      </button>
      {parent && on && <span className="text-[11px] whitespace-nowrap text-amber-700">скрыта: {parent}</span>}
    </span>
  );
}

/** Поиск товара по названию, модели или адресу — во всём каталоге. */
export function CatalogSearch({ value }: { value: string }) {
  const router = useRouter();
  return (
    <form
      className="mb-6 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
        router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
      }}
    >
      <input name="q" defaultValue={value} className="field max-w-md" placeholder="Найти товар: название, модель (УИД-376) или адрес" />
      <button type="submit" className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50">
        Найти
      </button>
      {value && (
        <button type="button" className="h-9 px-2 text-sm text-slate-500 hover:text-slate-800" onClick={() => router.push('/catalog')}>
          Сбросить
        </button>
      )}
    </form>
  );
}
