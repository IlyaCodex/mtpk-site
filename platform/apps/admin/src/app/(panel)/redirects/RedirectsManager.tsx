'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';
import { toast } from '@/components/toast';
import { Badge, Button, Table } from '@/components/ui';
import { api } from '@/lib/client-api';

type Redirect = { id: number; fromPath: string; toPath: string; code: number; source: string; comment: string | null };
const LIMIT = 100;

export function RedirectsManager() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; items: Redirect[] } | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ offset: String(offset), limit: String(LIMIT), ...(search.trim() ? { search: search.trim() } : {}) });
    try {
      setData(await api(`content/redirects?${q}`));
    } catch (err) {
      toast.error(err);
    }
  }, [offset, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api('content/redirects', {
        json: { from: String(f.get('from')).trim(), to: String(f.get('to')).trim(), code: Number(f.get('code')), comment: String(f.get('comment') || '') || undefined },
      });
      toast.ok('Редирект сохранён');
      form.reset();
      await load();
    } catch (err) {
      toast.error(err);
    }
  }

  async function remove(r: Redirect) {
    if (!window.confirm(`Удалить редирект ${r.fromPath} → ${r.toPath}?`)) return;
    try {
      await api(`content/redirects/${r.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      toast.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_110px_1fr_auto]">
        <input name="from" required pattern="/.*" placeholder="Откуда: /staryj-adres/" className="field font-mono text-xs" />
        <input name="to" required placeholder="Куда: /novyj-adres/" className="field font-mono text-xs" />
        <select name="code" className="field" defaultValue="301">
          <option value="301">301</option>
          <option value="302">302</option>
          <option value="308">308</option>
        </select>
        <input name="comment" placeholder="Комментарий" className="field" />
        <Button type="submit" variant="primary">
          Добавить
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <input
          className="field max-w-80"
          placeholder="Поиск по адресу"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
        {data && <span className="text-sm text-slate-500">найдено: {data.total}</span>}
      </div>

      {data && (
        <Table head={['Откуда', 'Куда', 'Код', 'Источник', '']}>
          {data.items.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="max-w-sm truncate px-4 py-2 font-mono text-xs">{r.fromPath}</td>
              <td className="max-w-sm truncate px-4 py-2 font-mono text-xs">{r.toPath}</td>
              <td className="px-4 py-2">
                <Badge tone={r.code === 301 ? 'blue' : 'amber'}>{r.code}</Badge>
              </td>
              <td className="px-4 py-2 text-xs text-slate-500" title={r.comment ?? ''}>
                {r.source === 'legacy-map' ? 'с WordPress' : 'вручную'}
                {r.comment ? ` · ${r.comment}` : ''}
              </td>
              <td className="px-4 py-2 text-right">
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => void remove(r)}>
                  удалить
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {data && data.total > LIMIT && (
        <div className="flex gap-2">
          <Button size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
            <Icon name="chevronLeft" className="h-4 w-4" />
            Назад
          </Button>
          <Button size="sm" disabled={offset + LIMIT >= data.total} onClick={() => setOffset(offset + LIMIT)}>
            Вперёд
            <Icon name="chevronRight" className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
