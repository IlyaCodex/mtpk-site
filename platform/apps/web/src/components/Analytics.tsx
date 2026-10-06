/**
 * Пиксели счётчиков для браузеров без JavaScript. Сами счётчики (Метрика,
 * Top.Mail.Ru) запускает клиентский модуль consent.ts — после согласия на cookie.
 */
export function AnalyticsNoscript() {
  return (
    <>
      <noscript>
        <div>
          <img src="https://mc.yandex.ru/watch/25228307" className="ui-pixel" alt="" />
        </div>
      </noscript>
      <noscript>
        <div>
          <img src="https://mc.yandex.ru/watch/112991420" className="ui-pixel" alt="" />
        </div>
      </noscript>
      <noscript>
        <div>
          <img src="https://top-fwz1.mail.ru/counter?id=3784620;js=na" className="ui-pixel" alt="Top.Mail.Ru" />
        </div>
      </noscript>
    </>
  );
}
