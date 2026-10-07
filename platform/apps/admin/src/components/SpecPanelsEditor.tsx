'use client';

import { useState } from 'react';
import { ItemActions, move } from './schema-form';
import { RichTextEditor } from './RichTextEditor';
import { RowsEditor, TextInput, type Row } from './text-fields';
import { Button, cx } from './ui';

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

/**
 * Характеристики товара: разделы (вкладки на сайте), в каждом — таблицы
 * «Параметр — Значение» и тексты. Оглавление разделов на сайте следует за
 * ними: новый раздел добавляется в оглавление, удалённый — убирается,
 * переименованный — переименовывается (если в оглавлении было то же название).
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
    setPanels(
      panels.filter((_, j) => j !== i),
      block.nav.filter((n) => n.href !== `#${p.id}`),
    );
  };
  const reorder = (from: number, to: number) => {
    const next = move(panels, from, to);
    // оглавление — в порядке разделов (пункты без раздела остаются в конце)
    const order = next.map((p) => `#${p.id}`);
    const nav = [...block.nav].sort((a, b) => (order.indexOf(a.href) + 1 || 999) - (order.indexOf(b.href) + 1 || 999));
    setPanels(next, nav);
  };
  const add = () => {
    const title = 'Новый раздел';
    const id = anchorFor(title, new Set(panels.map((p) => p.id)));
    setPanels([...panels, { id, title, content: [{ kind: 'table', rows: [] }] }], [...block.nav, { href: `#${id}`, label: title }]);
    setOpen((s) => new Set(s).add(panels.length));
  };
  const setContent = (i: number, content: SpecContent[]) => setPanels(panels.map((p, j) => (j === i ? { ...p, content } : p)));

  return (
    <div className="space-y-3">
      {panels.map((p, i) => {
        const isOpen = open.has(i);
        const rows = p.content.reduce((n, c) => n + (c.kind === 'table' ? c.rows.length : 0), 0);
        return (
          <section key={p.id} className={cx('rounded-xl border bg-white shadow-xs', isOpen ? 'border-brand-200' : 'border-slate-200')}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggle(i)}>
                <span className="w-4 text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                <span className="truncate font-medium text-slate-800">{p.title.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') || 'Без названия'}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {rows ? `${rows} строк` : ''}
                  {p.content.some((c) => c.kind === 'html') ? `${rows ? ' · ' : ''}текст` : ''}
                </span>
              </button>
              <ItemActions onUp={() => reorder(i, i - 1)} onDown={() => reorder(i, i + 1)} onRemove={() => remove(i)} />
            </div>
            {isOpen && (
              <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Название раздела</span>
                  <TextInput value={p.title} onChange={(v) => rename(i, v)} />
                </label>
                {p.content.map((c, k) => (
                  <div key={k} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{c.kind === 'table' ? 'Таблица' : 'Текст'}</span>
                      <ItemActions
                        onUp={() => setContent(i, move(p.content, k, k - 1))}
                        onDown={() => setContent(i, move(p.content, k, k + 1))}
                        onRemove={() => setContent(i, p.content.filter((_, j) => j !== k))}
                      />
                    </div>
                    {c.kind === 'table' ? (
                      <RowsEditor
                        rows={c.rows as Row[]}
                        columns={[
                          { key: 'label', label: 'Параметр', placeholder: 'Например: Мощность' },
                          { key: 'value', label: 'Значение', placeholder: 'Например: 24,9 кВт', wide: true },
                        ]}
                        addLabel="+ Параметр"
                        empty="В таблице пока нет строк"
                        onChange={(rows) => setContent(i, p.content.map((x, j) => (j === k ? { ...c, rows: rows as { label: string; value: string }[] } : x)))}
                      />
                    ) : (
                      <RichTextEditor value={c.html} onChange={(html) => setContent(i, p.content.map((x, j) => (j === k ? { kind: 'html', html } : x)))} />
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setContent(i, [...p.content, { kind: 'table', rows: [] }])}>
                    + Таблица
                  </Button>
                  <Button size="sm" onClick={() => setContent(i, [...p.content, { kind: 'html', html: '<p></p>' }])}>
                    + Текст
                  </Button>
                </div>
              </div>
            )}
          </section>
        );
      })}
      <Button onClick={add}>+ Раздел характеристик</Button>
    </div>
  );
}
