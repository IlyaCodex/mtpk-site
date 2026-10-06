const ICON =
  '<svg class="cmp-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M4 8h16M7 8l-3 6h6zM17 8l-3 6h6z"/></svg>';

/**
 * Кнопка «К сравнению» в карточке каталога и на странице товара. Выбор
 * хранится в браузере (localStorage): отметку «В сравнении» и нижнюю панель
 * рисует клиентский модуль compare.
 */
export function CompareButton({ url }: { url: string }) {
  return (
    <button
      type="button"
      className="cmp-btn"
      data-compare={url}
      aria-pressed="false"
      dangerouslySetInnerHTML={{ __html: `${ICON}<span>К сравнению</span>` }}
    />
  );
}
