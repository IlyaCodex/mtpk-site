/**
 * Согласие на cookie и аналитика. До «Принять» счётчики не запускаются;
 * после — стартуют при простое браузера или первом действии пользователя
 * (T-PERF-12). Во фрейме инструментов Метрики (Вебвизор, карты) — сразу.
 */
const KEY = 'ui_cookie_consent';
const CONSENT_VERSION = 'v2026.1';
// кабинеты «УралИндуктор3», uibusiness и третий — как на боевом сайте (сверено 15.10.2026)
const YM_COUNTERS = [25228307, 112991420, 94628479];
const TMR_COUNTER = '3784620'; // Top.Mail.Ru

type W = Window & { ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }; _tmr?: unknown[] };

function hasConsent(): boolean {
  try {
    if (localStorage.getItem(KEY)) return true;
  } catch {
    /* приватный режим */
  }
  return new RegExp(`(?:^|; )${KEY}=`).test(document.cookie);
}

function inFrame(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

function loadScript(src: string, id?: string): void {
  if (id && document.getElementById(id)) return;
  if (Array.from(document.scripts).some((s) => s.src === src)) return;
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  if (id) el.id = id;
  document.head.appendChild(el);
}

let started = false;
function startAnalytics(): void {
  if (started) return;
  started = true;
  const w = window as W;
  const ym = (w.ym ??= Object.assign(
    function (...args: unknown[]) {
      (ym.a ??= []).push(args);
    },
    { l: Date.now() },
  ) as NonNullable<W['ym']>);
  loadScript('https://mc.yandex.ru/metrika/tag.js');
  for (const id of YM_COUNTERS) {
    ym(id, 'init', { webvisor: true, clickmap: true, referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
  }
  (w._tmr ??= []).push({ id: TMR_COUNTER, type: 'pageView', start: Date.now() });
  loadScript('https://top-fwz1.mail.ru/js/code.js', 'tmr-code');
}

function scheduleAnalytics(): void {
  const events = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const;
  const start = () => {
    for (const ev of events) window.removeEventListener(ev, start);
    startAnalytics();
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 4000 });
  else globalThis.setTimeout(start, 2500);
  for (const ev of events) window.addEventListener(ev, start, { once: true, passive: true });
}

function accept(banner: HTMLElement): void {
  const value = `1|${CONSENT_VERSION}|${new Date().toISOString()}`;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* без localStorage — останется cookie */
  }
  try {
    const d = new Date(Date.now() + 365 * 864e5);
    document.cookie = `${KEY}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  } catch {
    /* cookie отключены */
  }
  banner.hidden = true;
  window.dispatchEvent(new Event('cookie-consent-accepted'));
  startAnalytics();
}

export function initConsent(): void {
  if (inFrame()) return startAnalytics();
  const banner = document.getElementById('cookie-consent');
  if (hasConsent()) return scheduleAnalytics();
  if (!banner) return;
  banner.hidden = false;
  document.getElementById('cookie-accept')?.addEventListener('click', () => accept(banner), { once: true });
}
