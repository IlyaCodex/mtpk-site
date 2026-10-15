'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button, Field } from '@/components/ui';
import { BASE_PATH } from '@/lib/base-path';
import { ApiError, api } from '@/lib/client-api';

type Credentials = { email: string; password: string };

export function LoginForm() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  // до загрузки скриптов кнопка неактивна: иначе форма ушла бы обычным запросом
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  // второй шаг (у пользователя включена 2FA): e-mail и пароль верны и ждут кода в памяти страницы
  const [step2, setStep2] = useState<Credentials | null>(null);
  const [recovery, setRecovery] = useState(false);

  async function login(json: Credentials & { code?: string }) {
    setPending(true);
    setError('');
    try {
      await api('auth/login', { json });
      window.location.assign(BASE_PATH);
    } catch (err) {
      if (err instanceof ApiError && (err.body as { error?: string } | null)?.error === 'code_required') setStep2({ email: json.email, password: json.password });
      else setError((err as Error).message);
      setPending(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (step2) void login({ ...step2, code: String(form.get('code') ?? '') });
    else void login({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') });
  }

  const alert = error && (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  );

  if (step2) {
    return (
      <form onSubmit={submit} method="post" className="space-y-4">
        <p className="text-sm text-slate-600">
          {recovery
            ? 'Введите один из резервных кодов, сохранённых при включении 2FA. Каждый код действует один раз.'
            : 'Откройте приложение-аутентификатор на телефоне и введите код для «УралИндуктор».'}
        </p>
        <Field label={recovery ? 'Резервный код' : 'Код из приложения'}>
          <input
            key={recovery ? 'recovery' : 'app'}
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={recovery ? 'text' : 'numeric'}
            maxLength={recovery ? 20 : 7}
            placeholder={recovery ? 'xxxx-xxxx-xxxx' : '000000'}
            className="field text-center font-mono text-lg tracking-[0.25em]"
            // 6 цифр набраны — вход без нажатия кнопки
            onChange={(e) => !recovery && !pending && /^\d{6}$/.test(e.currentTarget.value.replace(/\s/g, '')) && e.currentTarget.form?.requestSubmit()}
          />
        </Field>
        {alert}
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? 'Проверяем…' : 'Войти'}
        </Button>
        <div className="flex flex-wrap justify-between gap-2 text-xs">
          <button
            type="button"
            className="text-brand-600 hover:underline"
            onClick={() => {
              setRecovery(!recovery);
              setError('');
            }}
          >
            {recovery ? 'Ввести код из приложения' : 'Нет телефона? Резервный код'}
          </button>
          <button
            type="button"
            className="text-slate-500 hover:underline"
            onClick={() => {
              setStep2(null);
              setRecovery(false);
              setError('');
            }}
          >
            ← Другой пользователь
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} method="post" className="space-y-4">
      <Field label="E-mail">
        <input name="email" type="email" autoComplete="username" required autoFocus className="field" />
      </Field>
      <Field label="Пароль">
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </Field>
      {alert}
      <Button type="submit" variant="primary" className="w-full" disabled={pending || !ready}>
        {pending ? 'Входим…' : 'Войти'}
      </Button>
    </form>
  );
}
