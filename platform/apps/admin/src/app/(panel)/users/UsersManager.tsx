'use client';

import { useState, type FormEvent } from 'react';
import { toast } from '@/components/toast';
import { Badge, Button, Field, formatDate, Table } from '@/components/ui';
import { api } from '@/lib/client-api';

type User = { id: number; email: string; name: string; role: string; active: boolean; totpEnabledAt: string | null; lastLoginAt: string | null; createdAt: string };

export function UsersManager({ initial, roles, meId }: { initial: User[]; roles: Record<string, string>; meId: number }) {
  const [list, setList] = useState(initial);
  const reload = async () => setList(await api<User[]>('users'));

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api('users', { json: Object.fromEntries(f) });
      toast.ok('Пользователь создан');
      form.reset();
      await reload();
    } catch (err) {
      toast.error(err);
    }
  }

  async function update(u: User, patch: Record<string, unknown>, done = 'Сохранено') {
    try {
      await api(`users/${u.id}`, { method: 'PUT', json: patch });
      toast.ok(done);
      await reload();
    } catch (err) {
      toast.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <Table head={['Пользователь', 'Роль', '2FA', 'Последний вход', '']}>
        {list.map((u) => (
          <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
            <td className="px-4 py-2.5">
              <div className="font-medium">
                {u.name} {u.id === meId && <Badge tone="blue">это вы</Badge>}
              </div>
              <div className="text-xs text-slate-500">{u.email}</div>
            </td>
            <td className="px-4 py-2.5">
              <select className="field max-w-52" value={u.role} onChange={(e) => void update(u, { role: e.target.value }, 'Роль изменена')}>
                {Object.entries(roles).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-4 py-2.5">
              {u.totpEnabledAt ? <Badge tone="green">включена</Badge> : <span className="text-xs text-slate-400">нет</span>}
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(u.lastLoginAt)}</td>
            <td className="space-x-3 px-4 py-2.5 text-right text-xs whitespace-nowrap">
              <button
                type="button"
                className="text-brand-600 hover:underline"
                onClick={() => {
                  const password = window.prompt(`Новый пароль для ${u.email} (не короче 10 символов):`);
                  if (password) void update(u, { password }, 'Пароль изменён, сессии пользователя завершены');
                }}
              >
                сменить пароль
              </button>
              {u.totpEnabledAt && u.id !== meId && (
                <button
                  type="button"
                  className="text-amber-700 hover:underline"
                  title="Потерян телефон и резервные коды: следующий вход — по паролю, 2FA включается заново"
                  onClick={async () => {
                    if (!window.confirm(`Сбросить 2FA у ${u.email}? Следующий вход — только по паролю, затем 2FA нужно включить заново.`)) return;
                    try {
                      await api(`users/${u.id}/2fa`, { method: 'DELETE' });
                      toast.ok('2FA сброшена');
                      await reload();
                    } catch (err) {
                      toast.error(err);
                    }
                  }}
                >
                  сбросить 2FA
                </button>
              )}
              {u.id !== meId && (
                <button type="button" className="text-slate-600 hover:underline" onClick={() => void update(u, { active: !u.active }, u.active ? 'Отключён' : 'Включён')}>
                  {u.active ? 'отключить' : 'включить'}
                </button>
              )}
              {u.id !== meId && (
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={async () => {
                    if (!window.confirm(`Удалить ${u.email}?`)) return;
                    try {
                      await api(`users/${u.id}`, { method: 'DELETE' });
                      await reload();
                    } catch (err) {
                      toast.error(err);
                    }
                  }}
                >
                  удалить
                </button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      <form onSubmit={create} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold">Новый пользователь</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя">
            <input name="name" required className="field" />
          </Field>
          <Field label="E-mail">
            <input name="email" type="email" required className="field" />
          </Field>
          <Field label="Роль">
            <select name="role" className="field" defaultValue="editor">
              {Object.entries(roles).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Пароль" hint="Не короче 10 символов; передайте пользователю лично">
            <input name="password" type="text" required minLength={10} autoComplete="new-password" className="field font-mono" />
          </Field>
        </div>
        <Button type="submit" variant="primary" className="mt-4">
          Создать
        </Button>
      </form>
    </div>
  );
}
