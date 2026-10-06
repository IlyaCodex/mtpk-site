'use client';

import { useState } from 'react';
import { defaultFor, ItemActions, move, ObjectFields, summarize, type JsonSchema } from './schema-form';
import { Badge, Button, cx } from './ui';

export type BlockData = { type: string; [key: string]: unknown };
export type BlockSchemas = Record<string, { label: string; schema: JsonSchema }>;

/** Блоки, которые чаще всего добавляют на страницы, — первыми в списке. */
const COMMON = ['text', 'html', 'leadgen', 'faq', 'stats', 'catalogList', 'productHero', 'productSpec', 'categoryHero'];

function AddBlock({ schemas, onAdd }: { schemas: BlockSchemas; onAdd: (b: BlockData) => void }) {
  const [type, setType] = useState('');
  const types = Object.keys(schemas).sort((a, b) => {
    const ia = COMMON.indexOf(a);
    const ib = COMMON.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || schemas[a].label.localeCompare(schemas[b].label);
  });
  return (
    <div className="flex gap-2">
      <select className="field max-w-72" value={type} onChange={(e) => setType(e.target.value)} aria-label="Тип нового блока">
        <option value="">Выберите тип блока…</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {schemas[t].label}
          </option>
        ))}
        <option value="container">Контейнер (группа блоков)</option>
      </select>
      <Button
        disabled={!type}
        onClick={() => {
          if (type === 'container') onAdd({ type: 'container', tag: 'div', children: [] });
          else onAdd(defaultFor(schemas[type].schema, schemas[type].schema) as BlockData);
          setType('');
        }}
      >
        + Добавить блок
      </Button>
    </div>
  );
}

/** Подпись блока «HTML как есть»: класс или id внешнего элемента — чтобы различать секции. */
function htmlCaption(html: string): string {
  const open = html.match(/^\s*<([a-z0-9-]+)([^>]*)>/i);
  if (!open) return '';
  const cls = open[2].match(/class="([^"]+)"/)?.[1]?.split(/\s+/)[0];
  const id = open[2].match(/id="([^"]+)"/)?.[1];
  return `<${open[1]}${cls ? `.${cls}` : ''}${id ? `#${id}` : ''}>`;
}

/**
 * Список блоков страницы: порядок, добавление, удаление, дублирование;
 * поля блока — форма по его схеме. Контейнер (обёртка с вложенными
 * блоками) раскрывается вложенным списком.
 */
export function BlockList({
  blocks,
  schemas,
  onChange,
  depth = 0,
}: {
  blocks: BlockData[];
  schemas: BlockSchemas;
  onChange: (blocks: BlockData[]) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const set = (i: number, b: BlockData) => onChange(blocks.map((x, j) => (j === i ? b : x)));

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const def = schemas[block.type];
        const isOpen = open.has(i);
        const caption =
          block.type === 'html'
            ? htmlCaption(String(block.html ?? ''))
            : block.type === 'container'
              ? `<${String(block.tag)}> · ${(block.children as BlockData[]).length} блоков`
              : summarize(block);
        return (
          <div key={i} className={cx('rounded-xl border bg-white shadow-xs', isOpen ? 'border-brand-200' : 'border-slate-200')}>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <button type="button" onClick={() => toggle(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="w-4 text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                <Badge tone={block.type === 'html' ? 'amber' : block.type === 'container' ? 'gray' : 'blue'}>
                  {def?.label ?? (block.type === 'container' ? 'Контейнер' : block.type)}
                </Badge>
                <span className="truncate text-sm text-slate-600">{caption}</span>
              </button>
              <ItemActions
                onUp={() => onChange(move(blocks, i, i - 1))}
                onDown={() => onChange(move(blocks, i, i + 1))}
                onRemove={() => onChange(blocks.filter((_, j) => j !== i))}
                extra={
                  <button
                    type="button"
                    className="rounded p-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    title="Дублировать"
                    onClick={() => onChange([...blocks.slice(0, i + 1), structuredClone(block), ...blocks.slice(i + 1)])}
                  >
                    ⧉
                  </button>
                }
              />
            </div>
            {isOpen && (
              <div className="border-t border-slate-100 px-4 py-4">
                {block.type === 'container' ? (
                  <div className="space-y-3">
                    <ObjectFields
                      schema={{
                        type: 'object',
                        properties: {
                          tag: { type: 'string', description: 'Тег обёртки' },
                          attrs: { type: 'object', editor: 'attrs', description: 'Атрибуты (class, id…)' },
                        },
                        required: ['tag'],
                      }}
                      root={{}}
                      value={block}
                      onChange={(v) => set(i, v as BlockData)}
                    />
                    <div className="rounded-lg bg-slate-50 p-3">
                      <BlockList
                        blocks={block.children as BlockData[]}
                        schemas={schemas}
                        depth={depth + 1}
                        onChange={(children) => set(i, { ...block, children })}
                      />
                    </div>
                  </div>
                ) : def ? (
                  <>
                    {block.type === 'html' && (
                      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Секция перенесена со старого сайта как есть. Её можно править в HTML или заменить блоком с полями.
                      </p>
                    )}
                    {Object.keys(def.schema.properties ?? {}).filter((k) => k !== 'type').length ? (
                      <ObjectFields schema={def.schema} root={def.schema} value={block} onChange={(v) => set(i, v as BlockData)} skip={['type']} />
                    ) : (
                      <p className="text-sm text-slate-500">Общий блок сайта: настроек нет, содержимое одинаково на всех страницах.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-red-600">Неизвестный тип блока «{block.type}».</p>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!blocks.length && <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Блоков нет.</p>}
      <AddBlock schemas={schemas} onAdd={(b) => {
        onChange([...blocks, b]);
        setOpen((s) => new Set(s).add(blocks.length));
      }} />
    </div>
  );
}
