'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { ItemActions, move } from '@/components/schema-form';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui';
import { api } from '@/lib/client-api';

export type StockRow = {
  url: string;
  qty: number | null;
  shipping: string | null;
  note: string | null;
  title: string | null;
  image: string | null;
  specs: [string, string][] | null;
  /** прочие поля позиции из старого конфига — сохраняются как есть */
  extra?: Record<string, unknown>;
};

const empty: StockRow = { url: '/products/', qty: 1, shipping: null, note: null, title: null, image: null, specs: null };
const clean = (rows: StockRow[]) =>
  rows.map((r) => ({ url: r.url.trim(), qty: r.qty, shipping: r.shipping || null, note: r.note || null, title: r.title || null, image: r.image || null, specs: r.specs, extra: r.extra ?? {} }));

export function StockEditor({ initial }: { initial: StockRow[] }) {
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(clean(initial)));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(clean(rows)) !== saved;
  const set = (i: number, patch: Partial<StockRow>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save() {
    setSaving(true);
    try {
      await api('content/stock', { method: 'PUT', json: clean(rows) });
      setSaved(JSON.stringify(clean(rows)));
      toast.ok('Наличие сохранено — бейджи на сайте обновятся в течение минуты');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Страница товара</th>
              <th className="w-20 px-3 py-2">Шт.</th>
              <th className="px-3 py-2">Срок отгрузки</th>
              <th className="px-3 py-2">Примечание</th>
              <th className="px-3 py-2">Название (если иное)</th>
              <th className="w-28 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">
                  <input className="field font-mono text-xs" value={r.url} onChange={(e) => set(i, { url: e.target.value })} />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="field"
                    type="number"
                    min={0}
                    value={r.qty ?? ''}
                    onChange={(e) => set(i, { qty: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input className="field" placeholder="от 1 рабочего дня" value={r.shipping ?? ''} onChange={(e) => set(i, { shipping: e.target.value })} />
                </td>
                <td className="px-3 py-1.5">
                  <input className="field" value={r.note ?? ''} onChange={(e) => set(i, { note: e.target.value })} />
                </td>
                <td className="px-3 py-1.5">
                  <input className="field" value={r.title ?? ''} onChange={(e) => set(i, { title: e.target.value })} />
                </td>
                <td className="px-3 py-1.5">
                  <ItemActions
                    onUp={() => setRows(move(rows, i, i - 1))}
                    onDown={() => setRows(move(rows, i, i + 1))}
                    onRemove={() => setRows(rows.filter((_, j) => j !== i))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setRows([...rows, { ...empty }])}>
          <Icon name="plus" className="h-4 w-4" />
          Позиция
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Сохранено'}
        </Button>
      </div>
    </div>
  );
}
