'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';
import { toast } from '@/components/toast';
import { Badge, Button, Card, Field, formatDate } from '@/components/ui';
import { api } from '@/lib/client-api';

type Status = { enabled: boolean; enabledAt: string | null; recoveryLeft: number };
type Setup = { secret: string; qr: string };

const APPS = 'Яндекс Ключ, Google Authenticator, Microsoft Authenticator или любое другое с кодами TOTP';

/** Двухфакторная защита своего входа: включение по QR-коду, резервные коды, выключение. */
export function TwoFactorSettings({ initial, email }: { initial: Status; email: string }) {
  const [status, setStatus] = useState(initial);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  // действие, для которого спрашиваем код (при включённой 2FA)
  const [asking, setAsking] = useState<'codes' | 'disable' | null>(null);
  const [pending, setPending] = useState(false);

  async function run<T>(json: Record<string, unknown>, done: (result: T) => void) {
    setPending(true);
    try {
      done(await api<T>('me/2fa', { json }));
    } catch (err) {
      toast.error(err);
    } finally {
      setPending(false);
    }
  }

  const codeOf = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    return String(new FormData(e.currentTarget).get('code') ?? '');
  };

  function confirm(e: FormEvent<HTMLFormElement>) {
    void run<{ codes: string[] }>({ action: 'enable', code: codeOf(e) }, (r) => {
      setSetup(null);
      setCodes(r.codes);
      setStatus({ enabled: true, enabledAt: new Date().toISOString(), recoveryLeft: r.codes.length });
      toast.ok('Двухфакторная защита включена');
    });
  }

  function confirmAction(e: FormEvent<HTMLFormElement>) {
    const code = codeOf(e);
    if (asking === 'codes') {
      void run<{ codes: string[] }>({ action: 'codes', code }, (r) => {
        setAsking(null);
        setCodes(r.codes);
        setStatus((s) => ({ ...s, recoveryLeft: r.codes.length }));
        toast.ok('Новые резервные коды готовы, прежние больше не действуют');
      });
    } else {
      void run({ action: 'disable', code }, () => {
        setAsking(null);
        setStatus({ enabled: false, enabledAt: null, recoveryLeft: 0 });
        toast.ok('Двухфакторная защита выключена');
      });
    }
  }

  const codeInput = (label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input name="code" required autoFocus autoComplete="one-time-code" maxLength={20} className="field max-w-48 font-mono tracking-widest" />
    </Field>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <Card
        title="Двухфакторная защита (2FA)"
        actions={status.enabled ? <Badge tone="green">включена с {formatDate(status.enabledAt)}</Badge> : <Badge tone="amber">выключена</Badge>}
      >
        <p className="text-sm text-slate-600">
          Кроме пароля, при входе нужен 6-значный код из приложения на телефоне — {APPS}. Код меняется каждые 30 секунд: даже узнав
          пароль, без вашего телефона в админку не войти.
        </p>

        {codes && <RecoveryCodes codes={codes} email={email} onDone={() => setCodes(null)} />}

        {!status.enabled && !setup && (
          <Button variant="primary" className="mt-4" disabled={pending} onClick={() => void run<Setup>({ action: 'setup' }, setSetup)}>
            <Icon name="shield" className="h-4 w-4" />
            Включить 2FA
          </Button>
        )}

        {setup && (
          <div className="mt-5 grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[208px_1fr]">
            {/* QR-код строит сервер (lib/qr.ts): SVG из наших же данных */}
            <div className="h-52 w-52 rounded-lg bg-white p-1 ring-1 ring-slate-200 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: setup.qr }} />
            <form onSubmit={confirm} className="space-y-4 text-sm">
              <ol className="list-decimal space-y-2 pl-5 text-slate-700">
                <li>Установите на телефон приложение-аутентификатор: {APPS}.</li>
                <li>
                  В приложении добавьте аккаунт и отсканируйте QR-код. Не сканируется — введите ключ вручную:
                  <span className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-white px-2 py-1 font-mono text-xs tracking-wider ring-1 ring-slate-200">{setup.secret}</code>
                    <button type="button" className="text-brand-600 hover:underline" onClick={() => void navigator.clipboard.writeText(setup.secret.replace(/\s/g, '')).then(() => toast.ok('Ключ скопирован'))}>
                      копировать
                    </button>
                  </span>
                </li>
                <li>Введите код, который показало приложение.</li>
              </ol>
              {codeInput('Код из приложения', 'Ключ действует 10 минут — не успели, начните заново.')}
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={pending}>
                  Подтвердить и включить
                </Button>
                <Button onClick={() => setSetup(null)}>Отмена</Button>
              </div>
            </form>
          </div>
        )}

        {status.enabled && (
          <div className="mt-5 space-y-4">
            <p className={status.recoveryLeft <= 3 ? 'text-sm text-amber-700' : 'text-sm text-slate-600'}>
              Резервных кодов осталось: <b>{status.recoveryLeft}</b>
              {status.recoveryLeft <= 3 && ' — сделайте новые, пока есть телефон.'}
            </p>
            {asking ? (
              <form onSubmit={confirmAction} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                {codeInput(
                  asking === 'codes' ? 'Код из приложения — для новых резервных кодов' : 'Код из приложения или резервный код — чтобы выключить 2FA',
                )}
                <div className="flex gap-2">
                  <Button type="submit" variant={asking === 'disable' ? 'danger' : 'primary'} disabled={pending}>
                    {asking === 'codes' ? 'Сделать новые коды' : 'Выключить 2FA'}
                  </Button>
                  <Button onClick={() => setAsking(null)}>Отмена</Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAsking('codes')}>Новые резервные коды</Button>
                <Button variant="danger" onClick={() => setAsking('disable')}>
                  Выключить 2FA
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        Потеряли телефон и резервные коды — администратор сбросит 2FA в разделе «Пользователи»; затем вход по паролю и 2FA включается заново.
      </p>
    </div>
  );
}

/** Резервные коды — показываются один раз: скопировать или скачать файлом. */
function RecoveryCodes({ codes, email, onDone }: { codes: string[]; email: string; onDone: () => void }) {
  const text = `УралИндуктор — резервные коды входа (2FA)\n${email}\n\n${codes.join('\n')}\n\nКаждый код действует один раз — вместо кода из приложения, если телефона нет под рукой.\n`;
  function download() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    link.download = 'uralinduktor-2fa-rezervnye-kody.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <div className="mt-5 rounded-lg border border-accent-100 bg-accent-50 p-5" role="status">
      <div className="text-sm font-semibold text-slate-800">Сохраните резервные коды</div>
      <p className="mt-1 text-sm text-slate-600">
        Каждый подходит для одного входа вместо кода из приложения — на случай, если телефона нет под рукой. Больше их не покажем: скачайте
        файл или перепишите и храните отдельно от пароля.
      </p>
      <ul className="mt-3 grid max-w-md grid-cols-2 gap-x-8 gap-y-1 font-mono text-sm tracking-wider whitespace-nowrap text-slate-800">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={download}>
          Скачать файлом
        </Button>
        <Button onClick={() => void navigator.clipboard.writeText(text).then(() => toast.ok('Коды скопированы'))}>
          <Icon name="copy" className="h-4 w-4" />
          Копировать
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Сохранил, скрыть
        </Button>
      </div>
    </div>
  );
}
