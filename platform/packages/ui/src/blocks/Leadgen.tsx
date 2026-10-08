import { RequestForm } from "../forms/RequestForm.tsx";
// Блок заявки «Подбор и расчёт» (маркер leadgen) — общая секция сайта.
// Разметка совпадает с прежней вёрсткой сайта до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
// Форма — компонент RequestForm из packages/ui/src/forms (отправка на /api/send.php, статусы, цели Метрики).
export function Leadgen() {
  return (
    <>
    <section className="leadgen" id="leadgen">
      {" "}
      <div className="container">
        {" "}
        <div className="leadgen__grid">
          {" "}
          <div className="leadgen__intro">
            {" "}
            <div className="leadgen__eyebrow">
              {"Подбор и\u00A0расчёт"}
            </div>
            {" "}
            <h2 className="leadgen__title">
              {"\nПолучите подбор оборудования или\u00A0"}
              <em>
                расчёт проекта
              </em>
              {" — заполните форму\n"}
            </h2>
            {" "}
            <p className="leadgen__lead">
              {"\nИнженер свяжется с\u00A0вами, уточнит задачу и\u00A0предложит решение под\u00A0ваше производство.\n"}
            </p>
            {" "}
            <ul className="leadgen__checklist">
              {" "}
              <li className="leadgen__checklist-item">
                {" "}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {" "}
                <span>
                  {"Подбор оборудования под\u00A0ваш металл, режим и\u00A0объёмы"}
                </span>
                {" "}
              </li>
              {" "}
              <li className="leadgen__checklist-item">
                {" "}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {" "}
                <span>
                  {"Расчёт стоимости, сроков и\u00A0схемы поставки"}
                </span>
                {" "}
              </li>
              {" "}
              <li className="leadgen__checklist-item">
                {" "}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {" "}
                <span>
                  {"Ответ в\u00A0течение 1\u00A0рабочего дня"}
                </span>
                {" "}
              </li>
              {" "}
            </ul>
            {" "}
          </div>
          {" "}
          <RequestForm
            formName="Подбор и расчёт"
            title={"Запрос подбора и\u00A0расчёта"}
            idPrefix="cat"
            taskPlaceholder="Например: индукционная плавильная печь для чугуна, 1 т, 750 кВт; нужны пусконаладка и обучение персонала"
            file
            submit={"Получить подбор или&nbsp;расчёт проекта"}
          />
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </section>
    </>
  );
}
