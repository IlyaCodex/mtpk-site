import { reducedMotion } from './dom';

/** Нижние панели, над которыми встаёт кнопка: сравнение и согласие на cookie. */
const BARS = '#cmp-bar, #cookie-consent:not([hidden])';

const ARROW =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>';

/**
 * Кнопка «Наверх»: круглая, справа внизу. Появляется, когда страницу
 * прокрутили дальше полутора экранов, и плавно возвращает к началу. Если
 * внизу панель (сравнение, согласие на cookie) — встаёт над ней.
 */
export function initToTop(): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-top';
  btn.title = 'Наверх';
  btn.setAttribute('aria-label', 'Наверх');
  btn.innerHTML = ARROW;
  document.body.append(btn);

  let queued = false;
  const update = () => {
    queued = false;
    btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.5);
    // высота панелей у нижнего края справа — кнопка над ними
    let lift = 0;
    for (const bar of document.querySelectorAll<HTMLElement>(BARS)) {
      const r = bar.getBoundingClientRect();
      if (r.height && r.right > window.innerWidth - 96 && r.bottom > window.innerHeight - 4) lift = Math.max(lift, window.innerHeight - r.top);
    }
    btn.style.setProperty('--to-top-lift', `${Math.round(lift)}px`);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('cookie-consent-accepted', schedule);
  // панель сравнения появляется и пропадает без прокрутки
  new MutationObserver(schedule).observe(document.body, { childList: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'instant' : 'smooth' });
    btn.blur();
  });
  update();
}
