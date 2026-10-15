import { THEME_KEY } from '../lib/theme';
import { delegate } from './dom';

type Theme = 'light' | 'dark';

const current = (): Theme => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

/** Кнопки-переключатели: нажата — тёмная тема; подсказка — что сделает щелчок. */
function paint(theme: Theme): void {
  for (const btn of document.querySelectorAll<HTMLElement>('[data-theme-toggle]')) {
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
    btn.title = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  }
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  // без плавных переходов цвета на время смены (theme-dark.css)
  root.classList.add('theme-switching');
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  paint(theme);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
}

/**
 * Переключатель светлой и тёмной темы в шапке. Выбор запоминается
 * (localStorage) и сразу применяется в других открытых вкладках сайта.
 */
export function initTheme(): void {
  // переключатель — в шапке сайта (и у статей Практикума); без него настраивать нечего
  if (!document.querySelector('[data-theme-toggle]')) return;
  paint(current());
  delegate('click', '[data-theme-toggle]', () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* приватный режим: тема — до перезагрузки страницы */
    }
  });
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY) apply(e.newValue === 'dark' ? 'dark' : 'light');
  });
}
