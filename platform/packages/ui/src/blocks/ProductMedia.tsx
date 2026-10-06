'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ProductHeroBlock } from '@mtpk/content-model';
import { extra, Inline } from '../primitives/Html.tsx';

type Media = ProductHeroBlock['media'];

/** Бейдж «Сделано в России» (стили .made-badge — stock.css). */
export function MadeBadge() {
  return (
    <span className="made-badge" aria-label="Сделано в России">
      <span className="made-badge__flag" aria-hidden="true" />
      Сделано в России
    </span>
  );
}

/** Бейдж «В наличии» — ссылка на раздел склада. */
export function StockBadge() {
  return (
    <a className="pcard__stock-badge" href="/nalichie/" aria-label="В наличии на складе">
      В наличии
    </a>
  );
}

const Arrow = ({ dir }: { dir: -1 | 1 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

/**
 * Фото карточки товара: главная «сцена» и лента миниатюр. При двух и более
 * миниатюрах — карусель (стрелки, счётчик, свайп, клавиатура); клик по сцене
 * открывает лайтбокс на текущем кадре (data-lightbox-index держим актуальным).
 */
export function ProductMedia({ media, madeInRussia, inStock }: { media: Media; madeInRussia: boolean; inStock: boolean }) {
  const thumbs = media.thumbs ?? [];
  const carousel = thumbs.length >= 2;
  const slides = thumbs.map((t) => ({
    src: t.image.attrs?.['data-full'] || t.image.src,
    alt: t.image.alt,
  }));
  const [current, setCurrent] = useState(-1); // -1: исходный кадр из разметки
  const [switching, setSwitching] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const preloaded = useRef(new Set<string>());
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swallowClick = useRef(false);

  const preload = useCallback(
    (i: number) => {
      if (!slides.length) return;
      const s = slides[((i % slides.length) + slides.length) % slides.length].src;
      if (preloaded.current.has(s)) return;
      preloaded.current.add(s);
      const im = new Image();
      im.src = s;
    },
    [slides],
  );

  const go = useCallback(
    (i: number) => {
      const n = slides.length;
      const next = ((i % n) + n) % n;
      setCurrent(next);
      setSwitching(true);
      const active = strip.current?.querySelectorAll('.phero__thumb')[next] as HTMLElement | undefined;
      active?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      preload(next + 1);
      preload(next - 1);
    },
    [slides.length, preload],
  );

  useEffect(() => {
    if (carousel) preload(1);
  }, [carousel, preload]);

  const idx = current < 0 ? 0 : current;
  const shown = current < 0 ? { src: media.image.src, alt: media.image.alt } : slides[current];
  const Main = media.mainTag;
  const mainAttrs = { ...extra(media.mainAttrs, Main) };
  if (carousel && current >= 0) mainAttrs['data-lightbox-index'] = String(current);

  const main = (
    <Main
      className="phero__main"
      {...mainAttrs}
      onClickCapture={(e) => {
        if (swallowClick.current) {
          swallowClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      onPointerDown={(e) => {
        if (!carousel || e.pointerType === 'mouse') return;
        swipe.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const s = swipe.current;
        swipe.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          go(idx + (dx < 0 ? 1 : -1));
          swallowClick.current = true; // свайп — не тап, лайтбокс не открываем
        }
      }}
    >
      {media.banner !== undefined && <Inline className="phero__banner" html={media.banner} />}
      <img
        src={shown.src}
        alt={shown.alt}
        {...extra(media.image.attrs, 'img')}
        className={switching ? 'is-switching' : undefined}
        onLoad={() => setSwitching(false)}
      />
      {madeInRussia && <MadeBadge />}
    </Main>
  );

  let stage: ReactNode = main;
  if (carousel) {
    stage = (
      <div className="phero__stage">
        {main}
        <button type="button" className="phero__nav phero__nav--prev" aria-label="Предыдущее фото" onClick={(e) => (e.stopPropagation(), go(idx - 1))}>
          <Arrow dir={-1} />
        </button>
        <button type="button" className="phero__nav phero__nav--next" aria-label="Следующее фото" onClick={(e) => (e.stopPropagation(), go(idx + 1))}>
          <Arrow dir={1} />
        </button>
        <span className="phero__counter" aria-live="polite">
          {`${idx + 1} / ${slides.length}`}
        </span>
        {inStock && <StockBadge />}
      </div>
    );
  } else if (inStock) {
    stage = (
      <div className="audit-stock-cover">
        {main}
        <StockBadge />
      </div>
    );
  }

  return (
    <div
      className="phero__media"
      onKeyDown={(e) => {
        if (!carousel) return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(idx - 1);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          go(idx + 1);
        }
      }}
    >
      {stage}
      {thumbs.length > 0 && (
        <div
          ref={strip}
          className={carousel ? `${media.thumbsClass ?? 'phero__thumbs'} is-carousel` : (media.thumbsClass ?? 'phero__thumbs')}
          {...extra(media.thumbsAttrs, 'div')}
          onClickCapture={(e) => {
            if (!carousel) return;
            const t = (e.target as Element).closest('.phero__thumb');
            if (!t) return;
            e.stopPropagation();
            e.preventDefault();
            go(Array.from(strip.current?.querySelectorAll('.phero__thumb') ?? []).indexOf(t));
          }}
        >
          {thumbs.map((t, i) => {
            const active = current < 0 ? t.active : i === current;
            return (
              <button key={i} className={active ? 'phero__thumb is-active' : 'phero__thumb'} {...extra(t.attrs, 'button')}>
                <img src={t.image.src} alt={t.image.alt} {...extra(t.image.attrs, 'img')} />
              </button>
            );
          })}
        </div>
      )}
      {media.caption !== undefined && <Inline as="p" className="phero__caption" html={media.caption} />}
    </div>
  );
}
