import { $, $$, delegate } from './dom';
import { fullImage } from './images';

type Slide = { src: string; alt: string };

/** Окно просмотра — та же разметка, что у блока «Просмотр фото» (packages/ui/src/blocks/Lightbox.tsx). */
const ICON = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
function createBox(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.id = 'lightbox';
  box.setAttribute('aria-hidden', 'true');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Фото');
  box.innerHTML = `<button type="button" class="lightbox__btn lightbox__close" aria-label="Закрыть (Esc)"><svg ${ICON}><path d="M6 6l12 12M18 6l-12 12"/></svg></button>
<button type="button" class="lightbox__btn lightbox__prev" aria-label="Предыдущее (←)"><svg ${ICON}><path d="M15 6l-6 6 6 6"/></svg></button>
<button type="button" class="lightbox__btn lightbox__next" aria-label="Следующее (→)"><svg ${ICON}><path d="M9 6l6 6-6 6"/></svg></button>
<img class="lightbox__img" id="lb-img" alt="">
<div class="lightbox__counter"><span id="lb-current">1</span> / <span id="lb-total">1</span></div>`;
  document.body.append(box);
  return box;
}

/**
 * Просмотр фото на весь экран. Кадры — элементы с data-lightbox-index (фото
 * товара, миниатюры, фото в блоках «HTML как есть»): полный кадр из data-full.
 * Фото виджетов (сетка фото) — data-lightbox без номера: номера им даются
 * после остальных, окно просмотра создаётся, если его на странице нет.
 * Свой набор кадров — у элемента с data-lightbox-group (карточка склада): кадры —
 * его [data-slide], открывают их кнопка [data-lightbox-open] (с первого кадра) и
 * сами кадры-кнопки; листаются только кадры этого набора.
 * Клавиатура (Esc, ←, →), свайп, возврат фокуса, блокировка прокрутки фона.
 */
function initLightbox(): void {
  const extra = $$('[data-lightbox]:not([data-lightbox-index])');
  if (extra.length) {
    let next = Math.max(-1, ...$$('[data-lightbox-index]').map((el) => Number.parseInt(el.dataset.lightboxIndex ?? '-1', 10) || 0)) + 1;
    for (const el of extra) el.dataset.lightboxIndex = String(next++);
  }
  const hasGroups = $$('[data-lightbox-group]').length > 0;
  const box = document.getElementById('lightbox') ?? (extra.length || hasGroups ? createBox() : null);
  const img = $<HTMLImageElement>('.lightbox__img', box ?? document);
  if (!box || !img) return;
  const currentEl = document.getElementById('lb-current');
  const totalEl = document.getElementById('lb-total');

  const slides: Slide[] = [];
  for (const el of $$('[data-lightbox-index]')) {
    const i = Number.parseInt(el.dataset.lightboxIndex ?? '', 10);
    const im = el.querySelector('img');
    if (Number.isNaN(i) || slides[i] || !im) continue;
    slides[i] = { src: im.dataset.full || im.getAttribute('src') || '', alt: im.alt };
  }
  const pageList = slides.filter(Boolean);
  if (!pageList.length && !hasGroups) return;
  if (totalEl) totalEl.textContent = String(pageList.length);

  let list: Slide[] = pageList;
  let index = 0;
  let lastFocused: Element | null = null;
  const isOpen = () => box.classList.contains('is-open');

  const show = (i: number) => {
    index = (i + list.length) % list.length;
    img.src = fullImage(list[index].src);
    img.alt = list[index].alt;
    if (currentEl) currentEl.textContent = String(index + 1);
    if (list === pageList) $$('.phero__thumb').forEach((t, k) => t.classList.toggle('is-active', k === index));
  };
  const open = (frames: Slide[], i: number) => {
    list = frames;
    if (totalEl) totalEl.textContent = String(list.length);
    // у набора из одного кадра стрелки не нужны
    box.classList.toggle('is-single', list !== pageList && list.length < 2);
    lastFocused = document.activeElement;
    show(i);
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $<HTMLButtonElement>(list.length < 2 ? '.lightbox__close' : '.lightbox__next', box)?.focus();
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
    if (!pageList.length) return;
    e.preventDefault();
    open(pageList, Number.parseInt(el.dataset.lightboxIndex ?? '0', 10) || 0);
  });
  delegate('click', '[data-lightbox-group] [data-lightbox-open], [data-lightbox-group] button[data-slide]', (el, e) => {
    const group = el.closest<HTMLElement>('[data-lightbox-group]');
    if (!group) return;
    const frames = $$('[data-slide]', group).filter((f) => f.dataset.full || f.getAttribute('src'));
    if (!frames.length) return;
    e.preventDefault();
    const at = el.hasAttribute('data-slide') ? Math.max(0, frames.indexOf(el)) : 0;
    open(
      frames.map((f) => ({ src: f.dataset.full || f.getAttribute('src') || '', alt: f.dataset.alt ?? f.getAttribute('alt') ?? '' })),
      at,
    );
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
