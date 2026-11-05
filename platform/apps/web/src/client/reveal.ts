/**
 * Главная: появление блоков после первого экрана при прокрутке (стили — styles/home-premium.css).
 * Заголовки, карточки и фото проявляются лесенкой — то, что вошло в экран вместе, по очереди; числа
 * досчитываются; фото сервиса и модернизации слегка плывут. Первый экран и то, что видно уже при
 * загрузке, не трогаем; при настройке «меньше анимации» — ничего не делаем.
 */
import { $$, reducedMotion } from './dom';

/** Что проявлять: селектор и вид (без вида — подъём с размытием). */
const GROUPS: [selector: string, variant?: 'zoom' | 'side' | 'unveil' | 'soft'][] = [
  ['.equip__title, .equip__lead, .equip__more'],
  ['.equip-card'],
  ['.stats .stat'],
  ['.leadgen__eyebrow, .leadgen__title, .leadgen__lead, .leadgen__checklist-item'],
  ['.leadgen .form', 'zoom'],
  ['.solve__eyebrow, .solve__title, .solve__lead'],
  ['.solve-card'],
  ['.solve__foot'],
  ['.foundry__eyebrow, .foundry__title, .foundry__lead'],
  ['.foundry__art', 'soft'],
  ['.foundry-step'],
  ['.foundry__panel', 'zoom'],
  ['.stock-show__eyebrow, .stock-show__title, .stock-show__lead, .stock-show__bar'],
  ['.stock-type'],
  ['.stock-show__foot'],
  ['.care__eyebrow, .care__title, .care__lead'],
  ['.care__photo', 'unveil'],
  ['.care-card'],
  ['.care__cta', 'zoom'],
  ['.upgrade__eyebrow, .upgrade__title, .upgrade__lead, .upgrade__main > .btn'],
  ['.upgrade-point', 'side'],
  ['.upgrade__photo', 'unveil'],
  ['.works__eyebrow, .works__title, .works__lead, .works__all'],
  ['.works-main', 'zoom'],
  ['.works__bar'],
  ['.work-card'],
  ['.lease__panel', 'zoom'],
  ['.lease-partner'],
  ['.geomap__eyebrow, .geomap__title, .geomap__lead, .geomap__stat, .geomap__filters'],
  ['.geomap__frame', 'zoom'],
  ['.geomap__note'],
  ['.bo-info__eyebrow, .bo-info__title, .bo-item'],
  ['.bo-panel__card', 'zoom'],
];
/** Числа, которые досчитываются от нуля: первое число в тексте элемента. */
const COUNTERS = '.stats .stat__num, .geomap__num';
/** Фото, которые плывут при прокрутке (переменная --py в стилях). */
const PARALLAX = '.care__photo img, .upgrade__photo img';

const STEP = 75;
const MAX_DELAY = 450;

function countUp(el: HTMLElement): void {
  const node = Array.from(el.childNodes).find((n): n is Text => n instanceof Text && /\d/.test(n.data));
  const m = node?.data.match(/^(\D*)(\d+)(.*)$/s);
  if (!node || !m) return;
  const [, before, digits, after] = m;
  const to = Number(digits);
  const t0 = performance.now();
  const dur = 1500;
  const tick = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    node.data = `${before}${p >= 1 ? to : Math.round(to * (1 - Math.pow(2, -10 * p)))}${after}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  node.data = `${before}0${after}`;
  requestAnimationFrame(tick);
}

export function initReveal(): void {
  const main = document.querySelector('main');
  if (!main?.querySelector(':scope > .hero--home') || reducedMotion() || !('IntersectionObserver' in window)) return;
  const vh = window.innerHeight;
  // уже видное при загрузке — как есть, без мигания
  const below = (el: Element) => el.getBoundingClientRect().top > vh * 0.92;

  const reveal = new IntersectionObserver(
    (entries) => {
      let i = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.style.setProperty('--rv-d', `${Math.min(i++ * STEP, MAX_DELAY)}ms`);
        el.classList.add('is-in');
        reveal.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  for (const [selector, variant] of GROUPS) {
    for (const el of $$(selector, main)) {
      if (el.closest('.hero') || el.classList.contains('rv') || !below(el)) continue;
      el.classList.add('rv');
      if (variant) el.classList.add(`rv--${variant}`);
      reveal.observe(el);
    }
  }

  const counters = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        counters.unobserve(e.target);
        countUp(e.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  for (const el of $$(COUNTERS, main)) if (below(el)) counters.observe(el);

  const photos = $$(PARALLAX, main);
  if (!photos.length) return;
  let queued = false;
  const drift = () => {
    queued = false;
    for (const img of photos) {
      const r = img.parentElement!.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const shift = Math.max(-18, Math.min(18, (r.top + r.height / 2 - vh / 2) * -0.05));
      img.style.setProperty('--py', `${shift.toFixed(1)}px`);
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(drift);
    },
    { passive: true },
  );
  drift();
}
