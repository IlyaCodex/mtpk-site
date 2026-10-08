'use client';

import { useState } from 'react';
import { resolveSchema, SchemaField, type JsonSchema } from '@/components/schema-form';
import { toast } from '@/components/toast';
import { Button, cx } from '@/components/ui';
import { api } from '@/lib/client-api';
import { ButtonDesignEditor, type ButtonDesign } from './ButtonDesignEditor';

/** Настройки сайта по разделам схемы siteSettings: контакты, компания, меню, подвал, оформление кнопок. */
export function SettingsEditor({ initial, schema }: { initial: Record<string, unknown>; schema: JsonSchema }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const sections = Object.entries(resolveSchema(schema, schema).properties ?? {});
  const [tab, setTab] = useState(sections[0]?.[0] ?? '');
  const dirty = JSON.stringify(value) !== saved;

  async function save() {
    setSaving(true);
    try {
      await api('content/settings', { method: 'PUT', json: value });
      setSaved(JSON.stringify(value));
      toast.ok('Настройки сохранены — сайт обновится в течение минуты');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  const current = sections.find(([k]) => k === tab);
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex flex-col gap-1">
        {sections.map(([key, s]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cx('rounded-lg px-3 py-2 text-left text-sm', tab === key ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100')}
          >
            {resolveSchema(s, schema).description ?? key}
          </button>
        ))}
        <Button variant="primary" className="mt-4" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Сохранено'}
        </Button>
      </nav>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
        {current?.[0] === 'design' ? (
          <ButtonDesignEditor value={value.design as ButtonDesign | undefined} onChange={(v) => setValue((s) => ({ ...s, design: v }))} />
        ) : current && (
          <SchemaField
            schema={current[1]}
            root={schema}
            label=""
            value={value[current[0]]}
            onChange={(v) => setValue((s) => ({ ...s, [current[0]]: v }))}
          />
        )}
      </div>
    </div>
  );
}
