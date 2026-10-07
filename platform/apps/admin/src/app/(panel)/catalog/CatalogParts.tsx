'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
        ↑
      </button>
      <button type="button" className={btn} disabled={busy || index === ids.length - 1} onClick={() => void move(index + 1)} title={`${label}: ниже`} aria-label={`${label}: ниже`}>
        ↓
      </button>
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
