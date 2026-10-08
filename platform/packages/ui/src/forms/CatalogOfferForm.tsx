import { ARROW, FILE_ACCEPT } from './constants.ts';
import { AntiSpamFields, ConsentCheckbox, ConsentText, FileField, FormStatus, LeadForm, PhoneInput, SubmitButton, UploadIcon } from './LeadForm.tsx';

/**
 * Форма призыва «Подготовим лучшее предложение» под сеткой каталога:
 * телефон, файл КП и кнопка в одну строку, согласие — под ними.
 */
export function CatalogOfferForm({ formName = 'Каталог · Лучшее предложение' }: { formName?: string }) {
  return (
    <LeadForm className="catalog-cta__form" formName={formName}>
      {' '}
      <AntiSpamFields spaced />
      {' '}
      <div className="catalog-cta__row">
        {' '}
        <PhoneInput name="phone" autoComplete="tel" className="catalog-cta__input" placeholder="+7 (___) ___-__-__" required aria-label="Контактный телефон" />
        {' '}
        <FileField
          labelClassName="catalog-cta__file"
          icon={
            <>
              {' '}
              <UploadIcon />
            </>
          }
          label={'\nПрикрепить КП\n'}
          input={{ id: 'kp-file', name: 'file', accept: FILE_ACCEPT, className: 'audit-file-input' }}
        />
        {' '}
        <SubmitButton className="btn btn--green" html={`Получить лучшее предложение ${ARROW}`} />
        {' '}
      </div>
      {' '}
      <label className="catalog-cta__consent">
        {' '}
        <ConsentCheckbox />
        {' '}
        <ConsentText />
        {' '}
      </label>
      {' '}
      <FormStatus />
      {' '}
    </LeadForm>
  );
}
