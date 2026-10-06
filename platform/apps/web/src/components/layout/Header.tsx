// Шапка сайта: контакты, логотип, мегаменю, поиск, экспресс-звонок (из Header.astro).
// Разметка сгенерирована из итогового HTML Astro-сборки (tools/codegen, extract-layout)
// и совпадает с ней до пробела. Стили — legacy CSS (public/css/site.css и др.).
// Ссылки tel:/mailto: — содержимое сырым HTML: его подменяет коллтрекинг.
export function Header({ activeNav }: { activeNav?: string }) {
  const cls = (name: string) => 'nav__link' + (activeNav === name ? ' is-active' : '');
  return (
    <div className="header-shell" suppressHydrationWarning>
      {"  "}
      <div className="header-top">
        {" "}
        <div className="container header-top__inner">
          {" "}
          <span className="contact-hours" aria-label="Режим работы">
            {" "}
            <svg className="contact-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {" "}
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
              {" "}
            </svg>
            {"\nРежим работы 9:00–18:00 по\u00A0времени ЕКБ\n"}
          </span>
          {" "}
          <span className="contact-sep" />
          {" "}
          <a href="tel:+78003513401" className="contact-link contact-link--phone" aria-label="Позвонить бесплатно по России" dangerouslySetInnerHTML={{ __html: " <svg class=\"contact-link__icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path> </svg>\n8&nbsp;800&nbsp;351-34-01\n" }} />
          {" "}
          <span className="contact-sep" />
          {" "}
          <a href="tel:+73512116597" className="contact-link contact-link--phone contact-link--phone-local" aria-label="Позвонить" dangerouslySetInnerHTML={{ __html: " <svg class=\"contact-link__icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path> </svg>\n+7 (351) 211-65-97\n" }} />
          {" "}
          <span className="contact-sep" />
          {" "}
          <a href="mailto:info@uralinduktor.ru" className="contact-link" aria-label="Написать на email" dangerouslySetInnerHTML={{ __html: " <svg class=\"contact-link__icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"1\"></rect> <path d=\"m3 7 9 6 9-6\"></path> </svg>\ninfo@uralinduktor.ru\n" }} />
          {" "}
          <span className="contact-sep" />
          {" "}
          <div className="messengers" aria-label="Связь в мессенджерах">
            {" "}
            <a href="https://t.me/uralinduktor" className="msg-icon" aria-label="Написать в Telegram" title="Telegram">
              {" "}
              <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
                {" "}
                <defs>
                  {" "}
                  <linearGradient id="tgGrad" x1=".667" x2=".417" y1=".167" y2=".75">
                    {" "}
                    <stop offset="0" stopColor="#37AEE2" />
                    {" "}
                    <stop offset="1" stopColor="#1E96C8" />
                    {" "}
                  </linearGradient>
                  {" "}
                </defs>
                {" "}
                <circle cx="120" cy="120" r="120" fill="url(#tgGrad)" />
                {" "}
                <path fill="#fff" d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687c1.906 0 30.255-29.492 30.255-29.492l31.525-60.89-79.448 37.225z" />
                {" "}
                <path fill="#C8DAEA" d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0c8.898-8.9 17.415-15.764 17.415-15.764" />
                {" "}
                <path fill="#fff" d="M81.486 130.179L52.2 120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229 2.1-2.2 6.489-4.523 120.106-45.36 120.106-45.36s3.208-1.081 5.1-.362a2.766 2.766 0 0 1 1.885 2.055 9.357 9.357 0 0 1 .254 2.585c-.009.752-.1 1.449-.169 2.542-.692 11.165-21.4 94.493-21.4 94.493s-1.239 4.876-5.678 5.043a8.13 8.13 0 0 1-5.925-2.292c-8.711-7.493-38.819-27.727-45.472-32.177a1.27 1.27 0 0 1-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6 53.821-51.492c.108-.379-.3-.566-.848-.4-3.482 1.281-63.844 39.4-70.506 43.607a3.21 3.21 0 0 1-1.48.09z" />
                {" "}
              </svg>
              {" "}
            </a>
            {" "}
            <a href="https://max.ru/join/_jtaGUl05P2n89T6htH_ANJV1CDSfJXki7ftWcOb-80" className="msg-icon" aria-label="Написать в MAX" title="MAX">
              {" "}
              <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
                {" "}
                <defs>
                  {" "}
                  <linearGradient id="maxGrad-header" x1="0" x2="1" y1="0" y2="1">
                    {" "}
                    <stop offset="0" stopColor="#3370FF" />
                    {" "}
                    <stop offset="0.5" stopColor="#6B57F4" />
                    {" "}
                    <stop offset="1" stopColor="#9333EA" />
                    {" "}
                  </linearGradient>
                  {" "}
                </defs>
                {" "}
                <rect width="240" height="240" rx="56" fill="url(#maxGrad-header)" />
                {" "}
                <path fill="#fff" d="M120 50c-39.5 0-71.5 28.4-71.5 63.5 0 19.4 9.7 36.7 25 48.5l-9.5 24.2c-1.6 4.1 2.9 7.8 6.7 5.5l32.4-19.4c5.4 1.1 11 1.6 16.9 1.6 39.5 0 71.5-28.4 71.5-63.5S159.5 50 120 50z" />
                {" "}
              </svg>
              {" "}
            </a>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {"  "}
      <header className="header">
        {" "}
        <div className="container header__inner">
          {" "}
          <a href="/" className="header__brand" aria-label="УралИндуктор · МТПК — на главную">
            {" "}
            <img src="/brand/logo-header-clean.png" alt="УралИндуктор · производство и поставка оборудования для металлургии" width="200" height="56" fetchPriority="high" decoding="async" />
            {" "}
          </a>
          {" "}
          <nav className="nav" aria-label="Главная навигация">
            {" "}
            <div className="nav__item">
              {" "}
              <a href="/products/" className={cls('catalog')}>
                {"Каталог "}
                <span className="nav__chevron" />
              </a>
              {" "}
              <div className="megamenu">
                {" "}
                <div className="megamenu__inner">
                  {" "}
                  <div className="megamenu__col">
                    {" "}
                    <div className="megamenu__col-title">
                      {"Плавка и\u00A0обработка металлов"}
                    </div>
                    {" "}
                    <ul className="megamenu__list">
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/induktsionnye-plavilnye-pechi/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="4" width="16" height="16" />
                              <path d="M12 9c-1.5 1.5-1.5 4.5 0 6 1.5-1.5 1.5-4.5 0-6z" />
                              <path d="M8 19h8" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Индукционные плавильные печи
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Тиристорные · от\u00A0100\u00A0кг до\u00A015\u00A0т"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/induktsionnye-nagrevateli/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 7c2.5-2.5 6 2.5 9 0s6-2.5 9 0" />
                              <path d="M3 12c2.5-2.5 6 2.5 9 0s6-2.5 9 0" />
                              <path d="M3 17c2.5-2.5 6 2.5 9 0s6-2.5 9 0" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Индукционные нагреватели
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Средне- и\u00A0высокочастотные · 1–1100\u00A0кГц"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/drobemetnoe-oborudovanie/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="4" />
                              <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                              <circle cx="5" cy="6" r="0.8" fill="currentColor" />
                              <circle cx="19" cy="7" r="0.8" fill="currentColor" />
                              <circle cx="6" cy="18" r="0.8" fill="currentColor" />
                              <circle cx="19" cy="18" r="0.8" fill="currentColor" />
                              <path d="M8.5 8.5L6 6M15.5 8.5L18 6M8.5 15.5L6 18M15.5 15.5L18 18" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Дробемётные установки
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Кранового и\u00A0барабанного типа"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/peskostruynoe-oborudovanie/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 8h7l4-3v14l-4-3H3z" />
                              <path d="M17 8l4-1M17 12h4M17 16l4 1" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Пескоструйные установки
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              Проходные, напорные, ручные кабины
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/sistemy-ohlazhdeniya/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3c2 3 5 6 5 9a5 5 0 0 1-10 0c0-3 3-6 5-9z" />
                              <path d="M10 14a2 2 0 0 0 4 0" opacity="0.6" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Системы охлаждения
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Градирни и\u00A0чиллеры · до\u00A0900\u00A0000\u00A0кКал/ч"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/termoobrabotka-plavka-alyuminiya/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />
                              <path d="M9 15a3 3 0 0 0 6 0" opacity="0.6" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              {"Термообработка и\u00A0плавка алюминия"}
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              Тигельные, бассейновые, башенные печи
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                    </ul>
                    {" "}
                  </div>
                  {" "}
                  <div className="megamenu__col">
                    {" "}
                    <div className="megamenu__col-title">
                      Производственные линии
                    </div>
                    {" "}
                    <ul className="megamenu__list">
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/oborudovanie-dlya-peschano-glinistyh-smesej-pgs/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 18h18" />
                              <path d="M5 18c0-3 2-5 5-5s5 2 5 5" />
                              <path d="M10 18c0-2 2-4 5-4s4 2 4 4" />
                              <circle cx="7" cy="20" r="0.5" fill="currentColor" />
                              <circle cx="11" cy="20" r="0.5" fill="currentColor" />
                              <circle cx="15" cy="20" r="0.5" fill="currentColor" />
                              <circle cx="19" cy="20" r="0.5" fill="currentColor" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              ПГС
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              Песчано-глинистые смеси
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/linii-dlya-holodnotverdeyushhih-smesej-hts/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="14" width="18" height="7" />
                              <rect x="6" y="8" width="12" height="6" />
                              <rect x="9" y="3" width="6" height="5" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              ХТС
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              Холодно-твердеющие смеси
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/oborudovanie-lgm/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 19a4 4 0 0 1-1-7.9 5.5 5.5 0 0 1 10.7-1.5A4.5 4.5 0 0 1 18 19z" />
                              <circle cx="10" cy="14" r="0.5" fill="currentColor" />
                              <circle cx="14" cy="14" r="0.5" fill="currentColor" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              ЛГМ
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Литьё по\u00A0газифицируемым моделям"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/oborudovanie-lvm/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12z" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              ЛВМ
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Литьё по\u00A0выплавляемым моделям"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/sterzhnevye-mashiny/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="13" width="18" height="8" />
                              <rect x="7" y="8" width="10" height="5" />
                              <path d="M10 8V5h4v3" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              {"Стержневые и\u00A0формовочные машины"}
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              Горячий/холодный ящик, формовка
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                    </ul>
                    {" "}
                  </div>
                  {" "}
                  <div className="megamenu__col">
                    {" "}
                    <div className="megamenu__col-title">
                      Доп оборудование
                    </div>
                    {" "}
                    <ul className="megamenu__list">
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/termicheskie-pechi/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="5" width="18" height="14" />
                              <rect x="6" y="8" width="12" height="8" />
                              <path d="M12 10c-1.5 1-1.5 3 0 4 1.5-1 1.5-3 0-4z" fill="currentColor" fillOpacity=".25" />
                              <circle cx="18.5" cy="6.5" r="0.5" fill="currentColor" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Термические печи
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Камерные, шахтные, вакуумные · до\u00A01800\u00A0°C"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/zapchasti/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="8.5" cy="8.5" r="3" />
                              <circle cx="16" cy="16" r="3" />
                              <path d="M8.5 4v2M8.5 11v2M4 8.5h2M11 8.5h2 M16 12v2M16 20v0M12 16h2M20 16h0" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              {"Запчасти на\u00A0оборудование"}
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Для\u00A0индукционного и\u00A0дробемётного оборудования"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/vakuumnoe-oborudovanie-dlya-termoobrabotki/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 21V11a7 7 0 0 1 14 0v10z" />
                              <path d="M3 21h18" />
                              <circle cx="12" cy="12" r="2" />
                              <path d="M12 4V2M12 14v4" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Вакуумное оборудование
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Для\u00A0термообработки в\u00A0вакууме"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/stalerozlivochnye-kovshi/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 7h12l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7z" />
                              <path d="M5 7l-2-2M17 7l3-1l-1 4l-2-1" />
                              <path d="M8 11h6" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Сталеразливочные ковши
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Для\u00A0стали и\u00A0чугуна, стопорные, чайниковые"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/products/stendy-sushki-i-nagreva-kovshej/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 20h12" />
                              <path d="M8 20V9h8v11" />
                              <path d="M9 9V6h6v3" />
                              <path d="M12 3v3" />
                              <path d="M10 13h4" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              {"Стенды сушки и\u00A0нагрева ковшей"}
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Газовые и\u00A0электрические · 11\u00A0исполнений"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                    </ul>
                    {" "}
                  </div>
                  {" "}
                </div>
                {" "}
              </div>
              {" "}
            </div>
            {" "}
            <div className="nav__item">
              {" "}
              <a href="/uslugi/" className={cls('uslugi')}>
                {"Услуги "}
                <span className="nav__chevron" />
              </a>
              {" "}
              <div className="megamenu">
                {" "}
                <div className="megamenu__inner">
                  {" "}
                  <div className="megamenu__feature">
                    {" "}
                    <div>
                      {" "}
                      <div className="megamenu__feature-eyebrow">
                        Под ключ
                      </div>
                      {" "}
                      <div className="megamenu__feature-title">
                        {"Проектирование литейного производства с\u00A0нуля под\u00A0ключ"}
                      </div>
                      {" "}
                      <p className="megamenu__feature-text">
                        {"От\u00A0аудита площадки и\u00A0инженерного проекта до\u00A0запуска участка, обучения операторов и\u00A0сервиса."}
                      </p>
                      {" "}
                    </div>
                    {" "}
                    <a href="/proizvodstvo/" className="megamenu__feature-link">
                      Обсудить проект
                    </a>
                    {" "}
                  </div>
                  {" "}
                  <div className="megamenu__col">
                    {" "}
                    <div className="megamenu__col-title">
                      Полный цикл запуска
                    </div>
                    {" "}
                    <ul className="megamenu__list">
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/uslugi/puskonaladka/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13 3L4 14h7l-1 7 9-11h-7z" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Пусконаладка
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Запуск оборудования на\u00A0площадке заказчика"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/uslugi/montazh-shefmontazh/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.7 6.3a4 4 0 0 1-4 6.4l-6.7 6.7a2 2 0 0 1-2.7-2.7l6.7-6.7a4 4 0 0 1 6.7-3.7z" />
                              <circle cx="5.5" cy="18.5" r="0.5" fill="currentColor" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              {"Монтаж и\u00A0шефмонтаж"}
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Сборка узлов, установка и\u00A0обвязка"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/uslugi/obuchenie-personala/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 9l10-5 10 5-10 5z" />
                              <path d="M6 11v5c2 1.3 4 2 6 2s4-0.7 6-2v-5" />
                              <path d="M22 9v6" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Обучение персонала
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Подготовка операторов и\u00A0инженеров"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                    </ul>
                    {" "}
                  </div>
                  {" "}
                  <div className="megamenu__col">
                    {" "}
                    <div className="megamenu__col-title">
                      {"Аудит, ремонт и\u00A0модернизация"}
                    </div>
                    {" "}
                    <ul className="megamenu__list">
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/uslugi/remont-plavilnyh-pechey/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="4" width="16" height="16" />
                              <path d="M12 9c-1.5 1.5-1.5 4.5 0 6 1.5-1.5 1.5-4.5 0-6z" />
                              <path d="M8 19h8" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Плавильных печей
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              Диагностика, замена узлов, модернизация
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/uslugi/remont-dugovyh-pechey/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="4" width="16" height="16" />
                              <path d="M13 8l-4 5h3l-1 4 4-5h-3l1-4z" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Дуговых печей
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Реновация ДСП, модернизация АСУ\u00A0ТП"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/uslugi/remont-drobemetov/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="4" />
                              <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                              <circle cx="5" cy="6" r="0.8" fill="currentColor" />
                              <circle cx="19" cy="7" r="0.8" fill="currentColor" />
                              <circle cx="6" cy="18" r="0.8" fill="currentColor" />
                              <circle cx="19" cy="18" r="0.8" fill="currentColor" />
                              <path d="M8.5 8.5L6 6M15.5 8.5L18 6M8.5 15.5L6 18M15.5 15.5L18 18" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Дробемётных установок
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Восстановление и\u00A0переоснащение"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                      <li>
                        <a className="megamenu__link" href="/uslugi/tehnicheskij-audit/">
                          {" "}
                          <span className="megamenu__link-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 3h18v6H3z" />
                              <path d="M3 13h18v8H3z" />
                              <path d="M7 6h.01M11 6h.01M7 17h6M7 19h4" />
                            </svg>
                          </span>
                          {" "}
                          <span className="megamenu__link-body">
                            {" "}
                            <span className="megamenu__link-title">
                              Технический аудит
                            </span>
                            {" "}
                            <span className="megamenu__link-desc">
                              {"Оценка состояния и\u00A0слабых мест оборудования"}
                            </span>
                            {" "}
                          </span>
                          {" "}
                        </a>
                      </li>
                      {" "}
                    </ul>
                    {" "}
                  </div>
                  {" "}
                </div>
                {" "}
              </div>
              {" "}
            </div>
            {" "}
            <div className="nav__item">
              <a href="/nalichie/" className={cls('nalichie')}>
                Наличие
              </a>
            </div>
            {" "}
            <div className="nav__item">
              <a href="/proekty/" className={cls('proekty')}>
                Проекты
              </a>
            </div>
            {" "}
            <div className="nav__item">
              <a href="/o-company/" className={cls('o-kompanii')}>
                О компании
              </a>
            </div>
            {" "}
            <div className="nav__item">
              <a href="/kontakty/" className={cls('kontakty')}>
                Контакты
              </a>
            </div>
            {" "}
            <div className="nav__item">
              <a href="/otzyvy/" className={cls('otzyvy')}>
                Отзывы
              </a>
            </div>
            {"  "}
            <div className="nav__item">
              <a href="/praktikum/" className={cls('praktikum')}>
                Практикум
              </a>
            </div>
            {" "}
          </nav>
          {" "}
          <div className="header__actions">
            {" "}
            <button className="nav-toggle" aria-label="Открыть меню" aria-expanded="false" data-nav-toggle="" suppressHydrationWarning>
              {" "}
              <span className="nav-toggle__bar" />
              {" "}
              <span className="nav-toggle__bar" />
              {" "}
              <span className="nav-toggle__bar" />
              {" "}
            </button>
            {" "}
            <button className="icon-btn" aria-label="Поиск" data-search-open="">
              {" "}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              {" "}
            </button>
            {"  "}
            <form className="header-quick-form js-lead-form" data-form="Шапка: быстрый звонок">
              {" "}
              <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {" "}
              <input type="hidden" name="form_ts" className="js-form-ts" />
              {" "}
              <input type="hidden" name="source" className="js-form-source" />
              {" "}
              <input type="tel" name="phone" className="header-quick-form__input" placeholder="+7 (___) ___-__-__" required autoComplete="tel" aria-label="Контактный телефон для обратного звонка" suppressHydrationWarning />
              {"  "}
              <label className="header-quick-form__consent">
                {" "}
                <input type="checkbox" name="consent" defaultValue="v2026.1" required />
                {" "}
                <span>
                  {"Даю "}
                  <a href="/soglasie/" target="_blank" rel="noopener">
                    согласие
                  </a>
                  {" на обработку данных по "}
                  <a href="/policy/" target="_blank" rel="noopener">
                    политике
                  </a>
                </span>
                {" "}
              </label>
              {" "}
              <button type="submit" className="header-quick-form__btn">
                Перезвонить
              </button>
              {" "}
              <span className="header-quick-form__hint">
                {"Перезвоним в\u00A0течение 10\u00A0минут"}
              </span>
              {" "}
              <span className="js-form-status" style={{ display: "none" }} role="status" aria-live="polite" suppressHydrationWarning />
              {" "}
            </form>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </header>
      {" "}
    </div>
  );
}
