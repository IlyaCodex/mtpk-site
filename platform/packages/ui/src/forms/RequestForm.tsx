import { ARROW, FILE_ACCEPT } from './constants.ts';
import { AntiSpamFields, ConsentCheckbox, ConsentText, FileField, FormStatus, LeadForm, PhoneInput, SubmitButton, UploadIcon } from './LeadForm.tsx';

export interface RequestFormProps {
  /** Название формы — источник заявки в CRM (data-form). */
  formName: string;
  /** Заголовок над полями. */
  title: string;
  /** Начало id полей (pn → pn-name, pn-phone…): на странице id не должны повторяться. */
  idPrefix: string;
  /** Звёздочки у обязательных полей (имя, телефон). */
  marks?: boolean;
  /** Подпись поля задачи. */
  taskLabel?: string;
  /** Пример в поле задачи. */
  taskPlaceholder: string;
  /** Поле «Техническое задание или паспорт» с выбором файла. */
  file?: boolean;
  /** Подпись кнопки (HTML, без стрелки). */
  submit: string;
}

function Label({ id, text, mark }: { id: string; text: string; mark: boolean }) {
  return (
    <label className="form__label" htmlFor={id}>
      {mark ? (
        <>
          {`${text} `}
          <span aria-hidden="true">*</span>
        </>
      ) : (
        text
      )}
    </label>
  );
}

/**
 * Полная форма заявки «Подбор и расчёт»: имя, почта, телефон, задача,
 * по желанию — файл ТЗ. Стоит в блоке «Подбор и расчёт» и в секциях услуг,
 * разделов каталога, «Контактов».
 */
export function RequestForm({
  formName,
  title,
  idPrefix: p,
  marks = true,
  taskLabel = 'Описание задачи',
  taskPlaceholder,
  file = false,
  submit,
}: RequestFormProps) {
  return (
    <LeadForm className="form" formName={formName}>
      {' '}
      <h3 className="form__title">{title}</h3>
      {' '}
      <AntiSpamFields spaced />
      {' '}
      <div className="form__field">
        {' '}
        <Label id={`${p}-name`} text="Имя" mark={marks} />
        {' '}
        <input className="form__input" type="text" name="name" id={`${p}-name`} placeholder="Иван Петров" autoComplete="name" required />
        {' '}
      </div>
      {' '}
      <div className="form__row">
        {' '}
        <div className="form__field">
          {' '}
          <label className="form__label" htmlFor={`${p}-email`}>
            Эл. почта
          </label>
          {' '}
          <input className="form__input" type="email" name="email" id={`${p}-email`} placeholder="ivan@company.ru" autoComplete="email" />
          {' '}
        </div>
        {' '}
        <div className="form__field">
          {' '}
          <Label id={`${p}-phone`} text="Телефон" mark={marks} />
          {' '}
          <PhoneInput className="form__input" name="phone" id={`${p}-phone`} placeholder="+7 (___) ___-__-__" autoComplete="tel" required />
          {' '}
        </div>
        {' '}
      </div>
      {' '}
      <div className="form__field">
        {' '}
        <label className="form__label" htmlFor={`${p}-task`}>
          {taskLabel}
        </label>
        {' '}
        <textarea className="form__textarea" name="task" id={`${p}-task`} rows={3} placeholder={taskPlaceholder} />
        {' '}
      </div>
      {' '}
      {file ? (
        <>
          <div className="form__field">
            {' '}
            <span className="form__label">Техническое задание или паспорт</span>
            {' '}
            <FileField
              labelClassName="form__file"
              icon={
                <>
                  {' '}
                  <UploadIcon hidden />
                </>
              }
              label={'\nПрикрепить файл\n'}
              input={{ name: 'file', id: `${p}-file`, accept: FILE_ACCEPT, className: 'audit-file-input' }}
            />
            {' '}
            <span className="form__hint">{'PDF, DOC, XLS, JPG или PNG, до 10 МБ'}</span>
            {' '}
          </div>
          {' '}
        </>
      ) : null}
      <label className="form__check">
        {' '}
        <ConsentCheckbox />
        {' '}
        <ConsentText />
        {' '}
      </label>
      {' '}
      <SubmitButton className="form__submit" html={`${submit} ${ARROW}`} />
      {' '}
      <FormStatus />
      {' '}
    </LeadForm>
  );
}
