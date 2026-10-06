/** Версия текста согласия — совпадает с полем consent форм и сервисом заявок. */
export const CONSENT_VERSION = 'v2026.1';

/**
 * Плашка согласия на cookie и веб-аналитику. Скрыта по умолчанию: показывает
 * её клиентский модуль (consent.ts), если согласия ещё нет; до «Принять»
 * аналитика не запускается.
 */
export function CookieConsent() {
  return (
    <div className="cookie-consent" id="cookie-consent" data-consent-version={CONSENT_VERSION} hidden aria-live="polite">
      <div className="cookie-consent__inner">
        <p className="cookie-consent__text">
          {
            'Мы\u00A0используем файлы cookie и\u00A0сервис веб-аналитики Яндекс\u00A0Метрика для\u00A0сбора технических данных, обеспечения корректной работы сайта и\u00A0анализа посещаемости. Продолжая использовать сайт, вы\u00A0соглашаетесь на\u00A0обработку этих данных в\u00A0соответствии с\u00A0'
          }
          <a href="/policy/" target="_blank" rel="noopener">
            Политикой обработки персональных данных
          </a>
          .
        </p>
        <div className="cookie-consent__actions">
          <a className="cookie-consent__more" href="/policy/" target="_blank" rel="noopener">
            Подробнее
          </a>{' '}
          <button type="button" className="cookie-consent__accept" id="cookie-accept">
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
