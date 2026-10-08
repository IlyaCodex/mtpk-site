'use client';

import { useEffect, useRef, useState } from 'react';
import { BlockCode, HtmlSection, ModeTabs, ScriptSection } from './block-editors';
import { sectionTitle } from './html-fields';
import { Icon } from './icons';
import { defaultFor, ItemActions, move, ObjectFields, summarize, type JsonSchema } from './schema-form';
import { Badge, cx } from './ui';
import { createBlock, useBuilder, WidgetPanel } from './widgets';

export type BlockData = { type: string; [key: string]: unknown };
export type BlockSchemas = Record<string, { label: string; schema: JsonSchema }>;

/**
 * Блок с полями или общая секция: «Поля» — форма по схеме блока,
 * «HTML-код» — разметка, которую блок выводит на сайте.
 */
function FieldsBlock({
  block,
  def,
  onChange,
  onConvert,
}: {
  block: BlockData;
  def: BlockSchemas[string];
  onChange: (b: BlockData) => void;
  onConvert: (html: string) => void;
}) {
  const [mode, setMode] = useState<'fields' | 'code'>('fields');
  const hasFields = Object.keys(def.schema.properties ?? {}).some((p) => p !== 'type');
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {mode === 'code'
            ? 'HTML-код, который блок выводит на сайте.'
            : hasFields
              ? 'Поля блока: вёрстка готова, меняются тексты и настройки.'
              : 'Общая секция сайта: настроек нет, содержимое одинаково на всех страницах.'}
        </p>
        <ModeTabs
          value={mode}
          options={[
            ['fields', hasFields ? 'Поля' : 'О блоке'],
            ['code', 'HTML-код'],
          ]}
          onChange={setMode}
        />
      </div>
      {mode === 'code' ? (
        <BlockCode block={block} onConvert={onConvert} />
      ) : (
        <>
          {(block.type === 'catalogCards' || (block.type === 'catalogList' && block.auto)) && (
            <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
              Карточки собираются из каталога: добавить, убрать или поменять порядок — в разделе «Каталог продукции». Здесь — заголовок и оформление секции.
            </p>
          )}
          {hasFields && (
            <ObjectFields
              schema={def.schema}
              root={def.schema}
              value={block}
              onChange={(v) => onChange(v as BlockData)}
              skip={block.type === 'catalogList' && block.auto ? ['type', 'cards'] : ['type']}
            />
          )}
        </>
      )}
    </div>
  );
}

const plainText = (s: unknown) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const count = (n: number, one: string, few: string, many: string) =>
  `${n} ${n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many}`;
const SPACER_PX: Record<string, number> = { small: 32, medium: 64, large: 96, xlarge: 128 };

/** Подпись виджета: по чему его узнают в списке (заголовок, сколько фото, ссылка на видео). */
function widgetCaption(block: BlockData): string | null {
  const title = plainText((block.head as { title?: string } | undefined)?.title);
  const list = (key: string) => (Array.isArray(block[key]) ? (block[key] as Record<string, unknown>[]) : []);
  switch (block.type) {
    case 'gallery':
      return `${title || 'Без заголовка'} · ${count(list('photos').length, 'фото', 'фото', 'фото')}`;
    case 'carousel':
      return `${title || 'Без заголовка'} · ${count(list('slides').length, 'слайд', 'слайда', 'слайдов')}`;
    case 'marquee':
      return list('items').map((i) => plainText(i.text)).filter(Boolean).join(' • ') || 'логотипы';
    case 'video':
      return String(block.url ?? '') || 'ссылка на видео не указана';
    case 'spacer':
      return `${SPACER_PX[String(block.size)] ?? 64} px${block.line ? ' · с линией' : ''}`;
    case 'features':
      return title || list('items').map((i) => plainText(i.title)).join(', ');
    case 'richText':
      return title || plainText(block.body);
    case 'cta':
      return plainText(block.title);
    default:
      return null;
  }
}

/** Подпись свёрнутого блока: заголовок секции, первая строка скрипта, поле блока. */
function captionOf(block: BlockData): string {
  const widget = widgetCaption(block);
  if (widget !== null) return widget;
  if (block.type === 'html') return sectionTitle(String(block.html ?? ''));
  if (block.type === 'container') return `<${String(block.tag)}> · ${(block.children as BlockData[]).length} блоков`;
  if (block.type === 'script') {
    const first = String(block.code ?? '')
      .split('\n')
      .map((l) => l.replace(/^\s*\/\/\s?/, '').trim())
      .find(Boolean);
    return first ?? 'пустой';
  }
  return summarize(block);
}

/** Место между блоками: «+» — вставить новый блок именно сюда. */
function InsertLine({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative flex h-6 items-center justify-center">
      <div className="absolute inset-x-6 top-1/2 h-px group-hover:bg-brand-200" />
      <button
        type="button"
        onClick={onClick}
        title="Вставить блок сюда"
        aria-label="Вставить блок сюда"
        className="relative inline-flex h-5 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-xs leading-none text-slate-400 transition hover:border-brand-300 hover:text-brand-700 group-hover:border-brand-300 group-hover:text-brand-700"
      >
        <Icon name="plus" className="h-3.5 w-3.5" />
        <span className="hidden group-hover:inline">Вставить блок сюда</span>
      </button>
    </div>
  );
}

let keySeq = 0;

/**
 * Список блоков страницы: порядок, вставка в любое место («+» между блоками),
 * удаление, дублирование; поля блока — форма по его схеме. Контейнер (обёртка
 * с вложенными блоками) раскрывается вложенным списком.
 */
