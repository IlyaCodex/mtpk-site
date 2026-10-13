/**
 * @mtpk/ui — React-компоненты сайта uralinduktor.ru.
 *
 *   blocks/   блоки страниц (карточка товара, характеристики, каталог, FAQ…)
 *   catalog/  карточки товаров, фильтр, сравнение, правила бейджей
 *   forms/    формы обратной связи — по компоненту на вид формы (отправка на /api/send.php — клиентский модуль forms)
 *   browser/  общая логика клиентских модулей сайта (без React)
 *   primitives/ крошки, кнопки, заголовки секций, вывод HTML
 *
 * Компоненты рендерятся только на сервере (сайт, предпросмотр в админке,
 * SEO-разметка в контент-сервисе): клиентского React на сайте нет, поведение —
 * маленькие TypeScript-модули apps/web/src/client. Оформление — дизайн-система
 * сайта (public/css в apps/web).
 */
export * from './context.ts';
export { Blocks, BlockView } from './blocks/BlockRenderer.tsx';
export { ProductHero } from './blocks/ProductHero.tsx';
export { ProductMedia, MadeBadge, StockBadge } from './blocks/ProductMedia.tsx';
export { ProductSpec, SpecTable } from './blocks/ProductSpec.tsx';
export { Lightbox } from './blocks/Lightbox.tsx';
export { CatalogList } from './blocks/CatalogList.tsx';
export { CategoryHero } from './blocks/CategoryHero.tsx';
export { HomeHero, holidayImageHints } from './blocks/HomeHero.tsx';
export { Faq, Stats } from './blocks/Simple.tsx';
export { Leadgen } from './blocks/Leadgen.tsx';
export { BestOffer } from './blocks/BestOffer.tsx';
export { CatalogCta } from './blocks/CatalogCta.tsx';
export { Partner } from './blocks/Partner.tsx';
export { Adv } from './blocks/Adv.tsx';
export { WhyUs } from './blocks/WhyUs.tsx';
export { ProductCard } from './catalog/ProductCard.tsx';
export { CatalogGrid } from './catalog/CatalogGrid.tsx';
export { CompareButton } from './catalog/Compare.tsx';
export { isMadeInRussia, productSlug } from './catalog/rules.ts';
export * from './forms/index.ts';
export { RawElement, Inline } from './primitives/Html.tsx';
export { ActionLink, Breadcrumbs, SectionHead } from './primitives/common.tsx';
