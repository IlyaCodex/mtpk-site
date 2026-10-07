'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button, Field } from '@/components/ui';
import { BASE_PATH } from '@/lib/base-path';
import { api } from '@/lib/client-api';

export function LoginForm() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  // до загрузки скриптов кнопка неактивна: иначе форма ушла бы обычным запросом
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError('');
    try {
      await api('auth/login', { json: { email: form.get('email'), password: form.get('password') } });
      window.location.assign(BASE_PATH);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} method="post" className="space-y-4">
      <Field label="E-mail">
        <input name="email" type="email" autoComplete="username" required autoFocus className="field" />
      </Field>
      <Field label="Пароль">
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </Field>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" className="w-full" disabled={pending || !ready}>
        {pending ? 'Входим…' : 'Войти'}
      </Button>
    </form>
  );
}
