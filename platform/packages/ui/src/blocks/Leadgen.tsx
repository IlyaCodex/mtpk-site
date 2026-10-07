import { FileField, FormStatus, LeadForm, PhoneInput, SubmitButton } from "../forms/LeadForm.tsx";
// Блок заявки «Подбор и расчёт» (маркер leadgen) — общая секция сайта.
// Разметка совпадает с прежней вёрсткой сайта до пробела: пробелы между тегами влияют на отрисовку inline-элементов.
// Форма — React-компонент LeadForm (отправка в сервис заявок, статусы, цели Метрики).
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
          <LeadForm className="form" formName="Подбор и расчёт">
            {" "}
            <h3 className="form__title">
              {"Запрос подбора и\u00A0расчёта"}
            </h3>
            {" "}
            <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {" "}
            <input type="hidden" name="form_ts" className="js-form-ts" />
            {" "}
            <input type="hidden" name="source" className="js-form-source" />
            {" "}
            <div className="form__field">
              {" "}
              <label className="form__label" htmlFor="cat-name">
                {"Имя "}
                <span aria-hidden="true">
                  *
                </span>
              </label>
              {" "}
              <input className="form__input" type="text" name="name" id="cat-name" placeholder="Иван Петров" autoComplete="name" required />
              {" "}
            </div>
            {" "}
            <div className="form__row">
              {" "}
              <div className="form__field">
                {" "}
                <label className="form__label" htmlFor="cat-email">
                  Эл. почта
                </label>
                {" "}
                <input className="form__input" type="email" name="email" id="cat-email" placeholder="ivan@company.ru" autoComplete="email" />
                {" "}
              </div>
              {" "}
              <div className="form__field">
                {" "}
                <label className="form__label" htmlFor="cat-phone">
                  {"Телефон "}
                  <span aria-hidden="true">
                    *
                  </span>
                </label>
                {" "}
                <PhoneInput className="form__input" name="phone" id="cat-phone" placeholder="+7 (___) ___-__-__" autoComplete="tel" required />
                {" "}
              </div>
              {" "}
            </div>
            {" "}
            <div className="form__field">
              {" "}
              <label className="form__label" htmlFor="cat-task">
                Описание задачи
              </label>
              {" "}
              <textarea className="form__textarea" name="task" id="cat-task" rows={3} placeholder="Например: индукционная плавильная печь для чугуна, 1 т, 750 кВт; нужны пусконаладка и обучение персонала" />
              {" "}
            </div>
            {" "}
            <div className="form__field">
              {" "}
              <span className="form__label">
                Техническое задание или паспорт
              </span>
              {" "}
              <FileField
                labelClassName="form__file"
                icon={
                  <>
                    {" "}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </>
                }
                label={"\nПрикрепить файл\n"}
                input={{ name: "file", id: "cat-file", accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png", className: "audit-file-input" }}
              />
              {" "}
              <span className="form__hint">
                {"PDF, DOC, XLS, JPG или PNG, до\u00A010\u00A0МБ"}
              </span>
              {" "}
            </div>
            {" "}
            <label className="form__check">
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
            <SubmitButton className="form__submit" html={'Получить подбор или&nbsp;расчёт проекта <span class="btn__arrow">→</span>'} />
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
