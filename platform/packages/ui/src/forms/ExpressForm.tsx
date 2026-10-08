import { ARROW } from './constants.ts';
import { AntiSpamFields, ConsentCheckbox, FormStatus, LeadForm, PhoneInput, SubmitButton } from './LeadForm.tsx';

/** Согласие в экспресс-форме — коротко, одной ссылкой на политику. */
export const EXPRESS_CONSENT = 'Согласен с&nbsp;<a href="/policy/" target="_blank" rel="noopener">политикой обработки персональных данных</a>';

export interface ExpressFormProps {
  /** Название формы — источник заявки в CRM (data-form). */
  formName: string;
  /** Подпись кнопки (HTML, без стрелки). */
  buttonLabel?: string;
  /** Текст согласия (HTML, со ссылкой на политику). */
  consent?: string;
  /** Подпись телефона для скринридеров (в форме только телефон). */
  phoneLabel?: string;
  /**
   * С полем имени и подписями над полями (страницы подбора дробемёта):
   * suffix — окончание id полей (qname-…, qphone-…), подписи — над полями.
   */
  contact?: { suffix: string; nameLabel: string; phoneLabel: string };
}

/**
 * Экспресс-заявка в обложке раздела («Экспресс-расчёт и консультация»):
 * телефон (по желанию — имя), кнопка «Жду звонка», согласие. Перезвон за
 * 10 минут обещает карточка вокруг формы.
 */
export function ExpressForm({ formName, buttonLabel = 'Жду звонка', consent = EXPRESS_CONSENT, phoneLabel = 'Контактный телефон', contact }: ExpressFormProps) {
  if (contact) {
    const nameId = `qname-${contact.suffix}`;
    const phoneId = `qphone-${contact.suffix}`;
    return (
      <LeadForm className="hero-quick-card__form" formName={formName}>
        {' '}
        <AntiSpamFields spaced message />
        {' '}
        <label className="hero-quick-card__label" htmlFor={nameId} dangerouslySetInnerHTML={{ __html: contact.nameLabel }} />
        {' '}
        <input id={nameId} className="hero-quick-card__input" type="text" name="name" placeholder="Имя" autoComplete="name" />
        {' '}
        <label className="hero-quick-card__label" htmlFor={phoneId} dangerouslySetInnerHTML={{ __html: contact.phoneLabel }} />
        {' '}
        <PhoneInput id={phoneId} className="hero-quick-card__input js-phone" name="phone" placeholder="+7 (___) ___-__-__" required autoComplete="tel" />
        {' '}
        <label className="hero-quick-card__consent">
          <ConsentCheckbox />
          <span dangerouslySetInnerHTML={{ __html: consent }} />
        </label>
        {' '}
        <SubmitButton className="btn btn--primary hero-quick-card__submit" html={`${buttonLabel} ${ARROW}`} />
        {' '}
        <FormStatus className="hero-quick-card__status" />
        {' '}
      </LeadForm>
    );
  }
  return (
    <LeadForm className="hero-quick-card__form" formName={formName}>
      <AntiSpamFields />
      <PhoneInput name="phone" className="hero-quick-card__input" placeholder="+7 (___) ___-__-__" required autoComplete="tel" aria-label={phoneLabel} />
      <SubmitButton className="btn btn--primary hero-quick-card__btn" html={`${buttonLabel} ${ARROW}`} />
      <label className="hero-quick-card__consent">
        <ConsentCheckbox />
        <span dangerouslySetInnerHTML={{ __html: consent }} />
      </label>
      <FormStatus />
    </LeadForm>
  );
}
