import type { ReactNode } from 'react';
import { cx } from './ui';

/**
 * Графики обзора — SVG, рисуются на сервере (без библиотек и без JavaScript в
 * браузере). Подсказки при наведении — стандартные (<title>).
 */

/** Цвета рядов: фирменный бирюзовый и зелёный, затем различимые оттенки. */
export const PALETTE = ['#1f5e78', '#4fab3a', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6', '#94a3b8'];

const fmt = (n: number) => n.toLocaleString('ru-RU');

/** Верх шкалы: 1, 2, 5 × 10ⁿ — круглые деления. */
function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/** Мини-график тренда в карточке показателя. */
export function Sparkline({ id, values, className }: { id: string; values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 36;
  const max = Math.max(1, ...values);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cx('h-10 w-28', className)} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface ChartPoint {
  /** подпись по оси X */
  label: string;
  value: number;
  /** подсказка при наведении */
  title: string;
}

/** График по дням: линия с заливкой, сетка, подписи осей, точки с подсказками. */
export function AreaChart({ id, points, height = 240 }: { id: string; points: ChartPoint[]; height?: number }) {
  const w = 760;
  const h = height;
  const pad = { t: 14, r: 12, b: 28, l: 34 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const x = (i: number) => pad.l + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)},${pad.t + ih} L${pad.l},${pad.t + ih} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const every = Math.max(1, Math.ceil(points.length / 8));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="График по дням">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={PALETTE[0]} stopOpacity="0.22" />
          <stop offset="1" stopColor={PALETTE[0]} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t ? '3 4' : undefined} />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
            {t}
          </text>
        </g>
      ))}
      {area && <path d={area} fill={`url(#${id})`} />}
      {line && <path d={line} fill="none" stroke={PALETTE[0]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={p.label + i}>
          {/* широкая невидимая полоса — подсказка ловится по всей высоте дня */}
          <rect x={x(i) - iw / Math.max(1, points.length - 1) / 2} y={pad.t} width={iw / Math.max(1, points.length - 1)} height={ih} fill="transparent">
            <title>{p.title}</title>
          </rect>
          {p.value > 0 && <circle cx={x(i)} cy={y(p.value)} r="3.5" fill="#fff" stroke={PALETTE[0]} strokeWidth="2" pointerEvents="none" />}
          {/* подпись каждого N-го дня и последнего; соседняя с последним, если слишком близко, — без подписи */}
          {(i === points.length - 1 || (i % every === 0 && points.length - 1 - i >= Math.ceil(every / 2))) && (
            <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export interface Slice {
  label: string;
  value: number;
  color?: string;
}

/** Кольцевая диаграмма с итогом в центре и легендой. */
export function Donut({ slices, total, caption }: { slices: Slice[]; total?: number; caption: string }) {
  const sum = slices.reduce((s, x) => s + x.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={caption}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {sum > 0 &&
          slices.map((s, i) => {
            const len = (s.value / sum) * c;
            const el = (
              <circle
                key={s.label}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={s.color ?? PALETTE[i % PALETTE.length]}
                strokeWidth="18"
                strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              >
                <title>{`${s.label}: ${fmt(s.value)}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="600" fill="#0f172a">
          {fmt(total ?? sum)}
        </text>
        <text x="70" y="88" textAnchor="middle" fontSize="11" fill="#64748b">
          {caption}
        </text>
      </svg>
      <ul className="min-w-40 flex-1 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color ?? PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate text-slate-600" title={s.label}>
              {s.label}
            </span>
            <span className="tabular-nums text-slate-900">{fmt(s.value)}</span>
            {sum > 0 && <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{Math.round((s.value / sum) * 100)}%</span>}
          </li>
        ))}
        {!slices.length && <li className="text-slate-400">Нет данных</li>}
      </ul>
    </div>
  );
}

/** Горизонтальные полосы: подпись, значение, доля от наибольшего. */
export function BarList({ items, color = PALETTE[0], empty = 'Нет данных' }: { items: { label: ReactNode; value: number; hint?: string; key?: string }[]; color?: string; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it.key ?? i} title={it.hint}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700">{it.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-slate-900">{fmt(it.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Полоса из долей (доставлено / в очереди / ошибка) с подписями под ней. */
export function StackBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const sum = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {sum > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => <div key={p.label} style={{ width: `${(p.value / sum) * 100}%`, background: p.color }} title={`${p.label}: ${fmt(p.value)}`} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label} <span className="font-medium text-slate-700 tabular-nums">{fmt(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
