'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { ItemActions, move } from './schema-form';
import { RichTextEditor } from './RichTextEditor';
import { RowsEditor, TextInput, type Row } from './text-fields';
import { cx } from './ui';

export type SpecContent = { kind: 'table'; rows: { label: string; value: string }[]; wrapStyle?: string } | { kind: 'html'; html: string };
export type SpecPanel = { id: string; title: string; content: SpecContent[] };
export type SpecBlock = { type: 'productSpec'; nav: { href: string; label: string }[]; panels: SpecPanel[]; [k: string]: unknown };

/** Якорь нового раздела: из названия латиницей, без повторов. */
function anchorFor(title: string, taken: Set<string>): string {
  const map: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya' };
  const base =
    title
      .toLowerCase()
      .split('')
      .map((c) => map[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'razdel';
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

/** Как блок выглядит на сайте: слева меню «Содержание», справа — разделы с текстом и таблицами. */
function Guide({ onAdd, onExpand, onCollapse }: { onAdd: () => void; onExpand: () => void; onCollapse: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex w-64 shrink-0 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-500" aria-hidden="true">
          <div className="w-20 space-y-1 border-r border-slate-200 pr-2">
            <div className="font-semibold tracking-wide uppercase">Содержание</div>
            <div className="rounded bg-brand-100 px-1 text-brand-800">Описание</div>
            <div className="px-1">Характеристики</div>
            <div className="px-1">Комплектация</div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-semibold text-slate-700">Описание</div>
            <div className="h-1.5 rounded bg-slate-300" />
            <div className="h-1.5 w-4/5 rounded bg-slate-300" />
            <div className="mt-1 grid grid-cols-2 gap-px rounded border border-slate-300 bg-slate-300">
              <div className="bg-white px-1">Параметр</div>
              <div className="bg-white px-1">Значение</div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-sm text-slate-600">
          <p>
            Блок под фото товара. <b>Слева — меню «Содержание»</b>: это названия разделов. <b>Справа — сами разделы</b>: текст и таблицы «Параметр — Значение».
          </p>
          <p>Новый раздел = новый пункт меню. Внутри раздела — кнопки «Текст» (как в Word, есть режим HTML-кода) и «Таблица».</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
          <Icon name="plus" className="h-4 w-4" />
          Добавить раздел
        </button>
        <button type="button" onClick={onExpand} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Развернуть все
        </button>
        <button type="button" onClick={onCollapse} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Свернуть все
        </button>
      </div>
    </div>
  );
}

/** Добавить в раздел текст или таблицу. */
function AddContent({ title, onText, onTable }: { title: string; onText: () => void; onTable: () => void }) {
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:border-brand-400 hover:text-brand-700';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
      <span className="text-sm text-slate-500">Добавить в раздел «{plain(title) || 'без названия'}»:</span>
      <button type="button" className={btn} onClick={onText}>
        <Icon name="plus" className="h-4 w-4" />
        Текст
      </button>
      <button type="button" className={btn} onClick={onTable}>
        <Icon name="plus" className="h-4 w-4" />
        Таблица
      </button>
    </div>
  );
}

function ContentCard({ label, hint, actions, children }: { label: string; hint: string; actions: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          <span className="ml-2 text-xs text-slate-400">{hint}</span>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/**
 * «Описание и характеристики» товара: разделы с меню «Содержание» слева.
 * В разделе — тексты (визуальный редактор или HTML-код) и таблицы
 * «Параметр — Значение». Меню следует за разделами: новый раздел
 * добавляется в меню, удалённый — убирается, переименованный —
 * переименовывается (если в меню было то же название).
 */
export function SpecPanelsEditor({ block, onChange }: { block: SpecBlock; onChange: (b: SpecBlock) => void }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const panels = block.panels;
  const setPanels = (next: SpecPanel[], nav = block.nav) => onChange({ ...block, panels: next, nav });

  const rename = (i: number, title: string) => {
    const p = panels[i];
    const nav = block.nav.map((n) => (n.href === `#${p.id}` && n.label === p.title ? { ...n, label: title } : n));
    setPanels(
      panels.map((x, j) => (j === i ? { ...x, title } : x)),
      nav,
    );
  };
  const remove = (i: number) => {
    const p = panels[i];
    if (!confirm(`Удалить раздел «${plain(p.title) || 'без названия'}» вместе с его текстом и таблицами?`)) return;
    setPanels(
      panels.filter((_, j) => j !== i),
      block.nav.filter((n) => n.href !== `#${p.id}`),
    );
  };
  const reorder = (from: number, to: number) => {
    const next = move(panels, from, to);
    // меню — в порядке разделов (пункты без раздела остаются в конце)
    const order = next.map((p) => `#${p.id}`);
    const nav = [...block.nav].sort((a, b) => (order.indexOf(a.href) + 1 || 999) - (order.indexOf(b.href) + 1 || 999));
    setPanels(next, nav);
  };
  const add = () => {
    const title = 'Новый раздел';
    const id = anchorFor(title, new Set(panels.map((p) => p.id)));
    setPanels([...panels, { id, title, content: [{ kind: 'html', html: '<p></p>' }] }], [...block.nav, { href: `#${id}`, label: title }]);
    setOpen((s) => new Set(s).add(panels.length));
  };
  const setContent = (i: number, content: SpecContent[]) => setPanels(panels.map((p, j) => (j === i ? { ...p, content } : p)));

  return (
    <div className="space-y-3">
      <Guide onAdd={add} onExpand={() => setOpen(new Set(panels.map((_, i) => i)))} onCollapse={() => setOpen(new Set())} />
      {panels.map((p, i) => {
        const isOpen = open.has(i);
        const rows = p.content.reduce((n, c) => n + (c.kind === 'table' ? c.rows.length : 0), 0);
        const texts = p.content.filter((c) => c.kind === 'html').length;
        return (
          <section key={p.id} className={cx('rounded-xl border bg-white shadow-xs', isOpen ? 'border-brand-200' : 'border-slate-200')}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggle(i)}>
                <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} className="h-4 w-4 text-slate-400" />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{i + 1}</span>
                <span className="truncate font-medium text-slate-800">{plain(p.title) || 'Без названия'}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {[texts ? 'текст' : '', rows ? `таблица, ${rows} строк` : ''].filter(Boolean).join(' · ') || 'пусто'}
                </span>
              </button>
              <ItemActions onUp={() => reorder(i, i - 1)} onDown={() => reorder(i, i + 1)} onRemove={() => remove(i)} />
            </div>
            {isOpen && (
              <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 px-4 py-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Название раздела <span className="font-normal text-slate-400">(оно же пункт меню «Содержание» слева)</span>
                  </span>
                  <TextInput value={p.title} onChange={(v) => rename(i, v)} />
                </label>
                {p.content.map((c, k) => {
                  const actions = (
                    <ItemActions
                      onUp={() => setContent(i, move(p.content, k, k - 1))}
                      onDown={() => setContent(i, move(p.content, k, k + 1))}
                      onRemove={() => setContent(i, p.content.filter((_, j) => j !== k))}
                    />
                  );
                  return c.kind === 'table' ? (
                    <ContentCard key={k} label="Таблица" hint="строки «Параметр — Значение»" actions={actions}>
                      <RowsEditor
                        rows={c.rows as Row[]}
                        columns={[
                          { key: 'label', label: 'Параметр', placeholder: 'Например: Мощность' },
                          { key: 'value', label: 'Значение', placeholder: 'Например: 24,9 кВт', wide: true },
                        ]}
                        addLabel="Строка"
                        empty="В таблице пока нет строк"
                        onChange={(rows) => setContent(i, p.content.map((x, j) => (j === k ? { ...c, rows: rows as { label: string; value: string }[] } : x)))}
                      />
                    </ContentCard>
                  ) : (
                    <ContentCard key={k} label="Текст" hint="абзацы, списки, подзаголовки, ссылки" actions={actions}>
                      <RichTextEditor value={c.html} onChange={(html) => setContent(i, p.content.map((x, j) => (j === k ? { kind: 'html', html } : x)))} />
                    </ContentCard>
                  );
                })}
                <AddContent
                  title={p.title}
                  onText={() => setContent(i, [...p.content, { kind: 'html', html: '<p></p>' }])}
                  onTable={() => setContent(i, [...p.content, { kind: 'table', rows: [] }])}
                />
              </div>
            )}
          </section>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
      >
        <Icon name="add" className="h-4 w-4" />
        Добавить раздел (новый пункт в меню «Содержание»)
      </button>
    </div>
  );
}
