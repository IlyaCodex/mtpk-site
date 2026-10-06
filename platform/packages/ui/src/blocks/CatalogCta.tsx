import { FileField, FormStatus, LeadForm, PhoneInput, SubmitButton } from "../forms/LeadForm.tsx";
import { ARROW } from "../forms/constants.ts";
// Блок «Каталог / запрос КП» (маркер catalog-cta) — из CatalogCta.astro.
// Разметка сгенерирована из итогового HTML Astro-сборки (tools/codegen) и совпадает
// с ней до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
export function CatalogCta() {
  return (
    <>
    <section className="catalog-cta" aria-label="Подготовим лучшее предложение">
      {" "}
      <div className="container">
        {" "}
        <div className="catalog-cta__inner">
          {" "}
          <div className="catalog-cta__lead">
            {" "}
            <h2 className="catalog-cta__title">
              Подготовим лучшее предложение
            </h2>
            {" "}
            <p className="catalog-cta__text">
              {"Направьте коммерческое предложение другого поставщика\u00A0— рассчитаем более выгодную стоимость с\u00A0учётом нашего производства и\u00A0складской базы."}
            </p>
            {" "}
          </div>
          {" "}
          <LeadForm className="catalog-cta__form" formName="Каталог · Лучшее предложение">
            {" "}
            <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {" "}
            <input type="hidden" name="form_ts" className="js-form-ts" />
            {" "}
            <input type="hidden" name="source" className="js-form-source" />
            {" "}
            <div className="catalog-cta__row">
              {" "}
              <PhoneInput name="phone" autoComplete="tel" className="catalog-cta__input" placeholder="+7 (___) ___-__-__" required aria-label="Контактный телефон" />
              {" "}
              <FileField
                labelClassName="catalog-cta__file"
                icon={<>{" "}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg></>}
                label={"\nПрикрепить КП\n"}
                input={{ id: "kp-file", name: "file", accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png", className: "audit-file-input" }}
              />
              {" "}
              <SubmitButton className="btn btn--green" html={"Получить лучшее предложение " + ARROW} />
              {" "}
            </div>
            {" "}
            <label className="catalog-cta__consent">
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
            <FormStatus />
            {" "}
          </LeadForm>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </section>
    </>
  );
}
