import type { ProductGallery } from '@mtpk/content-model';
import { Inline } from '../primitives/Html.tsx';

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

const THUMBS_CLASS: Record<ProductGallery['thumbs'], string> = {
  grid: 'phero__thumbs',
  row: 'phero__thumbs',
  scroll: 'phero__thumbs phero__thumbs--scroll',
};

/**
 * Фото карточки товара: главное фото и, если фото два и больше, лента
 * миниатюр с перелистыванием (стрелки, счётчик, свайп — клиентский модуль
 * gallery). Номера кадров для просмотра на весь экран (data-lightbox-index)
 * и подписи кнопок проставляются сами: в админке редактируется только список фото.
 */
export function ProductMedia({ media, madeInRussia, inStock }: { media: ProductGallery; madeInRussia: boolean; inStock: boolean }) {
  const [first] = media.photos;
  const carousel = media.photos.length >= 2;

  const main = (
    <button
      className="phero__main"
      type="button"
      aria-label={media.mainLabel ?? 'Открыть фото на весь экран'}
      data-lightbox-index={media.zoom ? '0' : undefined}
    >
      {media.banner !== undefined && <Inline className="phero__banner" html={media.banner} />}
      <img src={first.src} alt={media.mainAlt ?? first.alt} loading="eager" fetchPriority="high" />
      {madeInRussia && <MadeBadge />}
    </button>
  );

  let stage = main;
  if (carousel) {
    stage = (
      <div className="phero__stage">
        {main}
        <button type="button" className="phero__nav phero__nav--prev" aria-label="Предыдущее фото">
          <Arrow dir={-1} />
        </button>
        <button type="button" className="phero__nav phero__nav--next" aria-label="Следующее фото">
          <Arrow dir={1} />
        </button>
        <span className="phero__counter" aria-live="polite">{`1 / ${media.photos.length}`}</span>
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
    <div className="phero__media">
      {stage}
      {carousel && (
        <div className={`${THUMBS_CLASS[media.thumbs]}${media.thumbs === 'row' ? ` phero__thumbs--cols-${media.photos.length}` : ''} is-carousel`}>
          {media.photos.map((p, i) => (
            <button key={i} className={i === 0 ? 'phero__thumb is-active' : 'phero__thumb'} type="button" aria-label={`Фото ${i + 1}`} data-lightbox-index={String(i)}>
              <img src={p.thumb ?? p.src} alt={p.alt} loading={i === 0 ? undefined : 'lazy'} data-full={p.thumb ? p.src : undefined} />
            </button>
          ))}
        </div>
      )}
      {media.caption !== undefined && <Inline as="p" className="phero__caption" html={media.caption} />}
    </div>
  );
}
