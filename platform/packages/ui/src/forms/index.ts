/**
 * Формы обратной связи сайта — React-компоненты (TypeScript), сверстаны один раз:
 *
 *   QuickCallForm     звонок в шапке: телефон, согласие, «Перезвонить»
 *   ExpressForm       экспресс-заявка в обложке раздела: телефон (и имя)
 *   RequestForm       «Подбор и расчёт»: имя, почта, телефон, задача, файл
 *   ShortForm         «Лучшее предложение»: телефон и файл КП/ТЗ
 *   CatalogOfferForm  предложение по каталогу: телефон, файл, кнопка в строку
 *   SpareRequestForm  запрос запчасти: деталь, модель, количество
 *
 * Все отправляют заявку на /api/send.php (клиентский модуль forms): антиспам,
 * источник, метки рекламы, статус, переход на «Спасибо». В HTML-секциях формы
 * вставляются тегом <ui-form type="…"> (FormSlot).
 */
export { CatalogOfferForm } from './CatalogOfferForm.tsx';
export { ARROW, FILE_ACCEPT, LEAD_ENDPOINT } from './constants.ts';
export { EXPRESS_CONSENT, ExpressForm, type ExpressFormProps } from './ExpressForm.tsx';
export { FORM_TAG, FORM_TYPES, FormSlot, hasFormSlots, HtmlWithForms } from './FormSlot.tsx';
export { AntiSpamFields, ConsentCheckbox, ConsentText, FileField, FormStatus, LeadForm, PhoneInput, SubmitButton, UploadIcon } from './LeadForm.tsx';
export { QuickCallForm } from './QuickCallForm.tsx';
export { RequestForm, type RequestFormProps } from './RequestForm.tsx';
export { ShortForm, type ShortFormProps } from './ShortForm.tsx';
export { SpareRequestForm, type SpareRequestFormProps } from './SpareRequestForm.tsx';
