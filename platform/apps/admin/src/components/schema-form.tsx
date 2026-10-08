'use client';

import { useState, type ReactNode } from 'react';
import { CodeEditor } from './CodeEditor';
import { GalleryField, type Photo } from './gallery-field';
import { Icon } from './icons';
import { MediaInput } from './media';
import { Button, cx } from './ui';

/**
 * Форма по JSON-схеме (схемы приходят из zod-моделей контента через
 * z.toJSONSchema). Тип поля и редактор берутся из схемы: строка с
 * editor=code — редактор кода (HTML, CSS, TypeScript), media — выбор файла из
 * медиатеки, массив — список с перестановкой, объект — группа полей.
 */
export type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  prefixItems?: JsonSchema[];
  additionalProperties?: JsonSchema | boolean;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  description?: string;
  title?: string;
  editor?: 'inline' | 'rich' | 'code' | 'link' | 'media' | 'attrs' | 'gallery';
  /** язык редактора кода (.meta({ lang })): по умолчанию HTML */
  lang?: 'css' | 'ts';
  /** подписи вариантов выбора (.meta({ enumLabels }) в модели) */
  enumLabels?: Record<string, string>;
  /** поле заполняет сервис (.meta({ hidden: true })) — в форме не показывается */
  hidden?: boolean;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  minimum?: number;
  maximum?: number;
};

type Json = unknown;

/** Разыменование $ref и снятие «или null» (nullable). */
export function resolveSchema(schema: JsonSchema, root: JsonSchema): JsonSchema {
  let s = schema;
  for (let i = 0; s.$ref && i < 10; i++) {
    const name = s.$ref.replace(/^#\/(\$defs|definitions)\//, '');
    s = { ...root.$defs?.[name], ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== '$ref')) };
  }
  const variants = s.anyOf ?? s.oneOf;
  if (variants) {
    const nonNull = variants.filter((v) => v.type !== 'null');
    if (nonNull.length === 1) return { ...resolveSchema(nonNull[0], root), description: s.description ?? nonNull[0].description };
  }
  return s;
}

const typeOf = (s: JsonSchema) => (Array.isArray(s.type) ? s.type.find((t) => t !== 'null') : s.type);

/** Значение по умолчанию для нового элемента списка или блока. */
export function defaultFor(schema: JsonSchema, root: JsonSchema): Json {
  const s = resolveSchema(schema, root);
  if (s.const !== undefined) return s.const;
  if (s.default !== undefined) return structuredClone(s.default);
  if (s.enum) return s.enum[0];
  switch (typeOf(s)) {
    case 'object': {
      const out: Record<string, Json> = {};
      for (const [k, p] of Object.entries(s.properties ?? {})) {
        const ps = resolveSchema(p, root);
        if (s.required?.includes(k) || ps.const !== undefined) out[k] = defaultFor(p, root);
      }
      return out;
    }
    case 'array':
      return [];
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}

const CAPTION_KEYS = ['title', 'label', 'name', 'question', 'q', 'text', 'value', 'alt', 'caption'];

/** Короткое описание значения для свёрнутого элемента списка: первая непустая строка без разметки. */
export function summarize(value: Json, depth = 0): string {
  if (typeof value === 'string') return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
  if (depth > 3 || !value || typeof value !== 'object') return '';
  // поля, по которым элемент узнают, — в первую очередь (подпись раньше ссылки)
  const rank = (k: string) => (CAPTION_KEYS.includes(k) ? CAPTION_KEYS.indexOf(k) : CAPTION_KEYS.length);
  const entries = Array.isArray(value)
    ? value
    : Object.entries(value)
        .filter(([k]) => k !== 'type')
        .sort(([a], [b]) => rank(a) - rank(b))
        .map(([, v]) => v);
  for (const v of entries) {
    const s = summarize(v, depth + 1);
    if (s) return s;
  }
  return '';
}

function FieldLabel({ text, required, children }: { text?: string; required?: boolean; children?: ReactNode }) {
  if (!text && !children) return null;
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-slate-600">
        {text}
        {required === false && <span className="ml-1 font-normal text-slate-400">(необязательно)</span>}
      </span>
      {children}
    </div>
  );
}

