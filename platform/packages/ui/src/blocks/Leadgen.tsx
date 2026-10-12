import type { LeadgenBlock } from "@mtpk/content-model";
import { Fragment } from "react";
import { RequestForm } from "../forms/RequestForm.tsx";
import { extra, Inline } from "../primitives/Html.tsx";
// Блок заявки «Подбор и расчёт» (маркер leadgen) — общая секция сайта: вёрстка одна,
// тексты и форма — поля блока (пустые — как на главной).
// Разметка совпадает с прежней вёрсткой сайта до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
// Форма — компонент RequestForm из packages/ui/src/forms (отправка на /api/send.php, статусы, цели Метрики).

/** Тексты по умолчанию — как на главной. */
const DEFAULTS: Required<Pick<LeadgenBlock, "eyebrow" | "title" | "lead" | "items" | "form">> = {
  eyebrow: "Подбор и&nbsp;расчёт",
  title: "Получите подбор оборудования или&nbsp;<em>расчёт проекта</em> — заполните форму",
  lead: "Инженер свяжется с&nbsp;вами, уточнит задачу и&nbsp;предложит решение под&nbsp;ваше производство.",
  items: [
    "Подбор оборудования под&nbsp;ваш металл, режим и&nbsp;объёмы",
    "Расчёт стоимости, сроков и&nbsp;схемы поставки",
    "Ответ в&nbsp;течение 1&nbsp;рабочего дня",
  ],
  form: {
    name: "Подбор и расчёт",
    title: "Запрос подбора и расчёта",
    taskPlaceholder: "Например: индукционная плавильная печь для чугуна, 1 т, 750 кВт; нужны пусконаладка и обучение персонала",
    submit: "Получить подбор или&nbsp;расчёт проекта",
  },
};

export function Leadgen({ block = { type: "leadgen" } }: { block?: LeadgenBlock }) {
  const items = block.items ?? DEFAULTS.items;
  const form = block.form ?? DEFAULTS.form;
  // id полей формы — от якоря секции: у второй формы на странице они свои
  const anchor = block.attrs?.id ?? "leadgen";
  return (
    <>
    <section className="leadgen" id="leadgen" {...extra(block.attrs, "section")}>
      {" "}
      <div className="container">
        {" "}
        <div className="leadgen__grid">
          {" "}
          <div className="leadgen__intro">
            {" "}
            <Inline as="div" className="leadgen__eyebrow" html={block.eyebrow ?? DEFAULTS.eyebrow} />
            {" "}
            <Inline as="h2" className="leadgen__title" html={block.title ?? DEFAULTS.title} />
            {" "}
            <Inline as="p" className="leadgen__lead" html={block.lead ?? DEFAULTS.lead} />
            {" "}
            {items.length ? (
              <ul className="leadgen__checklist">
                {items.map((item, i) => (
                  <Fragment key={i}>
                    {" "}
                    <li className="leadgen__checklist-item">
                      {" "}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {" "}
                      <Inline html={item} />
                      {" "}
                    </li>
                  </Fragment>
                ))}
                {" "}
              </ul>
            ) : null}
            {" "}
          </div>
          {" "}
          <RequestForm
            formName={form.name}
            title={form.title}
            idPrefix={anchor === "leadgen" ? "cat" : anchor}
            taskLabel={form.taskLabel}
            taskPlaceholder={form.taskPlaceholder}
            file
            submit={form.submit}
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
