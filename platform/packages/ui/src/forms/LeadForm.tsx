'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ReactNode,
} from 'react';
import { appendAnalytics, getMarketing, reachGoal, refreshYmClientId } from './marketing.ts';
import { clearQuoteItems, getQuoteItems, mergeTaskText, subscribeQuote } from './quote-store.ts';
import { onPhoneInput } from './phone.ts';
import { LEAD_ENDPOINT } from './constants.ts';

const MAX_FILE = 10 * 1024 * 1024;
const PHONE_FALLBACK = 'Позвоните: +7 (351) 211-65-97';

type Status = { type: 'pending' | 'success' | 'error'; message: string } | null;

interface LeadFormState {
  pending: boolean;
  status: Status;
  statusId: string;
  setStatus: (s: Status) => void;
}
const Ctx = createContext<LeadFormState>({ pending: false, status: null, statusId: '', setStatus: () => {} });

type FormProps = Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit'> & {
  /** Название формы: источник заявки в CRM и метка цели Метрики (data-form). */
  formName: string;
  children: ReactNode;
};

/**
 * Форма заявки (перенос forms.js): антиспам-поля, источник, метки рекламы,
 * трейс Битрикс24, повторная отправка с тем же request_id (без дублей в CRM),
 * вложение до 10 МБ, статус для скринридеров, цель Метрики, переход на /spasibo/.
 * Разметка полей — в children (у каждого блока своя вёрстка).
 */
