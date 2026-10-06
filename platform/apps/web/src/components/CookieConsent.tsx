'use client';

import { useEffect, useState } from 'react';

/** Версия текста согласия — совпадает с полем consent форм и сервисом заявок. */
export const CONSENT_VERSION = 'v2026.1';
const KEY = 'ui_cookie_consent';

function storedConsent(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return v;
  } catch {
    /* приватный режим */
  }
  const m = document.cookie.match(/(?:^|; )ui_cookie_consent=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Плашка согласия на cookie и веб-аналитику (перенос CookieConsent.astro).
 * До «Принять» аналитика не запускается: кнопка пишет флаг в localStorage
 * и cookie и шлёт событие cookie-consent-accepted (его ждёт <Analytics />).
 * Во фрейме (инструменты Метрики) плашка не показывается.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.top !== window.self) return;
    } catch {
      /* кросс-доменный фрейм — тоже не показываем */
      return;
    }
    if (!storedConsent()) setVisible(true);
  }, []);

  function accept() {
    const val = `1|${CONSENT_VERSION}|${new Date().toISOString()}`;
    try {
      localStorage.setItem(KEY, val);
    } catch {
      /* без localStorage — останется cookie */
    }
    try {
      const d = new Date();
      d.setTime(d.getTime() + 365 * 864e5);
      document.cookie = `${KEY}=${encodeURIComponent(val)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    } catch {
      /* cookie отключены */
    }
    setVisible(false);
    try {
      window.dispatchEvent(new Event('cookie-consent-accepted'));
    } catch {
      /* старый браузер */
    }
  }

  return (
    <div className="cookie-consent" id="cookie-consent" data-consent-version={CONSENT_VERSION} hidden={!visible} aria-live="polite">
      <div className="cookie-consent__inner">
        <p className="cookie-consent__text">
          {'\nМы\u00A0используем файлы cookie и\u00A0сервис веб-аналитики Яндекс\u00A0Метрика для\u00A0сбора\n      технических данных, обеспечения корректной работы сайта и\u00A0анализа посещаемости.\n      Продолжая использовать сайт, вы\u00A0соглашаетесь на\u00A0обработку этих данных\n      в\u00A0соответствии с\u00A0'}
          <a href="/policy/" target="_blank" rel="noopener">
            Политикой обработки персональных данных
          </a>
          {'.\n'}
        </p>{' '}
        <div className="cookie-consent__actions">
          {' '}
          <a className="cookie-consent__more" href="/policy/" target="_blank" rel="noopener">
            Подробнее
          </a>{' '}
          <button type="button" className="cookie-consent__accept" id="cookie-accept" onClick={accept}>
            Принять
          </button>{' '}
        </div>{' '}
      </div>
    </div>
  );
}
