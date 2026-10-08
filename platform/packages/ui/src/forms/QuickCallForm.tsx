import { AntiSpamFields, FormStatus, LeadForm, PhoneInput, SubmitButton } from './LeadForm.tsx';

/**
 * Экспресс-звонок в шапке (на широких экранах): телефон, согласие,
 * «Перезвонить». Источник заявки — «Шапка: быстрый звонок».
 */
export function QuickCallForm() {
  return (
    <LeadForm className="header-quick-form" formName="Шапка: быстрый звонок">
      <AntiSpamFields />
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
      <span className="header-quick-form__hint">{'Перезвоним в течение 10 минут'}</span>
      <FormStatus as="span" />
    </LeadForm>
  );
}
