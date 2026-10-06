'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Slide {
  src: string;
  alt: string;
}

/**
 * Просмотр фото на весь экран (вместо 11 вариантов inline-скрипта лайтбокса).
 * Кадры — из элементов страницы с data-lightbox-index (фото карточки товара и
 * миниатюры, в том числе внутри HTML-блоков): полный кадр из data-full.
 * Клавиатура (Esc, ←, →), свайп, возврат фокуса, блокировка прокрутки фона.
 */
export function Lightbox({ label = 'Галерея фото', total = 1 }: { label?: string; total?: number }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<Element | null>(null);
  const touchX = useRef(0);

  const show = useCallback(
    (i: number) => {
      const n = slides.length || 1;
      const next = ((i % n) + n) % n;
      setIndex(next);
      // подсветка активной миниатюры — как было
      document.querySelectorAll('.phero__thumb').forEach((t, k) => t.classList.toggle('is-active', k === next));
    },
    [slides.length],
  );

  const close = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = '';
    const f = lastFocused.current as HTMLElement | null;
    f?.focus?.();
  }, []);

  useEffect(() => {
    const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-lightbox-index]'));
    const list: Slide[] = [];
    for (const el of triggers) {
      const i = parseInt(el.getAttribute('data-lightbox-index') ?? '', 10);
      if (Number.isNaN(i) || list[i]) continue;
      const img = el.querySelector('img');
      if (!img) continue;
      list[i] = { src: img.getAttribute('data-full') || img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' };
    }
    setSlides(list.filter(Boolean));
    // делегирование: галерея карточки меняет data-lightbox-index у главного фото на лету
    const onClick = (e: MouseEvent) => {
      const t = (e.target as Element | null)?.closest?.('[data-lightbox-index]') as HTMLElement | null;
      if (!t || t.closest('.phero__thumbs.is-carousel')) return; // в карусели миниатюры переключают сцену
      lastFocused.current = document.activeElement;
      const i = parseInt(t.getAttribute('data-lightbox-index') ?? '0', 10) || 0;
      setIndex(i);
      setOpen(true);
      document.body.style.overflow = 'hidden';
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    nextBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, index, show, close]);

  const slide = slides[index];
  return (
    <div
      ref={root}
      className={open ? 'lightbox is-open' : 'lightbox'}
      id="lightbox"
      aria-hidden={open ? 'false' : 'true'}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        if (e.target === root.current) close();
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) >= 40) show(index + (dx < 0 ? 1 : -1));
      }}
    >
      <button type="button" className="lightbox__btn lightbox__close" aria-label="Закрыть (Esc)" onClick={close}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>
      <button type="button" className="lightbox__btn lightbox__prev" aria-label="Предыдущее (←)" onClick={() => show(index - 1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <button ref={nextBtn} type="button" className="lightbox__btn lightbox__next" aria-label="Следующее (→)" onClick={() => show(index + 1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <img className="lightbox__img" id="lb-img" src={open && slide ? slide.src : undefined} alt={open && slide ? slide.alt : ''} />
      <div className="lightbox__counter">
        <span id="lb-current">{open ? index + 1 : 1}</span>
        {'\u00A0/\u00A0'}
        <span id="lb-total">{slides.length || total}</span>
      </div>
    </div>
  );
}
