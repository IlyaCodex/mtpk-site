/**
 * Иконки каркаса сайта. Контурные 24×24 красятся через color вместе с текстом.
 * Строковые варианты (…_SVG) — для ссылок tel:/mailto:, чьё содержимое
 * выводится сырым HTML (см. ContactLink).
 */

const PHONE_PATH =
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z';
const STROKE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const PHONE_SVG = `<svg class="contact-link__icon" viewBox="0 0 24 24" ${STROKE}><path d="${PHONE_PATH}"></path></svg>`;
export const MAIL_SVG = `<svg class="contact-link__icon" viewBox="0 0 24 24" ${STROKE}><rect x="3" y="5" width="18" height="14" rx="1"></rect><path d="m3 7 9 6 9-6"></path></svg>`;
export const FOOTER_MAIL_SVG = `<svg viewBox="0 0 24 24" ${STROKE}><rect x="3" y="5" width="18" height="14" rx="1"></rect><path d="m3 7 9 6 9-6"></path></svg>`;

/** Иконка из набора меню: содержимое <svg> хранится в настройках сайта. */
export function MenuIcon({ paths, strokeWidth = 2 }: { paths: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

export function ClockIcon() {
  return (
    <svg className="contact-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/** Переключатель темы: луна — включить тёмную, солнце — светлую (видна одна, см. theme-dark.css). */
export function ThemeIcons() {
  return (
    <>
      <svg className="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z" />
      </svg>
      <svg className="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    </>
  );
}

/** Логотип Telegram (круглый, в шапке). */
export function TelegramLogo() {
  return (
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tgGrad" x1=".667" x2=".417" y1=".167" y2=".75">
          <stop offset="0" stopColor="#37AEE2" />
          <stop offset="1" stopColor="#1E96C8" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="120" fill="url(#tgGrad)" />
      <path fill="#fff" d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687c1.906 0 30.255-29.492 30.255-29.492l31.525-60.89-79.448 37.225z" />
      <path fill="#C8DAEA" d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0c8.898-8.9 17.415-15.764 17.415-15.764" />
      <path
        fill="#fff"
        d="M81.486 130.179L52.2 120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229 2.1-2.2 6.489-4.523 120.106-45.36 120.106-45.36s3.208-1.081 5.1-.362a2.766 2.766 0 0 1 1.885 2.055 9.357 9.357 0 0 1 .254 2.585c-.009.752-.1 1.449-.169 2.542-.692 11.165-21.4 94.493-21.4 94.493s-1.239 4.876-5.678 5.043a8.13 8.13 0 0 1-5.925-2.292c-8.711-7.493-38.819-27.727-45.472-32.177a1.27 1.27 0 0 1-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6 53.821-51.492c.108-.379-.3-.566-.848-.4-3.482 1.281-63.844 39.4-70.506 43.607a3.21 3.21 0 0 1-1.48.09z"
      />
    </svg>
  );
}

/** Значок Telegram (одноцветный, в подвале). */
export function TelegramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

/**
 * Логотип MAX. id градиента у каждого экземпляра свой (в шапке и подвале
 * логотипы на одной странице), масштаб: шапка — 240, подвал — 24.
 */
export function MaxLogo({ id, size }: { id: string; size: 240 | 24 }) {
  const big = size === 240;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3370FF" />
          <stop offset="0.5" stopColor="#6B57F4" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <rect width={size} height={size} rx={big ? 56 : 5.5} fill={`url(#${id})`} />
      <path
        fill="#fff"
        d={
          big
            ? 'M120 50c-39.5 0-71.5 28.4-71.5 63.5 0 19.4 9.7 36.7 25 48.5l-9.5 24.2c-1.6 4.1 2.9 7.8 6.7 5.5l32.4-19.4c5.4 1.1 11 1.6 16.9 1.6 39.5 0 71.5-28.4 71.5-63.5S159.5 50 120 50z'
            : 'M12 5c-3.95 0-7.15 2.84-7.15 6.35 0 1.94.97 3.67 2.5 4.85l-.95 2.42c-.16.41.29.78.67.55l3.24-1.94c.54.11 1.1.16 1.69.16 3.95 0 7.15-2.84 7.15-6.35S15.95 5 12 5z'
        }
      />
    </svg>
  );
}
