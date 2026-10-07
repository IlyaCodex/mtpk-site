// Блок «Партнёры / лизинг» (маркер partner) — общая секция сайта.
// Разметка совпадает с прежней вёрсткой сайта до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
export function Partner() {
  return (
    <>
    <section className="partner" aria-label="Один партнёр для любой задачи">
      {" "}
      <div className="container">
        {" "}
        <div className="partner__head">
          {" "}
          <div className="partner__eyebrow">
            {"УралИндуктор · с\u00A02013\u00A0года"}
          </div>
          {" "}
          <h2 className="partner__title">
            {"Один партнёр для\u00A0любой "}
            <em>
              производственной задачи
            </em>
          </h2>
          {" "}
          <p className="partner__lead">
            {"УралИндуктор обеспечивает полный цикл работ с\u00A0оборудованием литейных, металлургических и\u00A0машиностроительных предприятий."}
          </p>
          {" "}
        </div>
        {" "}
        <div className="partner__pillars">
          {" "}
          <div className="pillar">
            <div className="pillar__num">
              01
            </div>
            <div className="pillar__divider" />
            <p className="pillar__text">
              {"Подбор оборудования под\u00A0технологическую задачу"}
            </p>
          </div>
          {" "}
          <div className="pillar">
            <div className="pillar__num">
              02
            </div>
            <div className="pillar__divider" />
            <p className="pillar__text">
              Модернизация действующего участка
            </p>
          </div>
          {" "}
          <div className="pillar">
            <div className="pillar__num">
              03
            </div>
            <div className="pillar__divider" />
            <p className="pillar__text">
              Запуск нового производственного направления
            </p>
          </div>
          {" "}
          <div className="pillar">
            <div className="pillar__num">
              04
            </div>
            <div className="pillar__divider" />
            <p className="pillar__text">
              Стабильная работа действующего производства
            </p>
          </div>
          {" "}
          <div className="pillar">
            <div className="pillar__num">
              05
            </div>
            <div className="pillar__divider" />
            <p className="pillar__text">
              {"Обслуживание, сервис и\u00A0поставка запчастей"}
            </p>
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
