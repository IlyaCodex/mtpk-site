'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from '@/components/toast';
import { Button, Field } from '@/components/ui';
import { api } from '@/lib/client-api';

export function NewPageForm({ templates }: { templates: string[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let path = String(f.get('path') ?? '').trim();
    if (!path.startsWith('/')) path = `/${path}`;
    if (!path.endsWith('/')) path = `${path}/`;
    setPending(true);
    try {
      const res = await api<{ id: number }>('content/pages', {
        json: {
          path,
          title: String(f.get('title') ?? ''),
          template: String(f.get('template') ?? 'page'),
          status: 'draft',
          blocks: [],
        },
      });
      router.push(`/pages/${res.id}`);
    } catch (err) {
      toast.error(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <Field label="Адрес" hint="Например: /uslugi/novaya-usluga/ — иерархия адреса совпадает с хлебными крошками">
        <input name="path" required className="field font-mono" placeholder="/razdel/stranica/" />
      </Field>
      <Field label="Title" hint="Заголовок вкладки и сниппета: «Название | УралИндуктор»">
        <input name="title" required className="field" />
      </Field>
      <Field label="Тип страницы">
        <select name="template" className="field" defaultValue="page">
          {[...new Set(['page', ...templates])].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? 'Создаём…' : 'Создать и открыть редактор'}
      </Button>
    </form>
  );
}
