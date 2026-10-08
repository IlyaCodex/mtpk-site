import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type FormProps = ComponentPropsWithoutRef<'form'> & {
  /** Название формы: источник заявки в CRM и метка цели Метрики (data-form). */
  formName: string;
  children: ReactNode;
};

/**
 * Основа любой формы заявки: тег <form> с data-form и классом js-lead-form.
 * Отправку на /api/send.php, антиспам, метки рекламы и статус берёт на себя
 * клиентский модуль forms (apps/web/src/client/forms.ts); по js-lead-form
 * форму находят и старые скрипты (статьи Практикума, страница сравнения).
 */
export function LeadForm({ formName, children, className, ...rest }: FormProps) {
  return (
    <form data-form={formName} className={className ? `${className} js-lead-form` : 'js-lead-form'} {...rest}>
      {children}
    </form>
  );
}

/**
 * Служебные поля, которых ждёт обработчик заявок: hp_token — ловушка для
 * ботов (скрыта от людей), form_ts — время показа формы (слишком быстрая
 * отправка — бот), source — какая форма и на какой странице.
 */
export function AntiSpamFields({ spaced = false, message = false }: { spaced?: boolean; message?: boolean }) {
  const gap = spaced ? ' ' : null;
  return (
    <>
      <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {gap}
      <input type="hidden" name="form_ts" className="js-form-ts" />
      {gap}
      <input type="hidden" name="source" className="js-form-source" />
      {message ? (
        <>
          {gap}
          <input type="hidden" name="message" />
        </>
      ) : null}
    </>
  );
}

/** Кнопка отправки; подпись — HTML (со стрелкой «→»). */
export function SubmitButton({ html, ...rest }: ComponentPropsWithoutRef<'button'> & { html: string }) {
  return <button type="submit" {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Строка статуса отправки (role=status — читается скринридером). Скрыта, пока модуль forms её не заполнит. */
export function FormStatus({ as: Tag = 'div', className }: { as?: 'div' | 'span'; className?: string }) {
  return <Tag className={className ? `js-form-status ${className}` : 'js-form-status'} hidden role="status" aria-live="polite" />;
}

/** Телефон; маску +7 (___) ___-__-__ накладывает клиентский модуль. */
export function PhoneInput(props: ComponentPropsWithoutRef<'input'>) {
  return <input type="tel" {...props} />;
}

/** Галочка согласия на обработку персональных данных (152-ФЗ): обязательная, версия текста — v2026.1. */
export function ConsentCheckbox() {
  return <input type="checkbox" name="consent" defaultValue="v2026.1" required />;
}

/** Полный текст согласия: политика и согласие — ссылками. */
export function ConsentText() {
  return (
    <span>
      {'Я соглашаюсь с '}
      <a href="/policy/" target="_blank" rel="noopener">
        политикой обработки персональных данных
      </a>
      {' и '}
      <a href="/soglasie/" target="_blank" rel="noopener">
        {'даю согласие на их обработку'}
      </a>
    </span>
  );
}

/**
 * Поле «Прикрепить файл». Подпись — текстом после иконки: модуль forms
 * заменяет её именем выбранного файла и проверяет лимит 10 МБ.
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
  return (
    <label className={labelClassName} htmlFor={input.id}>
      {icon}
      {label}
      <input type="file" {...input} />
    </label>
  );
}

/** Иконка «загрузить» на кнопке выбора файла. */
export function UploadIcon({ hidden = false }: { hidden?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={hidden ? 'true' : undefined}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
