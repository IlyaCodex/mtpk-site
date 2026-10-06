// Подвал сайта (из Footer.astro).
// Разметка сгенерирована из итогового HTML Astro-сборки (tools/codegen, extract-layout)
// и совпадает с ней до пробела. Стили — legacy CSS (public/css/site.css и др.).
// Ссылки tel:/mailto: — содержимое сырым HTML: его подменяет коллтрекинг.
export function Footer() {
  return (
    <footer className="footer">
      {" "}
      <div className="container">
        {" "}
        <div className="footer__top">
          {" "}
          <div className="footer__brand-block">
            {" "}
            <a href="/" className="footer__brand">
              {" "}
              <img src="/brand/logo-footer-white.png" alt="УралИндуктор · ООО МТПК" width="252" height="72" loading="lazy" decoding="async" />
              {" "}
            </a>
            {" "}
            <p className="footer__brand-tagline">
              {"Производство и\u00A0поставка оборудования для\u00A0металлургии и\u00A0литейных производств с\u00A02013\u00A0года."}
            </p>
            {" "}
            <div className="footer__contact">
              {" "}
              <a href="tel:+78003513401" className="footer__phone" dangerouslySetInnerHTML={{ __html: "8&nbsp;800&nbsp;351-34-01" }} />
              {" "}
              <a href="tel:+73512116597" className="footer__phone" dangerouslySetInnerHTML={{ __html: "+7 (351) 211-65-97" }} />
              {" "}
              <a href="mailto:info@uralinduktor.ru" dangerouslySetInnerHTML={{ __html: " <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"1\"></rect><path d=\"m3 7 9 6 9-6\"></path></svg>\ninfo@uralinduktor.ru\n" }} />
              {" "}
            </div>
            {" "}
            <div className="footer__social">
              {" "}
              <a href="https://t.me/uralinduktor" aria-label="Telegram">
                {" "}
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
                {" "}
              </a>
              {" "}
              <a href="https://max.ru/join/_jtaGUl05P2n89T6htH_ANJV1CDSfJXki7ftWcOb-80" aria-label="MAX">
                {" "}
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {" "}
                  <defs>
                    {" "}
                    <linearGradient id="maxGrad-footer" x1="0" x2="1" y1="0" y2="1">
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
                  <rect width="24" height="24" rx="5.5" fill="url(#maxGrad-footer)" />
                  {" "}
                  <path fill="#fff" d="M12 5c-3.95 0-7.15 2.84-7.15 6.35 0 1.94.97 3.67 2.5 4.85l-.95 2.42c-.16.41.29.78.67.55l3.24-1.94c.54.11 1.1.16 1.69.16 3.95 0 7.15-2.84 7.15-6.35S15.95 5 12 5z" />
                  {" "}
                </svg>
                {" "}
              </a>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          <div className="footer__col">
            {" "}
            <div className="footer__col-title">
              Основное оборудование
            </div>
            {" "}
            <ul>
              {" "}
              <li>
                <a href="/products/induktsionnye-plavilnye-pechi/">
                  Индукционные плавильные печи
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/induktsionnye-nagrevateli/">
                  Индукционные нагреватели
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/drobemetnoe-oborudovanie/">
                  Дробемётное оборудование
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/sistemy-ohlazhdeniya/">
                  Системы охлаждения
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/oborudovanie-lvm/">
                  Оборудование ЛВМ
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/oborudovanie-lgm/">
                  Оборудование ЛГМ
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/linii-dlya-holodnotverdeyushhih-smesej-hts/">
                  Линии ХТС
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/oborudovanie-dlya-peschano-glinistyh-smesej-pgs/">
                  Оборудование ПГС
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/sterzhnevye-mashiny/">
                  {"Стержневые и\u00A0формовочные машины"}
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/termoobrabotka-plavka-alyuminiya/">
                  {"Термообработка и\u00A0плавка алюминия"}
                </a>
              </li>
              {" "}
            </ul>
            {" "}
          </div>
          {" "}
          <div className="footer__col">
            {" "}
            <div className="footer__col-title">
              Допоборудование
            </div>
            {" "}
            <ul>
              {" "}
              <li>
                <a href="/products/termicheskie-pechi/">
                  Термические печи
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/zapchasti/">
                  {"Запчасти на\u00A0оборудование"}
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/vakuumnoe-oborudovanie-dlya-termoobrabotki/">
                  Вакуумное оборудование
                </a>
              </li>
              {" "}
              <li>
                <a href="/products/stalerozlivochnye-kovshi/">
                  Сталеразливочные ковши
                </a>
              </li>
              {" "}
            </ul>
            {" "}
          </div>
          {" "}
          <div className="footer__col">
            {" "}
            <div className="footer__col-title">
              Услуги
            </div>
            {" "}
            <ul>
              {" "}
              <li>
                <a href="/uslugi/montazh-shefmontazh/">
                  {"Монтаж и\u00A0шефмонтаж"}
                </a>
              </li>
              {" "}
              <li>
                <a href="/uslugi/puskonaladka/">
                  Пусконаладка
                </a>
              </li>
              {" "}
              <li>
                <a href="/uslugi/obuchenie-personala/">
                  Обучение персонала
                </a>
              </li>
              {" "}
              <li>
                <a href="/uslugi/tehnicheskij-audit/">
                  Технический аудит
                </a>
              </li>
              {" "}
              <li>
                <a href="/proizvodstvo/">
                  {"Производство под\u00A0ключ"}
                </a>
              </li>
              {" "}
              <li>
                <a href="/uslugi/remont-plavilnyh-pechey/">
                  Ремонт плавильных печей
                </a>
              </li>
              {" "}
              <li>
                <a href="/uslugi/remont-drobemetov/">
                  Ремонт дробемётов
                </a>
              </li>
              {" "}
            </ul>
            {" "}
          </div>
          {" "}
          <div className="footer__col">
            {" "}
            <div className="footer__col-title">
              Компания
            </div>
            {" "}
            <ul>
              {" "}
              <li>
                <a href="/o-company/">
                  {"О\u00A0компании"}
                </a>
              </li>
              {" "}
              <li>
                <a href="/proekty/">
                  {"Проекты и\u00A0кейсы"}
                </a>
              </li>
              {" "}
              <li>
                <a href="/kontakty/">
                  Контакты
                </a>
              </li>
              {" "}
              <li>
                <a href="/otzyvy/">
                  Отзывы
                </a>
              </li>
              {" "}
              <li>
                <a href="/news/">
                  Новости
                </a>
              </li>
              {" "}
            </ul>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
        <div className="footer__bottom">
          {" "}
          <div className="footer__copyright">
            {" "}
            <div className="footer__copyright-name">
              © 2013–2026 ООО «Миасская Торгово-Промышленная Компания»
            </div>
            {" "}
            <div className="footer__copyright-legal">
              {"ОГРН\u00A01137415000315 · ИНН\u00A07415079152"}
            </div>
            {" "}
          </div>
          {" "}
          <div className="footer__bottom-links">
            {" "}
            <a href="/policy/">
              Политика конфиденциальности
            </a>
            {" "}
            <a href="/soglasie/">
              {"Согласие на\u00A0обработку персональных данных"}
            </a>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </div>
      {" "}
    </footer>
  );
}
