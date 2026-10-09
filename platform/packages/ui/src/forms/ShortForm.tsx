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
  /** Кнопка «Прикрепить…» (КП, ТЗ); без неё — только телефон. hint — вторая строка в зоне файла (вид card). */
  file?: { label: string; id: string; inputClassName?: string; hint?: string } | null;
  /** Скрытое имя для формы без поля имени (обработчик требует имя). */
  hiddenName?: string;
  /**
   * Вид: row — телефон и кнопка «Прикрепить» в строку (секции услуг, разделов);
   * card — зона файла «выберите или перетащите», подпись над телефоном,
   * кнопка во всю ширину (блок «Контакты»).
   */
  variant?: 'row' | 'card';
}

/** Значок документа в зоне файла (Solar document-text). */
const DOC_ICON =
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M3 10C3 6.23 3 4.34 4.17 3.17C5.34 2 7.23 2 11 2H13C16.77 2 18.66 2 19.83 3.17C21 4.34 21 6.23 21 10V14C21 17.77 21 19.66 19.83 20.83C18.66 22 16.77 22 13 22H11C7.23 22 5.34 22 4.17 20.83C3 19.66 3 17.77 3 14V10Z"/><path d="M8 12H16"/><path d="M8 8H16"/><path d="M8 16H13"/></g>';

/** Форма-карточка: файл (выбрать или перетащить), телефон с подписью, согласие, кнопка во всю ширину. */
function CardForm({ formName, submit, phoneId = 'bo-card-phone', phoneAutocomplete = 'tel', file, hiddenName }: ShortFormProps) {
  return (
    <LeadForm className="best-offer__form best-offer__form--card" formName={formName}>
      <AntiSpamFields />
      {file ? (
        <label className="best-offer__drop" htmlFor={file.id}>
          <span className="best-offer__drop-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: DOC_ICON }} />
          </span>
          <span className="best-offer__drop-text">
            <strong data-file-name="">{file.label}</strong>
            {file.hint !== undefined && <span>{file.hint}</span>}
          </span>
          <input type="file" id={file.id} name="file" accept={FILE_ACCEPT} className="best-offer__drop-input" />
        </label>
      ) : null}
      <div className="best-offer__field">
        <label className="best-offer__field-label" htmlFor={phoneId}>
          Телефон для связи
        </label>
        <PhoneInput id={phoneId} name="phone" className="best-offer__phone-input" placeholder="+7 (___) ___-__-__" required autoComplete={phoneAutocomplete} />
      </div>
      {hiddenName ? <input type="hidden" name="name" defaultValue={hiddenName} /> : null}
      <label className="best-offer__consent">
        <ConsentCheckbox /> <ConsentText />
      </label>
      <SubmitButton className="btn btn--primary best-offer__submit" html={`${submit} ${ARROW}`} />
      <FormStatus />
    </LeadForm>
  );
}

/**
 * Короткая форма «Лучшее предложение»: телефон, по желанию — файл (КП, ТЗ),
 * согласие и кнопка. Стоит в блоке «Лучшее предложение» и в секциях услуг,
 * разделов каталога, «О компании».
 */
export function ShortForm(props: ShortFormProps) {
  if (props.variant === 'card') return <CardForm {...props} />;
  const { formName, submit, phoneId, phoneAutocomplete = 'tel', file = { label: 'Прикрепить КП', id: 'bo-file' }, hiddenName } = props;
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