export function LeadForm({ formName, children, ...rest }: FormProps) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const statusId = `ui-form-status-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const loadedAt = useRef(0);
  const request = useRef({ id: '', fingerprint: '', goal: '' });

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    loadedAt.current = Date.now();
    getMarketing(); // зафиксировать первое касание сразу при загрузке страницы
    const ts = form.querySelector<HTMLInputElement>('.js-form-ts');
    if (ts) ts.value = String(Date.now());
    const src = form.querySelector<HTMLInputElement>('.js-form-source');
    if (src && !src.value) src.value = `${formName ? `${formName} · ` : ''}${location.pathname}`;
    const phone = form.querySelector<HTMLInputElement>('[name="phone"]');
    if (phone) {
      const d = phone.getAttribute('aria-describedby') || '';
      if (!d.split(' ').includes(statusId)) phone.setAttribute('aria-describedby', `${d} ${statusId}`.trim());
    }
    const timer = window.setTimeout(refreshYmClientId, 3000);
    window.addEventListener('cookie-consent-accepted', refreshYmClientId);
    // «Запросить цену»: накопленные позиции — в поле задачи
    const task = form.querySelector<HTMLTextAreaElement>('textarea[name="task"]');
    const syncTask = (items: string[]) => {
      if (task) task.value = mergeTaskText(task.value, items);
    };
    syncTask(getQuoteItems());
    const unsubscribe = subscribeQuote(syncTask);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('cookie-consent-accepted', refreshYmClientId);
      unsubscribe();
    };
  }, [formName, statusId]);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      if (pending) return;
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
      const phone = form.querySelector<HTMLInputElement>('[name="phone"]');
      if (phone && phone.value.replace(/\D/g, '').length < 6) {
        phone.setAttribute('aria-invalid', 'true');
        setStatus({ type: 'error', message: 'Укажите корректный телефон' });
        phone.focus();
        return;
      }
      phone?.removeAttribute('aria-invalid');

      const fd = new FormData(form);
      const file = form.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
      let fingerprint = ['phone', 'name', 'email', 'task', 'message', 'part', 'model', 'quantity', 'source', 'consent']
        .map((k) => String(fd.get(k) || ''))
        .join('\n');
      if (file) fingerprint += `\n${file.name}:${file.size}:${file.lastModified}`;
      // Повтор той же заявки — тот же request_id: сервис не создаст дубль
      if (!request.current.id || fingerprint !== request.current.fingerprint) {
        if (!window.crypto?.getRandomValues) {
          setStatus({ type: 'error', message: `Браузер не поддерживает защищённую отправку. ${PHONE_FALLBACK}` });
          return;
        }
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        request.current.id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        request.current.fingerprint = fingerprint;
      }
      const requestId = request.current.id;
      fd.set('request_id', requestId);
      const mk = getMarketing();
      for (const [k, v] of Object.entries(mk)) if (v) fd.append(k, v);
      appendAnalytics(fd);

      setPending(true);
      setStatus({ type: 'pending', message: '' });
      form.setAttribute('aria-busy', 'true');
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 65_000);
      try {
        // автозаполнение может опередить антиспам-порог (3 с) — дожидаемся его
        const wait = Math.min(3100, Math.max(0, 3100 - (Date.now() - loadedAt.current)));
        await new Promise((r) => setTimeout(r, wait));
        const res = await fetch(LEAD_ENDPOINT, {
          method: 'POST',
          body: fd,
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!(res.headers.get('Content-Type') || '').toLowerCase().includes('application/json')) throw new Error('bad response');
        const data = (await res.json()) as { ok?: unknown; message?: unknown; receipt?: unknown; delivery?: unknown };
        if (typeof data.ok !== 'boolean' || typeof data.message !== 'string') throw new Error('bad response');
        if (!data.ok) {
          setStatus({ type: 'error', message: data.message || `Не удалось отправить. ${PHONE_FALLBACK}` });
          return;
        }
        if (!res.ok || data.receipt !== requestId || !['delivered', 'queued'].includes(String(data.delivery))) {
          throw new Error('unconfirmed');
        }
        if (request.current.goal !== requestId) {
          reachGoal(form.getAttribute('data-form') || formName);
          request.current.goal = requestId;
        }
        clearQuoteItems();
        if (data.delivery === 'queued') {
          // доставка в CRM ещё не подтверждена — остаёмся на странице
          setStatus({ type: 'success', message: data.message });
          return;
        }
        try {
          sessionStorage.setItem('ui_lead_confirmed_phone', phone ? phone.value.trim() : '');
        } catch {
          /* приватный режим */
        }
        setStatus({ type: 'success', message: 'Заявка отправлена! Переходим…' });
        window.location.assign('/spasibo/');
      } catch {
        setStatus({
          type: 'error',
          message: `Не удалось получить подтверждение отправки. Данные сохранены в форме — попробуйте ещё раз. ${PHONE_FALLBACK}`,
        });
      } finally {
        window.clearTimeout(timeout);
        setPending(false);
        form.removeAttribute('aria-busy');
      }
    },
    [formName, pending],
  );

  return (
    <form ref={ref} data-form={formName} onSubmit={onSubmit} {...rest}>
      <Ctx.Provider value={{ pending, status, statusId, setStatus }}>{children}</Ctx.Provider>
    </form>
  );
}

/** Кнопка отправки: на время отправки — «Отправляем…» и неактивна. */
export function SubmitButton({ html, ...rest }: ComponentPropsWithoutRef<'button'> & { html: string }) {
  const { pending } = useContext(Ctx);
  return (
    <button type="submit" disabled={pending || undefined} {...rest} dangerouslySetInnerHTML={{ __html: pending ? 'Отправляем…' : html }} />
  );
}

/** Строка статуса отправки (role=status — читается скринридером). */
export function FormStatus({ as: Tag = 'div' }: { as?: 'div' | 'span' }) {
  const { status, statusId } = useContext(Ctx);
  const ref = useRef<HTMLElement>(null);
  const message = status?.message ?? '';
  useEffect(() => {
    if (status?.type === 'error' && message) ref.current?.focus();
  }, [status, message]);
  return (
    <Tag
      ref={ref as never}
      id={status ? statusId : undefined}
      className={status ? `js-form-status form-status form-status--${status.type}` : 'js-form-status'}
      style={{ display: message ? 'block' : 'none' }}
      role="status"
      aria-live="polite"
      tabIndex={status?.type === 'error' ? -1 : undefined}
      suppressHydrationWarning
    >
      {message}
    </Tag>
  );
}

/** Телефон с маской +7 (___) ___-__-__. */
export function PhoneInput(props: ComponentPropsWithoutRef<'input'>) {
  return <input type="tel" {...props} onInput={onPhoneInput} suppressHydrationWarning />;
}

/**
 * Поле «Прикрепить файл»: на кнопке — имя выбранного файла, лимит 10 МБ.
 * children — иконка; label — подпись по умолчанию (с исходными пробелами).
 */
export function FileField({
  labelClassName,
  label,
  icon,
  input,
}: {
  labelClassName: string;
  label: string;
  icon: ReactNode;
  input: ComponentPropsWithoutRef<'input'>;
}) {
  const { setStatus } = useContext(Ctx);
  const [name, setName] = useState('');
  return (
    <label className={name ? `${labelClassName} is-attached` : labelClassName} htmlFor={input.id}>
      {icon}
      {name ? ` ${name.length > 28 ? `${name.slice(0, 15)}…${name.slice(-9)}` : name}` : label}
      <input
        type="file"
        {...input}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f && f.size > MAX_FILE) {
            e.currentTarget.value = '';
            setName('');
            setStatus({ type: 'error', message: 'Файл больше 10 МБ — приложите файл поменьше' });
            return;
          }
          setName(f ? f.name : '');
        }}
      />
    </label>
  );
}
