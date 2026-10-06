/**
 * Контекст рендера страницы: данные, которые нужны блокам помимо их
 * собственных полей. Передаётся пропсом (серверные компоненты React не
 * поддерживают Context), собирается сайтом из API контент-сервиса.
 */
export interface StockInfo {
  shipping?: string;
}

export interface RenderContext {
  /** адрес страницы: '/products/…/' */
  path: string;
  /** склад: slug товара ('a/b/c') → позиция */
  stock: Record<string, StockInfo>;
  /** разделы каталога, где включено сравнение ('/products/…/') */
  compareSections: string[];
  /** на странице есть блок заявки — второй блок с формой получает свой якорь */
  hasLeadgenBlock: boolean;
}

export const EMPTY_CONTEXT: RenderContext = { path: '/', stock: {}, compareSections: [], hasLeadgenBlock: false };

/** Раздел товара для сравнения: адрес без последнего сегмента. */
export function sectionOf(url: string): string {
  return url.replace(/[^/]+\/$/, '');
}
