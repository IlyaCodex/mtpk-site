'use client';

import { useEffect, useRef, useState } from 'react';
import { BlockCode, HtmlSection, ModeTabs, ScriptSection } from './block-editors';
import { sectionTitle } from './html-fields';
import { defaultFor, ItemActions, move, ObjectFields, summarize, type JsonSchema } from './schema-form';
import { Badge, cx } from './ui';

export type BlockData = { type: string; [key: string]: unknown };
export type BlockSchemas = Record<string, { label: string; schema: JsonSchema }>;

/** Окно «Какой блок вставить?»: группы, в них — тип блока и пояснение, когда он нужен. */
const PICKER: { title: string; note?: string; items: [type: string, hint: string][] }[] = [
  {
    title: 'Своя секция',
    items: [
      ['html', 'Любая вёрстка: HTML-код целиком — тексты, картинки, кнопки'],
      ['script', 'Код для анимаций и поведения страницы (JavaScript или TypeScript)'],
      ['style', 'CSS-оформление для секций этой страницы'],
    ],
  },
  {
    title: 'Общие секции сайта',
    note: 'Сверстаны один раз и одинаковы на всех страницах',
    items: [
      ['leadgen', 'Большая форма заявки «Подбор и расчёт»'],
      ['bestOffer', 'Короткая форма «Лучшее коммерческое предложение»'],
      ['catalogCta', 'Призыв запросить КП по каталогу'],
      ['adv', 'Преимущества собственного производства'],
      ['whyUs', '«Почему выбирают УралИндуктор»'],
      ['partner', '«Один партнёр для любой задачи»'],
    ],
  },
  {
    title: 'Секции с полями',
    note: 'Вёрстка готова — заполняете только тексты и картинки',
    items: [
      ['faq', 'Вопросы и ответы, раскрываются по клику'],
      ['stats', 'Цифры с иконками: годы, проекты, регионы'],
      ['catalogList', 'Сетка карточек товаров с фильтром'],
      ['catalogCards', 'Карточки разделов каталога — из данных каталога'],
      ['categoryHero', 'Шапка раздела: заголовок, фон, экспресс-заявка'],
      ['productHero', 'Шапка товара: фото, название, ключевые характеристики'],
      ['productSpec', 'Характеристики и описание товара'],
    ],
  },
  {
    title: 'Служебные',
    items: [
      ['container', 'Обёртка, внутри которой стоят другие блоки'],
      ['lightbox', 'Просмотр фото на весь экран (для галереи товара)'],
      ['text', 'Простой текст без оформления'],
    ],
  },
];

/** Подписи в окне выбора, где название типа для списка блоков не подходит. */
const PICKER_LABELS: Record<string, string> = { html: 'HTML-секция', container: 'Контейнер' };

/** Заготовка новой HTML-секции: отступы и заголовок — как у секций сайта. */
const STARTER_HTML = `<section class="cms-section" aria-label="Новая секция">
  <div class="container">
    <div class="s-head">
      <div class="s-eyebrow">Надзаголовок</div>
      <h2 class="s-title">Заголовок <em>секции</em></h2>
      <p class="s-lead">Текст секции.</p>
    </div>
  </div>
</section>`;

function createBlock(type: string, schemas: BlockSchemas): BlockData {
  if (type === 'container') return { type: 'container', tag: 'div', children: [] };
  if (type === 'html') return { type: 'html', html: STARTER_HTML };
  return defaultFor(schemas[type].schema, schemas[type].schema) as BlockData;
}

function BlockPicker({ schemas, onPick, onClose }: { schemas: BlockSchemas; onPick: (type: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // типы, которых нет в списке выше (появятся позже), — к служебным
  const listed = new Set(PICKER.flatMap((g) => g.items.map(([t]) => t)));
  const groups = PICKER.map((g, i) => ({
    ...g,
    items: [
      ...g.items.filter(([t]) => t === 'container' || schemas[t]),
      ...(i === PICKER.length - 1 ? Object.keys(schemas).filter((t) => !listed.has(t)).map((t): [string, string] => [t, '']) : []),
    ],
  }));
  return (
    <div ref={ref} className="my-2 rounded-xl border border-brand-200 bg-white p-4 shadow-lg ring-4 ring-brand-50">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">Какой блок вставить сюда?</h3>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          Отмена ✕
        </button>
      </div>
      <div className="space-y-4">
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <div key={g.title}>
                <div className="text-xs font-medium tracking-wide text-slate-400 uppercase">{g.title}</div>
                {g.note && <p className="text-xs text-slate-400">{g.note}</p>}
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                  {g.items.map(([t, hint]) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onPick(t)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <div className="text-sm font-medium text-slate-800">{PICKER_LABELS[t] ?? schemas[t]?.label ?? t}</div>
                      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
                    </button>
                  ))}
                </div>
              </div>
            ),
        )}
      </div>
    </div>
  );
}

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

/** Подпись свёрнутого блока: заголовок секции, первая строка скрипта, поле блока. */
function captionOf(block: BlockData): string {
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
        +<span className="hidden group-hover:inline">Вставить блок сюда</span>
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
}: {
  blocks: BlockData[];
  schemas: BlockSchemas;
  onChange: (blocks: BlockData[]) => void;
  depth?: number;
}) {
  // ключи блоков переживают вставку и перестановку: открытые блоки остаются открытыми
  const keys = useRef<string[]>([]);
  if (keys.current.length !== blocks.length) keys.current = blocks.map(() => `b${keySeq++}`);
  // единственную секцию (страницы запчастей) сразу открываем
  const [open, setOpen] = useState<Set<string>>(() => new Set(blocks.length === 1 ? keys.current : []));
  // куда вставляем новый блок (индекс) — там открыто окно выбора
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
  const pick = (type: string) => {
    if (inserting === null) return;
    insert(inserting, createBlock(type, schemas), true);
    setInserting(null);
  };
  const picker = <BlockPicker schemas={schemas} onPick={pick} onClose={() => setInserting(null)} />;

  return (
    <div>
      {blocks.map((block, i) => {
        const k = keys.current[i];
        const def = schemas[block.type];
        const isOpen = open.has(k);
        const caption = captionOf(block);
        return (
          <div key={k}>
            {inserting === i ? picker : <InsertLine onClick={() => setInserting(i)} />}
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
                  <span className="w-4 text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
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
                      className="rounded p-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      title="Дублировать"
                      onClick={() => insert(i + 1, structuredClone(block), false)}
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
      {!blocks.length && inserting === null && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Блоков нет.</p>
      )}
      {inserting === blocks.length ? (
        picker
      ) : (
        <button
          type="button"
          onClick={() => setInserting(blocks.length)}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          + Добавить блок {blocks.length ? 'в конец' : ''}
        </button>
      )}
    </div>
  );
}