export function BlockList({
  blocks,
  schemas,
  onChange,
  depth = 0,
  focusRequest,
}: {
  blocks: BlockData[];
  schemas: BlockSchemas;
  onChange: (blocks: BlockData[]) => void;
  depth?: number;
  /** открыть блок с этим номером и прокрутить к нему (щелчок «Настроить» в предпросмотре) */
  focusRequest?: { index: number; nonce: number };
}) {
  // ключи блоков переживают вставку и перестановку: открытые блоки остаются открытыми
  const keys = useRef<string[]>([]);
  if (keys.current.length !== blocks.length) keys.current = blocks.map(() => `b${keySeq++}`);
  // единственную секцию (страницы запчастей) сразу открываем
  const [open, setOpen] = useState<Set<string>>(() => new Set(blocks.length === 1 ? keys.current : []));
  // куда вставляем новый блок (индекс): панель «Добавить блок» — общая в редакторе или своя
  const builder = useBuilder();
  const [inserting, setInserting] = useState<number | null>(null);
  // вставленные сейчас блоки: HTML-секция открывается сразу в коде
  const fresh = useRef(new Set<string>());
  const [focus, setFocus] = useState<string | null>(null);

  const toggle = (k: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const set = (i: number, b: BlockData) => onChange(blocks.map((x, j) => (j === i ? b : x)));
  const insert = (at: number, b: BlockData, openIt: boolean) => {
    const k = `b${keySeq++}`;
    keys.current = [...keys.current.slice(0, at), k, ...keys.current.slice(at)];
    if (openIt) {
      fresh.current.add(k);
      setOpen((s) => new Set(s).add(k));
      setFocus(k);
    }
    onChange([...blocks.slice(0, at), b, ...blocks.slice(at)]);
  };
  const shift = (i: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    keys.current = move(keys.current, i, to);
    onChange(move(blocks, i, to));
  };
  const remove = (i: number) => {
    keys.current = keys.current.filter((_, j) => j !== i);
    onChange(blocks.filter((_, j) => j !== i));
  };
  const where = (at: number) => (at < blocks.length ? `Перед блоком: ${captionOf(blocks[at]) || blocks[at].type}` : blocks.length ? 'В конец страницы' : 'Первый блок страницы');
  const openPanel = (at: number) => {
    if (builder) builder.open({ title: where(at), onPick: (type) => insert(at, createBlock(type, schemas), true) });
    else setInserting(at);
  };

  useEffect(() => {
    if (!focusRequest) return;
    const k = keys.current[focusRequest.index];
    if (!k) return;
    setOpen((s) => new Set(s).add(k));
    setFocus(k);
    // только по новой просьбе (nonce), не при каждой правке блоков
  }, [focusRequest?.nonce]);

  return (
    <div>
      {blocks.map((block, i) => {
        const k = keys.current[i];
        const def = schemas[block.type];
        const isOpen = open.has(k);
        const caption = captionOf(block);
        return (
          <div key={k}>
            <InsertLine onClick={() => openPanel(i)} />
            <div
              ref={(el) => {
                if (el && focus === k) {
                  el.scrollIntoView({ block: 'start', behavior: 'smooth' });
                  setFocus(null);
                }
              }}
              className={cx('scroll-mt-28 rounded-xl border bg-white shadow-xs', isOpen ? 'border-brand-200' : 'border-slate-200')}
            >
              <div className="flex items-center gap-3 px-4 py-2.5">
                <button type="button" onClick={() => toggle(k)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} className="h-4 w-4 text-slate-400" />
                  <Badge tone={block.type === 'script' ? 'amber' : block.type === 'html' || block.type === 'container' ? 'gray' : 'blue'}>
                    {block.type === 'html' ? 'Секция' : block.type === 'script' ? 'Скрипт' : (def?.label ?? (block.type === 'container' ? 'Контейнер' : block.type))}
                  </Badge>
                  <span className="truncate text-sm text-slate-600">{caption}</span>
                </button>
                <ItemActions
                  onUp={() => shift(i, i - 1)}
                  onDown={() => shift(i, i + 1)}
                  onRemove={() => remove(i)}
                  extra={
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      title="Дублировать"
                      aria-label="Дублировать"
                      onClick={() => insert(i + 1, structuredClone(block), false)}
                    >
                      <Icon name="copy" className="h-4 w-4" />
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
                  ) : block.type === 'html' ? (
                    <HtmlSection block={block} fresh={fresh.current.has(k)} onChange={(v) => set(i, v)} />
                  ) : block.type === 'script' ? (
                    <ScriptSection block={block} onChange={(v) => set(i, v)} />
                  ) : def && (block.type === 'style' || block.type === 'text') ? (
                    <ObjectFields schema={def.schema} root={def.schema} value={block} onChange={(v) => set(i, v as BlockData)} skip={['type']} />
                  ) : def ? (
                    <FieldsBlock
                      block={block}
                      def={def}
                      onChange={(v) => set(i, v)}
                      onConvert={(html) => {
                        fresh.current.add(k);
                        set(i, { type: 'html', html });
                      }}
                    />
                  ) : (
                    <p className="text-sm text-red-600">Неизвестный тип блока «{block.type}».</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {!blocks.length && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Блоков нет.</p>
      )}
      <button
        type="button"
        onClick={() => openPanel(blocks.length)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
      >
        <Icon name="add" className="h-4 w-4" />
        Добавить блок {blocks.length ? 'в конец' : ''}
      </button>
      {inserting !== null && (
        <WidgetPanel
          schemas={schemas}
          title={where(inserting)}
          onClose={() => setInserting(null)}
          onPick={(type) => {
            insert(inserting, createBlock(type, schemas), true);
            setInserting(null);
          }}
        />
      )}
    </div>
  );
}
