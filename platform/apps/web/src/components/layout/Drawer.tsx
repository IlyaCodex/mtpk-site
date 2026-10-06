// Мобильное меню (из Drawer.astro); открытие/закрытие — public/js/mobile-nav.js.
// Разметка сгенерирована из итогового HTML Astro-сборки (tools/codegen, extract-layout)
// и совпадает с ней до пробела. Стили — legacy CSS (public/css/site.css и др.).
// Ссылки tel:/mailto: — содержимое сырым HTML: его подменяет коллтрекинг.
export function Drawer() {
  return (
    <aside className="nav-drawer" aria-hidden="true" data-nav-drawer="" suppressHydrationWarning>
      {" "}
      <div className="nav-drawer__header">
        {"  "}
        <a href="/" className="nav-drawer__brand" aria-label="УралИндуктор — на главную">
          {" "}
          <img src="/brand/logo-header-clean.png" alt="УралИндуктор" width="200" height="56" loading="lazy" decoding="async" />
          {" "}
        </a>
        {" "}
        <button className="nav-drawer__close" aria-label="Закрыть меню" data-nav-close="">
          ×
        </button>
        {" "}
      </div>
      {" "}
      <ul className="nav-drawer__list">
        {"  "}
        <li className="nav-drawer__item nav-drawer__item--acc">
          {" "}
          <button className="nav-drawer__acc" type="button" data-drawer-acc="" aria-expanded="false">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              Каталог
            </span>
            {" "}
            <span className="nav-drawer__acc-chev" aria-hidden="true" />
            {" "}
          </button>
          {" "}
          <div className="nav-drawer__panel">
            {" "}
            <div className="nav-drawer__group-label">
              {"Плавка и\u00A0обработка металлов"}
            </div>
            {" "}
            <a className="nav-drawer__sublink" href="/products/induktsionnye-plavilnye-pechi/">
              Индукционные плавильные печи
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/products/induktsionnye-nagrevateli/">
              Индукционные нагреватели
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/products/drobemetnoe-oborudovanie/">
              Дробемётные установки
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/products/sistemy-ohlazhdeniya/">
              Системы охлаждения
            </a>
            {" "}
            <div className="nav-drawer__group-label">
              Производственные линии
            </div>
            {" "}
            <a className="nav-drawer__sublink" href="/products/linii-dlya-holodnotverdeyushhih-smesej-hts/">
              ХТС — холодно-твердеющие смеси
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/products/oborudovanie-lvm/">
              {"ЛВМ — литьё по\u00A0выплавляемым моделям"}
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/products/oborudovanie-lgm/">
              {"ЛГМ — литьё по\u00A0газифицируемым моделям"}
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/products/oborudovanie-dlya-peschano-glinistyh-smesej-pgs/">
              ПГС — песчано-глинистые смеси
            </a>
            {" "}
            <a className="nav-drawer__sublink nav-drawer__sublink--all" href="/products/">
              {"Весь каталог\u00A0→"}
            </a>
            {" "}
          </div>
          {" "}
        </li>
        {"  "}
        <li className="nav-drawer__item nav-drawer__item--acc">
          {" "}
          <button className="nav-drawer__acc" type="button" data-drawer-acc="" aria-expanded="false">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              Услуги
            </span>
            {" "}
            <span className="nav-drawer__acc-chev" aria-hidden="true" />
            {" "}
          </button>
          {" "}
          <div className="nav-drawer__panel">
            {" "}
            <a className="nav-drawer__sublink" href="/uslugi/puskonaladka/">
              Пусконаладка
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/uslugi/montazh-shefmontazh/">
              {"Монтаж и\u00A0шефмонтаж"}
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/uslugi/obuchenie-personala/">
              Обучение персонала
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/uslugi/remont-plavilnyh-pechey/">
              Ремонт плавильных печей
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/uslugi/remont-drobemetov/">
              Ремонт дробемётов
            </a>
            {" "}
            <a className="nav-drawer__sublink" href="/uslugi/tehnicheskij-audit/">
              Технический аудит
            </a>
            {" "}
          </div>
          {" "}
        </li>
        {" "}
        <li className="nav-drawer__item">
          {" "}
          <a className="nav-drawer__link" href="/nalichie/">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
                <path d="M12 22V12" />
                <polyline points="3.29 7 12 12 20.71 7" />
                <path d="m7.5 4.27 9 5.15" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              Наличие
            </span>
            {" "}
          </a>
          {" "}
        </li>
        <li className="nav-drawer__item">
          {" "}
          <a className="nav-drawer__link" href="/proekty/">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              Проекты
            </span>
            {" "}
          </a>
          {" "}
        </li>
        <li className="nav-drawer__item">
          {" "}
          <a className="nav-drawer__link" href="/o-company/">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                <rect width="20" height="14" x="2" y="6" rx="2" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              {"О\u00A0компании"}
            </span>
            {" "}
          </a>
          {" "}
        </li>
        <li className="nav-drawer__item">
          {" "}
          <a className="nav-drawer__link" href="/kontakty/">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              Контакты
            </span>
            {" "}
          </a>
          {" "}
        </li>
        <li className="nav-drawer__item">
          {" "}
          <a className="nav-drawer__link" href="/otzyvy/">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 14a2 2 0 0 0 2-2V8h-2" />
                <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
                <path d="M8 14a2 2 0 0 0 2-2V8H8" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              Отзывы
            </span>
            {" "}
          </a>
          {" "}
        </li>
        <li className="nav-drawer__item">
          {" "}
          <a className="nav-drawer__link" href="/praktikum/">
            {" "}
            <span className="nav-drawer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                <path d="M22 10v6" />
                <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
              </svg>
            </span>
            {" "}
            <span className="nav-drawer__text">
              Практикум
            </span>
            {" "}
          </a>
          {" "}
        </li>
        {" "}
      </ul>
      {" "}
      <div className="nav-drawer__contacts">
        {" "}
        <div className="nav-drawer__contacts-label">
          Связаться
        </div>
        {" "}
        <a href="tel:+78003513401" dangerouslySetInnerHTML={{ __html: " <span class=\"nav-drawer__contact-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\"></path></svg></span>8&nbsp;800&nbsp;351-34-01\n" }} />
        {" "}
        <a href="tel:+73512116597" dangerouslySetInnerHTML={{ __html: " <span class=\"nav-drawer__contact-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\"></path></svg></span>+7 (351) 211-65-97\n" }} />
        {" "}
        <a href="mailto:info@uralinduktor.ru" dangerouslySetInnerHTML={{ __html: " <span class=\"nav-drawer__contact-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\"></path><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"></rect></svg></span>info@uralinduktor.ru\n" }} />
        {" "}
      </div>
      {" "}
    </aside>
  );
}