export function SchemaField({
  schema: raw,
  root,
  value,
  onChange,
  label,
  required = true,
}: {
  schema: JsonSchema;
  root: JsonSchema;
  value: Json;
  onChange: (v: Json) => void;
  label?: string;
  required?: boolean;
}) {
  const schema = resolveSchema(raw, root);
  const text = label ?? schema.description ?? schema.title;
  if (schema.const !== undefined) return null;

  if (schema.enum) {
    return (
      <div>
        <FieldLabel text={text} required={required} />
        <select className="field" value={String(value ?? '')} onChange={(e) => onChange(schema.enum!.find((o) => String(o) === e.target.value))}>
          {!required && <option value="">—</option>}
          {schema.enum.map((o) => (
            <option key={String(o)} value={String(o)}>
              {schema.enumLabels?.[String(o)] ?? String(o)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const type = typeOf(schema);
  // необязательная строка: пустое поле = значения нет
  const setString = (v: string) => onChange(!required && v === '' ? undefined : v);

  if (type === 'string') {
    const v = typeof value === 'string' ? value : '';
    if (schema.editor === 'media') {
      return (
        <div>
          <FieldLabel text={text} required={required} />
          <MediaInput value={v} onChange={setString} />
        </div>
      );
    }
    if (schema.editor === 'code') {
      return (
        <div>
          <FieldLabel text={text} required={required} />
          <CodeEditor value={v} onChange={setString} lang={schema.lang ?? 'html'} />
        </div>
      );
    }
    if (schema.editor === 'rich') {
      const rows = Math.min(24, Math.max(4, v.split('\n').length + 1));
      return (
        <div>
          <FieldLabel text={text} required={required} />
          <textarea
            className="field"
            rows={rows}
            spellCheck
            value={v}
            onChange={(e) => setString(e.target.value)}
          />
        </div>
      );
    }
    const long = v.length > 90;
    return (
      <div>
        <FieldLabel text={text} required={required}>
          {schema.editor === 'inline' && <span className="text-[10px] text-slate-400">HTML: &lt;em&gt;, &lt;br&gt;, &amp;nbsp;</span>}
        </FieldLabel>
        {long ? (
          <textarea className="field" rows={Math.min(6, Math.ceil(v.length / 90) + 1)} value={v} onChange={(e) => setString(e.target.value)} />
        ) : (
          <input className="field" value={v} onChange={(e) => setString(e.target.value)} placeholder={schema.editor === 'link' ? '/products/… или https://…' : undefined} />
        )}
      </div>
    );
  }

  if (type === 'number' || type === 'integer') {
    return (
      <div>
        <FieldLabel text={text} required={required} />
        <input
          className="field max-w-40"
          type="number"
          step={type === 'integer' ? 1 : 'any'}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? (required ? 0 : undefined) : Number(e.target.value))}
        />
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        {text}
      </label>
    );
  }

  if (type === 'array') {
    if (schema.editor === 'gallery') {
      return <GalleryField label={text} value={(Array.isArray(value) ? value : []) as Photo[]} onChange={onChange} />;
    }
    if (schema.prefixItems) {
      const tuple = Array.isArray(value) ? value : [];
      return (
        <div>
          <FieldLabel text={text} required={required} />
          <div className="grid grid-cols-2 gap-2">
            {schema.prefixItems.map((item, i) => (
              <SchemaField
                key={i}
                schema={item}
                root={root}
                value={tuple[i]}
                label=""
                onChange={(v) => {
                  const next = [...tuple];
                  next[i] = v;
                  onChange(next);
                }}
              />
            ))}
          </div>
        </div>
      );
    }
    return <ArrayField schema={schema} root={root} value={Array.isArray(value) ? value : []} onChange={onChange} label={text} required={required} />;
  }

  if (type === 'object') {
    if (schema.editor === 'attrs' || (!schema.properties && schema.additionalProperties)) {
      return <KeyValueField label={text} value={(value ?? {}) as Record<string, string>} onChange={(v) => onChange(Object.keys(v).length ? v : undefined)} />;
    }
    const obj = (value && typeof value === 'object' ? value : {}) as Record<string, Json>;
    return (
      <fieldset className={cx(text && 'rounded-lg border border-slate-200 p-3')}>
        {text && <legend className="px-1 text-xs font-semibold text-slate-700">{text}</legend>}
        <ObjectFields schema={schema} root={root} value={obj} onChange={onChange} />
      </fieldset>
    );
  }

  return (
    <div>
      <FieldLabel text={text} required={required} />
      <textarea
        className="field font-mono text-xs"
        rows={4}
        value={JSON.stringify(value ?? null, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            /* ждём корректный JSON */
          }
        }}
      />
    </div>
  );
}

/** Поля объекта по порядку схемы. */
export function ObjectFields({
  schema,
  root,
  value,
  onChange,
  skip = [],
}: {
  schema: JsonSchema;
  root: JsonSchema;
  value: Record<string, Json>;
  onChange: (v: Record<string, Json>) => void;
  skip?: string[];
}) {
  const props = Object.entries(resolveSchema(schema, root).properties ?? {}).filter(([k, p]) => !skip.includes(k) && !p.hidden);
  return (
    <div className="space-y-3">
      {props.map(([key, prop]) => (
        <SchemaField
          key={key}
          schema={prop}
          root={root}
          value={value[key]}
          required={schema.required?.includes(key) ?? false}
          onChange={(v) => {
            const next = { ...value };
            if (v === undefined) delete next[key];
            else next[key] = v;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function ArrayField({
  schema,
  root,
  value,
  onChange,
  label,
  required,
}: {
  schema: JsonSchema;
  root: JsonSchema;
  value: Json[];
  onChange: (v: Json) => void;
  label?: string;
  required: boolean;
}) {
  const itemSchema = resolveSchema(schema.items ?? {}, root);
  const simple = typeOf(itemSchema) !== 'object' && typeOf(itemSchema) !== 'array';
  const [open, setOpen] = useState<number | null>(null);
  const set = (i: number, v: Json) => onChange(value.map((x, j) => (j === i ? v : x)));

  return (
    <div>
      <FieldLabel text={label} required={required}>
        <span className="text-[10px] text-slate-400">{value.length} шт.</span>
      </FieldLabel>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60">
            <div className="flex items-center gap-2 px-3 py-1.5">
              {simple ? (
                <div className="min-w-0 flex-1">
                  <SchemaField schema={itemSchema} root={root} value={item} label="" onChange={(v) => set(i, v)} />
                </div>
              ) : (
                <button type="button" className="min-w-0 flex-1 truncate text-left text-sm text-slate-700" onClick={() => setOpen(open === i ? null : i)}>
                  <span className="mr-2 inline-flex items-center gap-1 align-middle text-xs text-slate-400">
                    <Icon name={open === i ? 'chevronDown' : 'chevronRight'} className="h-3.5 w-3.5" />
                    {i + 1}
                  </span>
                  {summarize(item) || <span className="text-slate-400">пусто</span>}
                </button>
              )}
              <ItemActions
                onUp={() => onChange(move(value, i, i - 1))}
                onDown={() => onChange(move(value, i, i + 1))}
                onRemove={() => onChange(value.filter((_, j) => j !== i))}
              />
            </div>
            {!simple && open === i && (
              <div className="border-t border-slate-200 bg-white p-3">
                <SchemaField schema={itemSchema} root={root} value={item} label="" onChange={(v) => set(i, v)} />
              </div>
            )}
          </div>
        ))}
        <Button
          size="sm"
          onClick={() => {
            onChange([...value, defaultFor(itemSchema, root)]);
            if (!simple) setOpen(value.length);
          }}
        >
          <Icon name="plus" className="h-4 w-4" />
          Добавить
        </Button>
      </div>
    </div>
  );
}

export function ItemActions({ onUp, onDown, onRemove, extra }: { onUp: () => void; onDown: () => void; onRemove: () => void; extra?: ReactNode }) {
  const btn = 'rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700';
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {extra}
      <button type="button" className={btn} title="Выше" aria-label="Выше" onClick={onUp}>
        <Icon name="up" className="h-4 w-4" />
      </button>
      <button type="button" className={btn} title="Ниже" aria-label="Ниже" onClick={onDown}>
        <Icon name="down" className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="Удалить"
        aria-label="Удалить"
        onClick={() => {
          if (window.confirm('Удалить элемент?')) onRemove();
        }}
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Атрибуты элемента (data-*, aria-*, id…) — пары «имя = значение». */
function KeyValueField({ label, value, onChange }: { label?: string; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const entries = Object.entries(value);
  const update = (list: [string, string][]) => onChange(Object.fromEntries(list.filter(([k]) => k.trim())));
  return (
    <div>
      <FieldLabel text={label} required={false} />
      <div className="space-y-1.5">
        {entries.map(([k, v], i) => (
          <div key={i} className="flex gap-2">
            <input className="field max-w-48 font-mono text-xs" value={k} onChange={(e) => update(entries.map((p, j) => (j === i ? [e.target.value, p[1]] : p)))} />
            <input className="field font-mono text-xs" value={v} onChange={(e) => update(entries.map((p, j) => (j === i ? [p[0], e.target.value] : p)))} />
            <button type="button" className="px-2 text-slate-400 hover:text-red-600" title="Убрать" aria-label="Убрать" onClick={() => update(entries.filter((_, j) => j !== i))}>
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, [`data-new-${entries.length + 1}`]: '' })}>
          <Icon name="plus" className="h-4 w-4" />
          атрибут
        </Button>
      </div>
    </div>
  );
}
