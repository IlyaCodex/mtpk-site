import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type FormProps = ComponentPropsWithoutRef<'form'> & {
  /** Название формы: источник заявки в CRM и метка цели Метрики (data-form). */
  formName: string;
  children: ReactNode;
};

/**
 * Форма заявки. Разметка полей — в children (у каждого блока своя вёрстка);
 * отправку, антиспам-поля, метки рекламы и статус берёт на себя клиентский
 * модуль forms (apps/web/src/client/forms.ts) — по атрибуту data-form.
 */
export function LeadForm({ formName, children, ...rest }: FormProps) {
  return (
    <form data-form={formName} {...rest}>
      {children}
    </form>
  );
}

/** Кнопка отправки; подпись — HTML (со стрелкой «→»). */
export function SubmitButton({ html, ...rest }: ComponentPropsWithoutRef<'button'> & { html: string }) {
  return <button type="submit" {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Строка статуса отправки (role=status — читается скринридером). Скрыта, пока модуль forms её не заполнит. */
export function FormStatus({ as: Tag = 'div' }: { as?: 'div' | 'span' }) {
  return <Tag className="js-form-status" hidden role="status" aria-live="polite" />;
}

/** Телефон; маску +7 (___) ___-__-__ накладывает клиентский модуль. */
export function PhoneInput(props: ComponentPropsWithoutRef<'input'>) {
  return <input type="tel" {...props} />;
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
