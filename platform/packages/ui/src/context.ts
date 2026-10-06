import { pageHasLeadgen, walkBlocks, type Block } from '@mtpk/content-model';

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
  /** сколько кадров у просмотра фото на весь экран (считается по странице) */
  lightboxTotal?: number;
}

export const EMPTY_CONTEXT: RenderContext = { path: '/', stock: {}, compareSections: [], hasLeadgenBlock: false };

/** Раздел товара для сравнения: адрес без последнего сегмента. */
export function sectionOf(url: string): string {
  return url.replace(/[^/]+\/$/, '');
}

/** Число кадров лайтбокса: фото товара с просмотром плюс кадры из блоков «HTML как есть». */
export function countLightboxFrames(blocks: Block[]): number {
  let total = 0;
  for (const b of walkBlocks(blocks)) {
    if (b.type === 'productHero' && b.media.zoom) total = Math.max(total, b.media.photos.length);
    if (b.type === 'html') {
      for (const m of b.html.matchAll(/data-lightbox-index="(\d+)"/g)) total = Math.max(total, Number(m[1]) + 1);
    }
  }
  return total;
}

/** Контекст страницы по её блокам и данным сайта. */
export function buildRenderContext(path: string, blocks: Block[], site: { stock: Record<string, StockInfo>; compareSections: string[] }): RenderContext {
  const frames = countLightboxFrames(blocks);
  return {
    path,
    stock: site.stock,
    compareSections: site.compareSections,
    hasLeadgenBlock: pageHasLeadgen(blocks),
    lightboxTotal: frames || undefined,
  };
}
