import { $, $$ } from './dom';

/**
 * Карусель (виджет конструктора, блок carousel): лента со scroll-snap листается
 * и без скрипта; скрипт добавляет стрелки, точки и автопрокрутку. Автопрокрутка
 * стоит, пока на карусели мышь или фокус, и выключена при «уменьшить движение».
 */
function initCarousel(root: HTMLElement): void {
  const track = $<HTMLElement>('.w-carousel__track', root);
  if (!track) return;
  const slides = $$<HTMLElement>('.w-carousel__slide', track);
  if (slides.length < 2) return;
  const prev = $<HTMLButtonElement>('.w-carousel__arrow--prev', root);
  const next = $<HTMLButtonElement>('.w-carousel__arrow--next', root);
  const dotsBox = $<HTMLElement>('.w-carousel__dots', root);

  /** Слайдов на экране и шаг прокрутки — по ширине слайда, а не по настройке (на телефоне их меньше). */
  const step = () => slides[0].offsetWidth + Number.parseFloat(getComputedStyle(track).columnGap || '0');
  const perView = () => Math.max(1, Math.round(track.clientWidth / step()));
  const pages = () => Math.max(1, Math.ceil(slides.length - perView() + 1));
  const page = () => Math.round(track.scrollLeft / step());
  const go = (i: number) => track.scrollTo({ left: Math.max(0, Math.min(i, pages() - 1)) * step() });

  let dots: HTMLButtonElement[] = [];
  const buildDots = () => {
    if (!dotsBox) return;
    dotsBox.textContent = '';
    dots = Array.from({ length: pages() > 1 ? pages() : 0 }, (_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.addEventListener('click', () => go(i));
      dotsBox.append(b);
      return b;
    });
  };
  const update = () => {
    const p = page();
    if (prev) prev.disabled = p <= 0;
    if (next) next.disabled = p >= pages() - 1;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === p));
  };

  prev?.addEventListener('click', () => go(page() - 1));
  next?.addEventListener('click', () => go(page() + 1));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      go(page() + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let raf = 0;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    },
    { passive: true },
  );
  let lastPages = pages();
  window.addEventListener(
    'resize',
    () => {
      if (pages() !== lastPages) {
        lastPages = pages();
        buildDots();
      }
      update();
    },
    { passive: true },
  );
  buildDots();
  update();
  root.classList.add('is-ready');

  const seconds = Number.parseInt(root.dataset.autoplay ?? '0', 10);
  if (seconds > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let paused = false;
    const pause = (v: boolean) => () => (paused = v);
    root.addEventListener('mouseenter', pause(true));
    root.addEventListener('mouseleave', pause(false));
    root.addEventListener('focusin', pause(true));
    root.addEventListener('focusout', pause(false));
    setInterval(() => {
      if (paused || document.hidden) return;
      go(page() >= pages() - 1 ? 0 : page() + 1);
    }, seconds * 1000);
  }
}

$$<HTMLElement>('[data-carousel]').forEach(initCarousel);
