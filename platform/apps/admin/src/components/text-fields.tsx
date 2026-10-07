'use client';

import type { ReactNode } from 'react';
import { ItemActions, move } from './schema-form';
import { Button, cx } from './ui';

/**
 * Поля для текстов сайта. В вёрстке тексты хранятся с HTML-сущностями
 * (неразрывный пробел &nbsp; не даёт отрываться предлогам). Менеджер видит
 * обычный текст: сущности раскрываются при показе и возвращаются при
 * сохранении. Текст с тегами (<em>, <br>) показывается как есть — HTML.
 */
const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…', times: '×' };

export const hasTags = (s: string) => /<[a-z/!][^>]*>/i.test(s);

export function fromHtml(s: string): string {
  if (hasTags(s)) return s;
  return s.replace(/&(#\d+|[a-z]+);/gi, (m, e: string) => (e.startsWith('#') ? String.fromCodePoint(Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m)));
}

export function toHtml(s: string, wasHtml: boolean): string {
  if (wasHtml && hasTags(s)) return s;
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
}

/** Однострочный (или многострочный) текст сайта. */
export function TextInput({
  value,
  onChange,
  placeholder,
  multiline,
  className,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const raw = value ?? '';
  const html = hasTags(raw);
  const shown = fromHtml(raw);
  const set = (v: string) => onChange(toHtml(v, html));
  const field = multiline ? (
    <textarea className={cx('field', html && 'font-mono text-xs', className)} rows={Math.min(8, Math.max(2, Math.ceil(shown.length / 80) + 1))} value={shown} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
  ) : (
    <input className={cx('field', html && 'font-mono text-xs', className)} value={shown} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
  );
  return html ? (
    <div>
      {field}
      <span className="mt-0.5 block text-[11px] text-slate-400">Содержит оформление (HTML): &lt;em&gt; — акцент, &lt;br&gt; — перенос строки</span>
    </div>
  ) : (
    field
  );
}

/** Подпись поля формы товара. */
export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1 block text-sm font-medium text-slate-700">
      {children}
      {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
    </span>
  );
}

export type Row = Record<string, string>;

/**
 * Таблица «Параметр — Значение»: строки с перестановкой, удалением и
 * добавлением. Ключи столбцов задаются (у ключевых параметров — label/num,
 * у характеристик — label/value).
 */
export function RowsEditor({
  rows,
  onChange,
  columns,
  addLabel = '+ Строка',
  empty = 'Строк нет',
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  columns: { key: string; label: string; placeholder?: string; wide?: boolean }[];
  addLabel?: string;
  empty?: string;
}) {
  const set = (i: number, key: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const template = columns.map((c) => (c.wide ? 'minmax(0,1.4fr)' : 'minmax(0,1fr)')).join(' ');
  return (
    <div>
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500" style={{ gridTemplateColumns: `${template} 4.5rem` }}>
            {columns.map((c) => (
              <span key={c.key}>{c.label}</span>
            ))}
            <span />
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <div key={i} className="grid items-center gap-2 px-3 py-1.5" style={{ gridTemplateColumns: `${template} 4.5rem` }}>
                {columns.map((c) => (
                  <TextInput key={c.key} value={r[c.key]} placeholder={c.placeholder} onChange={(v) => set(i, c.key, v)} />
                ))}
                <ItemActions onUp={() => onChange(move(rows, i, i - 1))} onDown={() => onChange(move(rows, i, i + 1))} onRemove={() => onChange(rows.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-sm text-slate-500">{empty}</p>
      )}
      <Button size="sm" className="mt-2" onClick={() => onChange([...rows, Object.fromEntries(columns.map((c) => [c.key, '']))])}>
        {addLabel}
      </Button>
    </div>
  );
}

/** Текст в HTML (абзацы, списки, ссылки) — моноширинным шрифтом, с подсказкой. */
export function HtmlArea({ value, onChange, rows }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      className="field font-mono text-xs leading-5"
      rows={rows ?? Math.min(24, Math.max(5, value.split('\n').length + 1))}
      spellCheck
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
