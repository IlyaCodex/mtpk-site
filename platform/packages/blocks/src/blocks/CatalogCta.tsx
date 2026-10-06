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
          <form className="catalog-cta__form js-lead-form" data-form="Каталог · Лучшее предложение">
            {" "}
            <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {" "}
            <input type="hidden" name="form_ts" className="js-form-ts" />
            {" "}
            <input type="hidden" name="source" className="js-form-source" />
            {" "}
            <div className="catalog-cta__row">
              {" "}
              <input type="tel" name="phone" autoComplete="tel" className="catalog-cta__input" placeholder="+7 (___) ___-__-__" required aria-label="Контактный телефон" />
              {" "}
              <label className="catalog-cta__file" htmlFor="kp-file">
                {" "}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {"\nПрикрепить КП\n"}
                <input type="file" id="kp-file" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" className="audit-file-input" />
                {" "}
              </label>
              {" "}
              <button type="submit" className="btn btn--green">
                {"Получить лучшее предложение "}
                <span className="btn__arrow">
                  →
                </span>
              </button>
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
            <div className="js-form-status" style={{ display: "none" }} role="status" aria-live="polite" />
            {" "}
          </form>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </section>
    </>
  );
}
