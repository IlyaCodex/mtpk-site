import { $, $$ } from './dom';
import { setImage } from './images';

/**
 * Галерея карточки товара: миниатюры переключают главное фото, стрелки,
 * счётчик «2 / 5», свайп, клавиши ← →. Клик по главному фото открывает
 * просмотр на весь экран с текущего кадра (data-lightbox-index — актуальный).
 */
function initGallery(media: HTMLElement): void {
  const stage = $('.phero__stage', media);
  const strip = $('.phero__thumbs', media);
  const main = $<HTMLButtonElement>('.phero__main', media);
  const img = main && $<HTMLImageElement>('img', main);
  if (!stage || !strip || !main || !img) return;
  const thumbs = $$<HTMLButtonElement>('.phero__thumb', strip);
  const slides = thumbs.map((t) => {
    const ti = $<HTMLImageElement>('img', t);
    return { src: ti?.dataset.full || ti?.getAttribute('src') || '', alt: ti?.alt ?? '' };
  });
  if (slides.length < 2) return;
  const counter = $('.phero__counter', stage);
  const zoom = main.hasAttribute('data-lightbox-index');
  const preloaded = new Set<string>();
  let current = 0;

  // соседние кадры — заранее, той же ширины, что выберет главное фото
  const preload = (i: number) => {
    const s = slides[(i + slides.length) % slides.length].src;
    if (preloaded.has(s)) return;
    preloaded.add(s);
    setImage(new Image(), s, 'phero__main');
  };

  const go = (i: number) => {
    current = (i + slides.length) % slides.length;
    const slide = slides[current];
    if (img.getAttribute('src') !== slide.src) {
      img.classList.add('is-switching');
      setImage(img, slide.src, 'phero__main');
    }
    img.alt = slide.alt;
    if (zoom) main.dataset.lightboxIndex = String(current);
    thumbs.forEach((t, k) => t.classList.toggle('is-active', k === current));
    thumbs[current].scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
    preload(current + 1);
    preload(current - 1);
  };
  img.addEventListener('load', () => img.classList.remove('is-switching'));
  preload(1);

  strip.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest('.phero__thumb') : null;
    if (!t) return;
    e.preventDefault();
    e.stopPropagation(); // в карусели миниатюра переключает фото, а не открывает просмотр
    go(thumbs.indexOf(t as HTMLButtonElement));
  });
  $('.phero__nav--prev', stage)?.addEventListener('click', (e) => (e.stopPropagation(), go(current - 1)));
  $('.phero__nav--next', stage)?.addEventListener('click', (e) => (e.stopPropagation(), go(current + 1)));
  media.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') (e.preventDefault(), go(current - 1));
    if (e.key === 'ArrowRight') (e.preventDefault(), go(current + 1));
  });

  // свайп по фото на телефоне листает; тап — открывает просмотр
  let start: { x: number; y: number } | null = null;
  let swallowClick = false;
  main.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') start = { x: e.clientX, y: e.clientY };
  });
  main.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      go(current + (dx < 0 ? 1 : -1));
      swallowClick = true;
    }
  });
  main.addEventListener(
    'click',
    (e) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
}

export function initGalleries(): void {
  for (const media of $$('.phero__media')) initGallery(media);
}

initGalleries();
