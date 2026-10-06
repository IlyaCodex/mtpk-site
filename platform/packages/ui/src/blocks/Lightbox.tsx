const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/**
 * Просмотр фото на весь экран (закрыт до клика). Кадры — элементы страницы с
 * data-lightbox-index: фото карточки товара и миниатюры, в том числе внутри
 * HTML-блоков. Открытие, листание, свайп, Esc — клиентский модуль lightbox.
 */
export function Lightbox({ label = 'Галерея фото', total = 1 }: { label?: string; total?: number }) {
  return (
    <div className="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="lightbox__btn lightbox__close" aria-label="Закрыть (Esc)">
        <svg viewBox="0 0 24 24" {...ICON}>
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>
      <button type="button" className="lightbox__btn lightbox__prev" aria-label="Предыдущее (←)">
        <svg viewBox="0 0 24 24" {...ICON}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <button type="button" className="lightbox__btn lightbox__next" aria-label="Следующее (→)">
        <svg viewBox="0 0 24 24" {...ICON}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <img className="lightbox__img" id="lb-img" alt="" />
      <div className="lightbox__counter">
        <span id="lb-current">1</span>
        {' / '}
        <span id="lb-total">{total}</span>
      </div>
    </div>
  );
}
