'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { Modal } from '@/components/media';
import { toast } from '@/components/toast';
import { Button, Field } from '@/components/ui';
import { api } from '@/lib/client-api';

/** Кнопка «Создать» с окном одного поля — названия; после создания — переход на новую запись. */
function CreateButton({ label, title, field, hint, placeholder, path, href }: { label: string; title: string; field: string; hint: string; placeholder: string; path: string; href: (id: number) => string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await api<{ id: number }>(path, { json: { name: name.trim() } });
      router.push(href(created.id));
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </Button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)} width="max-w-lg">
          <form onSubmit={create} className="space-y-5">
            <Field label={field} hint={hint}>
              <input autoFocus className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} maxLength={200} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
                {busy ? 'Создаю…' : 'Создать'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function NewCampaignButton() {
  return (
    <CreateButton
      label="Новая рассылка"
      title="Новая рассылка"
      field="Название"
      hint="Видно только в админке. По нему система сделает метку utm_campaign — её можно поменять в письме."
      placeholder="Например: Новинки октября"
      path="mailing/campaigns"
      href={(id) => `/mailing/${id}`}
    />
  );
}

export function NewListButton() {
  return (
    <CreateButton
      label="Новая база"
      title="Новая база адресов"
      field="Название базы"
      hint="Например: «Клиенты из заявок сайта», «CRM — контакты», «Выставка Металлообработка-2026»."
      placeholder="Название базы"
      path="mailing/lists"
      href={(id) => `/mailing/lists/${id}`}
    />
  );
}
