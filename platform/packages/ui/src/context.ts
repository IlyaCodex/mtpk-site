import { pageHasLeadgen, walkBlocks, type ActiveHoliday, type Block } from '@mtpk/content-model';
import type { StockOffer } from '@mtpk/content-kit/stock';
import { CARD_COVER_PLACE } from './blocks/CatalogCards.tsx';
import { findImagePlace, imageSources } from './primitives/images-html.ts';
import { responsive } from './primitives/images.ts';

/**
 * Контекст рендера страницы: данные, которые нужны блокам помимо их
 * собственных полей. Передаётся пропсом (серверные компоненты React не
 * поддерживают Context), собирается сайтом из API контент-сервиса.
 */
export interface StockInfo {
  shipping?: string;
  /** цена со склада (позиции с ценой, ведущие на товар) — в карточке товара вместо «Цена — по запросу» */
  offer?: StockOffer;
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
  /** первые картинки страницы: грузятся сразу, не лениво (могут быть на первом экране) */
  eagerImages?: string[];
  /** предпросмотр в админке: CSS блоков и секций — сразу в разметке (несохранённого файла ещё нет) */
  preview?: boolean;
  /** праздник, который сейчас на сайте: праздничный вид обложки главной (раздел «Праздники») */
  holiday?: ActiveHoliday | null;
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

/** Первые картинки страницы по порядку (не больше limit). */
export function firstImages(blocks: Block[], limit = 2): string[] {
  const out: string[] = [];
  for (const b of walkBlocks(blocks)) {
    if (out.length >= limit) break;
    if (b.type === 'productHero' && b.media.photos[0]) out.push(b.media.photos[0].src);
    if (b.type === 'html') out.push(...imageSources(b.html));
    // карточки из каталога заменили такие же сетки в блоках «HTML как есть»
    if (b.type === 'catalogCards') {
      out.push(...(b.items ?? []).flatMap((it) => (it.image ? [it.image] : [])));
      if (b.after) out.push(...imageSources(b.after));
    }
  }
  return out.slice(0, limit);
}

/**
 * Предзагрузка картинки первого экрана. Если на странице это <img> с srcset —
 * предзагрузка берёт тот же srcset/sizes, иначе браузер скачал бы картинку
 * дважды (оригинал по ссылке и копию по srcset). Фон из CSS — оригинал.
 */
export function preloadHints(src: string, blocks: Block[]): { href: string; srcSet?: string; sizes?: string } {
  for (const b of walkBlocks(blocks)) {
    const place =
      b.type === 'productHero' && b.media.photos[0]?.src === src
        ? 'phero__main'
        : b.type === 'html'
          ? findImagePlace(b.html, src)
          : b.type === 'catalogCards' && b.items?.some((it) => it.image === src && it.imageAttrs?.srcset === undefined)
            ? CARD_COVER_PLACE[b.design]
            : b.type === 'catalogCards' && b.after
              ? findImagePlace(b.after, src)
              : b.type === 'catalogList' && b.cards.some((c) => c.image.src === src)
              ? 'pcard__cover'
              : null;
    if (place === null) continue;
    const hints = responsive(src, place);
    return hints ? { href: src, ...hints } : { href: src };
  }
  return { href: src };
}

/** Контекст страницы по её блокам и данным сайта. */
export function buildRenderContext(
  path: string,
  blocks: Block[],
  site: { stock: Record<string, StockInfo>; compareSections: string[] },
  holiday: ActiveHoliday | null = null,
): RenderContext {
  const frames = countLightboxFrames(blocks);
  return {
    path,
    stock: site.stock,
    compareSections: site.compareSections,
    hasLeadgenBlock: pageHasLeadgen(blocks),
    lightboxTotal: frames || undefined,
    eagerImages: firstImages(blocks),
    holiday,
  };
}
