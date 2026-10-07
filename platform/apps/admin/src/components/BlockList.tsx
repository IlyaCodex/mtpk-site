'use client';

import { useState } from 'react';
import { HtmlFieldsEditor, sectionTitle } from './html-fields';
import { defaultFor, ItemActions, move, ObjectFields, SchemaField, summarize, type JsonSchema } from './schema-form';
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

/**
 * Секция, перенесённая со старого сайта: «Поля» — тексты, ссылки, картинки и
 * списки (карточки, пункты) подписанными полями; «HTML» — разметка целиком.
 */
function HtmlSection({ block, schema, onChange }: { block: BlockData; schema: JsonSchema; onChange: (b: BlockData) => void }) {
  const [mode, setMode] = useState<'fields' | 'html'>(() => (String(block.html ?? '').trimStart().startsWith('<script') ? 'html' : 'fields'));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {mode === 'fields' ? 'Тексты, ссылки и картинки секции. Вёрстка целиком — во вкладке HTML.' : 'Разметка секции целиком — для тонкой правки.'}
        </p>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-200 text-xs">
          {(['fields', 'html'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cx('px-3 py-1', mode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
              {m === 'fields' ? 'Поля' : 'HTML'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'fields' ? (
        <HtmlFieldsEditor html={String(block.html ?? '')} onChange={(html) => onChange({ ...block, html })} />
      ) : (
        <SchemaField schema={schema.properties!.html} root={schema} value={block.html} label="" onChange={(html) => onChange({ ...block, html: html as string })} />
      )}
    </div>
  );
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
  // единственную секцию (страницы запчастей) сразу открываем
  const [open, setOpen] = useState<Set<number>>(() => new Set(blocks.length === 1 ? [0] : []));
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
            ? sectionTitle(String(block.html ?? ''))
            : block.type === 'container'
              ? `<${String(block.tag)}> · ${(block.children as BlockData[]).length} блоков`
              : summarize(block);
        return (
          <div key={i} className={cx('rounded-xl border bg-white shadow-xs', isOpen ? 'border-brand-200' : 'border-slate-200')}>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <button type="button" onClick={() => toggle(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="w-4 text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                <Badge tone={block.type === 'html' || block.type === 'container' ? 'gray' : 'blue'}>
                  {block.type === 'html' ? 'Секция' : (def?.label ?? (block.type === 'container' ? 'Контейнер' : block.type))}
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
                ) : block.type === 'html' && def ? (
                  <HtmlSection block={block} schema={def.schema} onChange={(b) => set(i, b)} />
                ) : def ? (
                  <>
                    {(block.type === 'catalogCards' || (block.type === 'catalogList' && block.auto)) && (
                      <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                        Карточки собираются из каталога: добавить, убрать или поменять порядок — в разделе «Каталог продукции». Здесь — заголовок и оформление секции.
                      </p>
                    )}
                    {Object.keys(def.schema.properties ?? {}).filter((k) => k !== 'type').length ? (
                      <ObjectFields
                        schema={def.schema}
                        root={def.schema}
                        value={block}
                        onChange={(v) => set(i, v as BlockData)}
                        skip={block.type === 'catalogList' && block.auto ? ['type', 'cards'] : ['type']}
                      />
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
