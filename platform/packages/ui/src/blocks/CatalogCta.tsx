import { CatalogOfferForm } from "../forms/CatalogOfferForm.tsx";
// Блок «Каталог / запрос КП» (маркер catalog-cta) — общая секция сайта.
// Разметка совпадает с прежней вёрсткой сайта до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
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
          <CatalogOfferForm />
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </section>
    </>
  );
}
