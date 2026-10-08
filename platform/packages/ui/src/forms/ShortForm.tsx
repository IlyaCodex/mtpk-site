import { ARROW, FILE_ACCEPT } from './constants.ts';
import { AntiSpamFields, ConsentCheckbox, ConsentText, FileField, FormStatus, LeadForm, PhoneInput, SubmitButton, UploadIcon } from './LeadForm.tsx';

export interface ShortFormProps {
  /** Название формы — источник заявки в CRM (data-form). */
  formName: string;
  /** Подпись кнопки (HTML, без стрелки). */
  submit: string;
  /** Видимая подпись «Телефон» над полем — с этим id поля. */
  phoneId?: string;
  /** Автозаполнение телефона браузером (tel) или нет (off). */
  phoneAutocomplete?: 'tel' | 'off';
  /** Кнопка «Прикрепить…» (КП, ТЗ); без неё — только телефон. */
  file?: { label: string; id: string; inputClassName?: string } | null;
  /** Скрытое имя для формы без поля имени (обработчик требует имя). */
  hiddenName?: string;
}

/**
 * Короткая форма «Лучшее предложение»: телефон, по желанию — файл (КП, ТЗ),
 * согласие и кнопка. Стоит в блоке «Лучшее предложение» и в секциях услуг,
 * разделов каталога, «О компании».
 */
export function ShortForm({ formName, submit, phoneId, phoneAutocomplete = 'tel', file = { label: 'Прикрепить КП', id: 'bo-file' }, hiddenName }: ShortFormProps) {
  return (
    <LeadForm className="best-offer__form" formName={formName}>
      {' '}
      <AntiSpamFields spaced />
      {' '}
      <div className="best-offer__form-row">
        {' '}
        {phoneId ? (
          <>
            <label className="best-offer__field-label" htmlFor={phoneId}>
              Телефон
            </label>
            {' '}
          </>
        ) : null}
        <PhoneInput
          id={phoneId}
          name="phone"
          className="best-offer__phone-input"
          placeholder="+7 (___) ___-__-__"
          required
          autoComplete={phoneAutocomplete}
          aria-label="Контактный телефон"
        />
        {' '}
        {file ? (
          <>
            <FileField
              labelClassName="best-offer__file-btn"
              icon={
                <>
                  {' '}
                  <UploadIcon />
                </>
              }
              label={`\n${file.label}\n`}
              input={{ id: file.id, name: 'file', accept: FILE_ACCEPT, className: file.inputClassName ?? 'audit-file-input' }}
            />
            {' '}
          </>
        ) : null}
      </div>
      {' '}
      {hiddenName ? (
        <>
          <input type="hidden" name="name" defaultValue={hiddenName} />
          {' '}
        </>
      ) : null}
      <label className="best-offer__consent">
        {' '}
        <ConsentCheckbox />
        {' '}
        <ConsentText />
        {' '}
      </label>
      {' '}
      <SubmitButton className="btn btn--primary best-offer__submit" html={`${submit} ${ARROW}`} />
      {' '}
      <FormStatus />
      {' '}
    </LeadForm>
  );
}
