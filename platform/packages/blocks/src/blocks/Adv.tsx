// Блок «Преимущества собственного производства» (маркеры adv, adv-12, adv-chiller) — из Adv.astro.
// Разметка сгенерирована из итогового HTML Astro-сборки (tools/codegen) и совпадает
// с ней до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
// warranty — срок гарантии в заголовке: 18 месяцев по умолчанию, 12 — у чиллеров и транзисторных печей.
export function Adv({ warranty = '18\u00A0месяцев' }: { warranty?: string }) {
  return (
    <>
    <section className="adv" aria-label="Преимущества собственного производства">
      {" "}
      <div className="container">
        {" "}
        <div className="adv__head">
          {" "}
          <div className="adv__eyebrow">
            Преимущества
          </div>
          {" "}
          <h2 className="adv__title">
            {"Высочайший контроль качества и\u00A0"}
            <em style={{ fontStyle: "normal", color: "var(--text-brand)" }}>
              {`расширенная гарантия ${warranty}`}
            </em>
          </h2>
          {" "}
          <p className="adv__lead">
            {"Собственное производство даёт независимость от\u00A0внешних поставщиков, контроль на\u00A0всех этапах и\u00A0возможность адаптировать оборудование под\u00A0задачу заказчика."}
          </p>
          {" "}
        </div>
        {" "}
        <div className="adv__grid">
          {" "}
          <div className="adv-item">
            {" "}
            <div className="adv-item__icon">
              {" "}
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4l11 4v8c0 6.6-4.5 12.6-11 14-6.5-1.4-11-7.4-11-14V8l11-4z" />
                <path d="M11 16l4 4 7-7" strokeWidth="2.5" />
              </svg>
              {" "}
            </div>
            {" "}
            <h3 className="adv-item__title">
              {"Контроль качества на\u00A0всех этапах"}
            </h3>
            {" "}
            <p className="adv-item__text">
              {"Контролируем подбор комплектующих, сборку, проверку узлов и\u00A0итоговую готовность оборудования к\u00A0отгрузке."}
            </p>
            {" "}
          </div>
          {" "}
          <div className="adv-item">
            {" "}
            <div className="adv-item__icon">
              {" "}
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 9h14M23 9h4M5 16h6M15 16h12M5 23h18M27 23h0" />
                <circle cx="21" cy="9" r="2" />
                <circle cx="13" cy="16" r="2" />
                <circle cx="25" cy="23" r="2" />
              </svg>
              {" "}
            </div>
            {" "}
            <h3 className="adv-item__title">
              {"Адаптация под\u00A0производственную задачу"}
            </h3>
            {" "}
            <p className="adv-item__text">
              {"Оборудование можно доработать под\u00A0требования участка, режим работы, металл или\u00A0требуемую производительность."}
            </p>
            {" "}
          </div>
          {" "}
          <div className="adv-item">
            {" "}
            <div className="adv-item__icon">
              {" "}
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 6l4 4-12 12-4 1 1-4z" />
                <path d="M16 12l4 4" />
                <path d="M6 22l-3 8 8-3" />
              </svg>
              {" "}
            </div>
            {" "}
            <h3 className="adv-item__title">
              Эффективное сервисное сопровождение
            </h3>
            {" "}
            <p className="adv-item__text">
              {"Диагностика, подбор запчастей и\u00A0выполнение ремонтных работ происходят быстрее и\u00A0точнее."}
            </p>
            {" "}
          </div>
          {" "}
          <div className="adv-item">
            {" "}
            <div className="adv-item__icon">
              {" "}
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 28V14l8-4v4l8-4v6l8-2v14H3z" />
                <path d="M9 22h2M15 22h2M21 22h2M9 26h2M15 26h2M21 26h2" />
              </svg>
              {" "}
            </div>
            {" "}
            <h3 className="adv-item__title">
              Отечественная инженерная база
            </h3>
            {" "}
            <p className="adv-item__text">
              {"Собственная производственная база, склад и\u00A0сервис делают обслуживание оперативным и\u00A0исключают зависимость от\u00A0внешних цепочек поставок."}
            </p>
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
