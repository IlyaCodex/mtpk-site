import { FileField, FormStatus, LeadForm, PhoneInput, SubmitButton } from "../forms/LeadForm.tsx";
import { ARROW } from "../forms/constants.ts";
// Блок «Лучшее коммерческое предложение» (маркер best-offer) — короткая форма заявки.
// Разметка совпадает с прежней вёрсткой сайта до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
// anchorId — якорь секции: leadgen, если отдельного блока заявки на странице нет (на него ведут
// кнопки «Обсудить задачу»), иначе best-offer — чтобы не было двух id=leadgen.
export function BestOffer({ anchorId = 'leadgen' }: { anchorId?: string }) {
  return (
    <>
    <section className="best-offer" id={anchorId} aria-label="Лучшее коммерческое предложение">
      {" "}
      <div className="container">
        {" "}
        <div className="best-offer__card">
          {" "}
          <div className="best-offer__contacts" id="contacts">
            {" "}
            <div className="bo-contact-eyebrow">
              Контакты
            </div>
            {" "}
            <a href="tel:+78003513401" className="bo-contact">
              {" "}
              <div className="bo-contact__icon">
                {" "}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {" "}
              </div>
              {" "}
              <div className="bo-contact__body">
                {" "}
                <div className="bo-contact__label">
                  {"Бесплатно по\u00A0России"}
                </div>
                {" "}
                <div className="bo-contact__value">
                  {"8\u00A0800\u00A0351-34-01"}
                </div>
                {" "}
                <div className="bo-contact__meta">
                  {"Звонок из\u00A0любого региона"}
                </div>
                {" "}
              </div>
              {" "}
            </a>
            {" "}
            <a href="tel:+73512116597" className="bo-contact">
              {" "}
              <div className="bo-contact__icon">
                {" "}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {" "}
              </div>
              {" "}
              <div className="bo-contact__body">
                {" "}
                <div className="bo-contact__label">
                  Телефон офиса
                </div>
                {" "}
                <div className="bo-contact__value">
                  +7 (351) 211-65-97
                </div>
                {" "}
                <div className="bo-contact__meta">
                  {"Отдел продаж и\u00A0инженерный центр"}
                </div>
                {" "}
              </div>
              {" "}
            </a>
            {" "}
            <a href="mailto:info@uralinduktor.ru" className="bo-contact">
              {" "}
              <div className="bo-contact__icon">
                {" "}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="1" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                {" "}
              </div>
              {" "}
              <div className="bo-contact__body">
                {" "}
                <div className="bo-contact__label">
                  Электронная почта
                </div>
                {" "}
                <div className="bo-contact__value">
                  info@uralinduktor.ru
                </div>
                {" "}
                <div className="bo-contact__meta">
                  {"Ответ в\u00A0течение рабочего дня"}
                </div>
                {" "}
              </div>
              {" "}
            </a>
            {" "}
            <div className="bo-contact">
              {" "}
              <div className="bo-contact__icon">
                {" "}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {" "}
              </div>
              {" "}
              <div className="bo-contact__body">
                {" "}
                <div className="bo-contact__label">
                  Адрес главного офиса
                </div>
                {" "}
                <div className="bo-contact__value bo-contact__value--sm">
                  {"Челябинская область, г.\u00A0Миасс,"}
                  <br />
                  {"ул.\u00A0Уральских Добровольцев, 1в"}
                </div>
                {" "}
              </div>
              {" "}
            </div>
            {" "}
            <div className="bo-contact">
              {" "}
              <div className="bo-contact__icon">
                {" "}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {" "}
              </div>
              {" "}
              <div className="bo-contact__body">
                {" "}
                <div className="bo-contact__label">
                  График работы
                </div>
                {" "}
                <div className="bo-contact__value">
                  {"Пн\u00A0— Пт, 9:00 — 18:00"}
                </div>
                {" "}
                <div className="bo-contact__meta">
                  МСК+2 (время ЕКБ)
                </div>
                {" "}
              </div>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          <div>
            {" "}
            <div className="s-eyebrow">
              {"Сравним и\u00A0улучшим"}
            </div>
            {" "}
            <h2 className="s-title best-offer__title">
              {"Подготовим "}
              <em>
                лучшее предложение
              </em>
            </h2>
            {" "}
            <p className="s-lead best-offer__lead">
              {"Пришлите коммерческое предложение от\u00A0другой компании — рассчитаем более выгодную стоимость с\u00A0учётом нашей складской базы и\u00A0собственного производства."}
            </p>
            {" "}
            <LeadForm className="best-offer__form" formName="Лучшее предложение">
              {" "}
              <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {" "}
              <input type="hidden" name="form_ts" className="js-form-ts" />
              {" "}
              <input type="hidden" name="source" className="js-form-source" />
              {" "}
              <div className="best-offer__form-row">
                {" "}
                <PhoneInput name="phone" className="best-offer__phone-input" placeholder="+7 (___) ___-__-__" required autoComplete="tel" aria-label="Контактный телефон" />
                {" "}
                <FileField
                labelClassName="best-offer__file-btn"
                icon={<>{" "}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg></>}
                label={"\nПрикрепить КП\n"}
                input={{ id: "bo-file", name: "file", accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png", className: "audit-file-input" }}
              />
                {" "}
              </div>
              {" "}
              <label className="best-offer__consent">
                {" "}
                <input type="checkbox" name="consent" defaultValue="v2026.1" required />
                {" "}
                <span>
                  {"Я\u00A0соглашаюсь с\u00A0"}
                  <a href="/policy/" target="_blank" rel="noopener">
                    политикой обработки персональных данных
                  </a>
                  {" и\u00A0"}
                  <a href="/soglasie/" target="_blank" rel="noopener">
                    {"даю согласие на\u00A0их\u00A0обработку"}
                  </a>
                </span>
                {" "}
              </label>
              {" "}
              <SubmitButton className="btn btn--primary best-offer__submit" html={"Получить лучшее предложение " + ARROW} />
              {" "}
              <FormStatus />
              {" "}
            </LeadForm>
            {" "}
            <div className="best-offer__phone-fallback">
              {"\nИли звоните: "}
              <a href="tel:+78003513401">
                {"8\u00A0800\u00A0351-34-01"}
              </a>
              {" · "}
              <a href="tel:+73512116597">
                {"+7\u00A0(351)\u00A0211-65-97"}
              </a>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </section>
    </>
  );
}
