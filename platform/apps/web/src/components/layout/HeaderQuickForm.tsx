import { FormStatus, LeadForm, PhoneInput, SubmitButton } from '@mtpk/ui';

/**
 * Экспресс-звонок в шапке (на широких экранах). Антиспам-поля hp_token и
 * form_ts и источник заявки обязательны — на них держатся защита и атрибуция.
 */
export function HeaderQuickForm() {
  return (
    <LeadForm className="header-quick-form" formName="Шапка: быстрый звонок">
      <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <input type="hidden" name="form_ts" className="js-form-ts" />
      <input type="hidden" name="source" className="js-form-source" />
      <PhoneInput
        name="phone"
        className="header-quick-form__input"
        placeholder="+7 (___) ___-__-__"
        required
        autoComplete="tel"
        aria-label="Контактный телефон для обратного звонка"
      />
      {/* Согласие видимое и обязательное (152-ФЗ); таб: телефон → согласие → «Перезвонить» */}
      <label className="header-quick-form__consent">
        <input type="checkbox" name="consent" defaultValue="v2026.1" required />
        <span>
          Даю <a href="/soglasie/" target="_blank" rel="noopener">согласие</a> на обработку данных по{' '}
          <a href="/policy/" target="_blank" rel="noopener">политике</a>
        </span>
      </label>
      <SubmitButton className="header-quick-form__btn" html="Перезвонить" />
      <span className="header-quick-form__hint">{'Перезвоним в\u00A0течение 10\u00A0минут'}</span>
      <FormStatus as="span" />
    </LeadForm>
  );
}
