import { LEAD_ENDPOINT } from './constants.ts';
import { AntiSpamFields, ConsentCheckbox, LeadForm, PhoneInput } from './LeadForm.tsx';

export interface SpareRequestFormProps {
  /** Название формы — источник заявки в CRM (data-form). */
  formName: string;
  /** Подпись поля модели («Модель установки», «Модель печи или ТПЧ»). */
  modelLabel: string;
  /** Пример модели в поле. */
  modelPlaceholder: string;
}

/**
 * Запрос запчасти (окно «Запросить» в каталогах запчастей): деталь, модель,
 * количество, имя, телефон, фото или чертёж. Деталь, модель и количество
 * подставляет скрипт каталога (zapchasti-catalog) по кнопке у позиции и перед
 * отправкой собирает их в сообщение. Без скриптов форма уходит обычной
 * отправкой на тот же адрес.
 */
export function SpareRequestForm({ formName, modelLabel, modelPlaceholder }: SpareRequestFormProps) {
  return (
    <LeadForm id="request-form" className="request-form" method="post" action={LEAD_ENDPOINT} encType="multipart/form-data" formName={formName}>
      <AntiSpamFields message />
      <label className="span2">
        Запчасть или перечень деталей
        <textarea name="part" required />
      </label>
      <label>
        {modelLabel}
        <input name="model" placeholder={modelPlaceholder} />
      </label>
      <label>
        Количество
        <input name="quantity" type="number" min="1" max="9999" defaultValue="1" required />
      </label>
      <label>
        Имя
        <input name="name" autoComplete="name" />
      </label>
      <label>
        Телефон
        <PhoneInput name="phone" required autoComplete="tel" />
      </label>
      <label className="span2">
        Фото или чертёж
        <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf" className="audit-file-input" />
      </label>
      <label className="span2 consent">
        <ConsentCheckbox />
        <span>
          {'Я соглашаюсь с '}
          <a href="/policy/" target="_blank" rel="noopener">
            политикой обработки персональных данных
          </a>
          {' и '}
          <a href="/soglasie/" target="_blank" rel="noopener">
            даю согласие на их обработку
          </a>
          .
        </span>
      </label>
      <button className="button span2" type="submit">
        Отправить запрос ↗
      </button>
      <div className="span2 js-form-status" role="status" hidden />
    </LeadForm>
  );
}
