'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number };
    _tmr?: unknown[];
  }
}

const YM_COUNTERS = [25228307, 112991420]; // кабинеты «УралИндуктор3» и uibusiness
const TMR_COUNTER = '3784620'; // Top.Mail.Ru

function loadScript(src: string, id?: string) {
  if (id && document.getElementById(id)) return;
  for (const s of Array.from(document.scripts)) if (s.src === src) return;
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  if (id) el.id = id;
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(el, first);
}

let started = false;
function startAnalytics() {
  if (started) return;
  started = true;
  // Яндекс.Метрика
  const ym = (window.ym ??= Object.assign(
    function (...args: unknown[]) {
      (ym.a ??= []).push(args);
    },
    { l: Date.now() },
  ) as Window['ym'])!;
  loadScript('https://mc.yandex.ru/metrika/tag.js');
  for (const id of YM_COUNTERS) {
    ym(id, 'init', {
      webvisor: true,
      clickmap: true,
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }
  // Top.Mail.Ru (VK)
  (window._tmr ??= []).push({ id: TMR_COUNTER, type: 'pageView', start: Date.now() });
  loadScript('https://top-fwz1.mail.ru/js/code.js', 'tmr-code');
}

function hasConsent(): boolean {
  try {
    if (localStorage.getItem('ui_cookie_consent')) return true;
  } catch {
    /* приватный режим */
  }
  return /(?:^|; )ui_cookie_consent=/.test(document.cookie);
}

function inFrame(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/**
 * Счётчики аналитики (перенос Analytics.astro, T-PERF-12): старт откладывается
 * до простоя браузера или первого действия пользователя, и только после
 * согласия на cookie. Во фрейме инструментов Метрики (Вебвизор, карты) —
 * сразу, иначе Метрика пишет «код счётчика не установлен».
 */
export function Analytics() {
  useEffect(() => {
    if (inFrame()) {
      startAnalytics();
      return;
    }
    if (!hasConsent()) {
      window.addEventListener('cookie-consent-accepted', startAnalytics);
      return () => window.removeEventListener('cookie-consent-accepted', startAnalytics);
    }
    const events = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const;
    let idle: number | undefined;
    if ('requestIdleCallback' in window) idle = window.requestIdleCallback(startAnalytics, { timeout: 4000 });
    else idle = globalThis.setTimeout(startAnalytics, 2500) as unknown as number;
    for (const ev of events) window.addEventListener(ev, startAnalytics, { once: true, passive: true });
    return () => {
      if (idle !== undefined && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle);
      for (const ev of events) window.removeEventListener(ev, startAnalytics);
    };
  }, []);

  return null;
}

/** Пиксели для браузеров без JavaScript. */
export function AnalyticsNoscript() {
  return (
    <>
      <noscript>
        <div>
          <img src="https://mc.yandex.ru/watch/25228307" style={{ position: 'absolute', left: '-9999px' }} alt="" />
        </div>
      </noscript>
      <noscript>
        <div>
          <img src="https://mc.yandex.ru/watch/112991420" style={{ position: 'absolute', left: '-9999px' }} alt="" />
        </div>
      </noscript>
      <noscript>
        <div>
          <img src="https://top-fwz1.mail.ru/counter?id=3784620;js=na" style={{ position: 'absolute', left: '-9999px' }} alt="Top.Mail.Ru" />
        </div>
      </noscript>
    </>
  );
}
