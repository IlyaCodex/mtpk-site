'use client';

import type { CSSProperties } from 'react';
import { ColorChooser } from '@/components/icon-picker';
import { cx } from '@/components/ui';

/** Оформление кнопок сайта (settings.design): не задано — как в дизайне. */
export type ButtonDesign = { buttonRadius?: number; buttonColor?: string; buttonTextColor?: string; buttonOutlineColor?: string };

/** Цвета кнопок «как в дизайне» — для примера (tokens.css). */
const DEFAULT = { color: '#4fab3a', text: '#ffffff', outline: '#4fab3a', radius: 10 };
const PRESETS: [radius: number | undefined, label: string][] = [
  [undefined, 'Как в дизайне (10 px)'],
  [0, 'Прямые'],
  [4, 'Чуть скруглённые'],
  [8, 'Скруглённые'],
  [14, 'Сильно скруглённые'],
  [30, 'Таблетка'],
];
const radiusCss = (r: number | undefined) => (r === undefined ? `${DEFAULT.radius}px` : r >= 30 ? '999px' : `${r}px`);

/** Пример кнопок сайта с выбранным оформлением (на светлом и тёмном фоне). */
function Sample({ value, dark }: { value: ButtonDesign; dark?: boolean }) {
  const radius = radiusCss(value.buttonRadius);
  const base: CSSProperties = {
    borderRadius: radius,
    padding: '12px 22px',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    lineHeight: 1,
  };
  const outline = value.buttonOutlineColor ?? (dark ? '#8fcc7b' : DEFAULT.outline);
  const arrow = (
    <svg width="14" height="12" viewBox="4 5 16 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
  return (
    <div className={cx('flex flex-wrap items-center gap-3 rounded-xl p-5', dark ? 'bg-[#11181b]' : 'bg-[#fafafa] ring-1 ring-slate-200')}>
      <span style={{ ...base, background: value.buttonColor ?? DEFAULT.color, color: value.buttonTextColor ?? DEFAULT.text, boxShadow: `0 8px 20px -6px ${value.buttonColor ?? DEFAULT.color}99` }}>Запросить цену {arrow}</span>
      <span style={{ ...base, border: `1.5px solid ${outline}`, color: outline }}>Получить консультацию {arrow}</span>
    </div>
  );
}

/**
 * Вкладка «Оформление: кнопки» в настройках сайта: скругление углов и цвета
 * кнопок — для всех страниц сразу (переменные --design-* на <html>, правила —
 * apps/web/public/css/base-layout.css, раздел «Кнопки и чекбоксы»).
 */
export function ButtonDesignEditor({ value, onChange }: { value: ButtonDesign | undefined; onChange: (v: ButtonDesign | undefined) => void }) {
  const v = value ?? {};
  const set = (patch: Partial<ButtonDesign>) => {
    const next: ButtonDesign = { ...v, ...patch };
    for (const k of Object.keys(next) as (keyof ButtonDesign)[]) if (next[k] === undefined) delete next[k];
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Скругление и цвета кнопок на всех страницах сайта: «Запросить цену», кнопки форм, «Перезвонить» в шапке, кнопки каталога и запчастей. Пусто — как в
        дизайне сайта.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Sample value={v} />
        <Sample value={v} dark />
      </div>

      <section className="space-y-2">
        <div className="text-sm font-medium text-slate-700">Скругление углов</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([r, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => set({ buttonRadius: r })}
              className={cx('h-8 border px-3 text-xs', v.buttonRadius === r ? 'border-brand-500 bg-brand-50 font-medium text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}
              style={{ borderRadius: r === 0 ? 2 : radiusCss(r) }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={v.buttonRadius ?? DEFAULT.radius}
            onChange={(e) => set({ buttonRadius: Number(e.target.value) })}
            className="w-64 accent-brand-600"
            aria-label="Скругление углов, px"
          />
          <span className="tabular-nums">{v.buttonRadius === undefined ? 'как в дизайне' : v.buttonRadius >= 30 ? 'таблетка' : `${v.buttonRadius} px`}</span>
        </label>
      </section>

      <section className="space-y-2">
        <div className="text-sm font-medium text-slate-700">Цвет кнопок</div>
        <ColorChooser value={v.buttonColor ?? null} onChange={(c) => set({ buttonColor: c ?? undefined })} designHint="Как в дизайне: фирменный зелёный" />
      </section>
      <section className="space-y-2">
        <div className="text-sm font-medium text-slate-700">Цвет текста на кнопках</div>
        <ColorChooser value={v.buttonTextColor ?? null} onChange={(c) => set({ buttonTextColor: c ?? undefined })} designHint="Как в дизайне: белый" />
      </section>
      <section className="space-y-2">
        <div className="text-sm font-medium text-slate-700">Контурные кнопки («Получить консультацию»): рамка и текст</div>
        <ColorChooser value={v.buttonOutlineColor ?? null} onChange={(c) => set({ buttonOutlineColor: c ?? undefined })} designHint="Как в дизайне: фирменный зелёный" />
        <p className="text-xs text-slate-500">В тёмной теме контурные кнопки светлее — оттенок подбирается сам.</p>
      </section>
    </div>
  );
}
