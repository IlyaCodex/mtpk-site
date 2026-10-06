import { $, $$, delegate } from './dom';
import { fullImage } from './images';

/**
 * Просмотр фото на весь экран. Кадры — элементы с data-lightbox-index (фото
 * товара, миниатюры, фото в блоках «HTML как есть»): полный кадр из data-full.
 * Клавиатура (Esc, ←, →), свайп, возврат фокуса, блокировка прокрутки фона.
 */
function initLightbox(): void {
  const box = document.getElementById('lightbox');
  const img = $<HTMLImageElement>('.lightbox__img', box ?? document);
  if (!box || !img) return;
  const currentEl = document.getElementById('lb-current');
  const totalEl = document.getElementById('lb-total');

  const slides: { src: string; alt: string }[] = [];
  for (const el of $$('[data-lightbox-index]')) {
    const i = Number.parseInt(el.dataset.lightboxIndex ?? '', 10);
    const im = el.querySelector('img');
    if (Number.isNaN(i) || slides[i] || !im) continue;
    slides[i] = { src: im.dataset.full || im.getAttribute('src') || '', alt: im.alt };
  }
  const list = slides.filter(Boolean);
  if (!list.length) return;
  if (totalEl) totalEl.textContent = String(list.length);

  let index = 0;
  let lastFocused: Element | null = null;
  const isOpen = () => box.classList.contains('is-open');

  const show = (i: number) => {
    index = (i + list.length) % list.length;
    img.src = fullImage(list[index].src);
    img.alt = list[index].alt;
    if (currentEl) currentEl.textContent = String(index + 1);
    $$('.phero__thumb').forEach((t, k) => t.classList.toggle('is-active', k === index));
  };
  const open = (i: number) => {
    lastFocused = document.activeElement;
    show(i);
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $<HTMLButtonElement>('.lightbox__next', box)?.focus();
  };
  const close = () => {
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    img.removeAttribute('src');
    document.body.style.overflow = '';
    (lastFocused as HTMLElement | null)?.focus?.();
  };

  delegate('click', '[data-lightbox-index]', (el, e) => {
    if (el.closest('.phero__thumbs.is-carousel')) return; // в карусели миниатюра переключает фото
    e.preventDefault();
    open(Number.parseInt(el.dataset.lightboxIndex ?? '0', 10) || 0);
  });
  $('.lightbox__close', box)?.addEventListener('click', close);
  $('.lightbox__prev', box)?.addEventListener('click', () => show(index - 1));
  $('.lightbox__next', box)?.addEventListener('click', () => show(index + 1));
  box.addEventListener('click', (e) => {
    if (e.target === box) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });
  let touchX = 0;
  box.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  box.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) >= 40) show(index + (dx < 0 ? 1 : -1));
  });
}

initLightbox();
