/**
 * @mtpk/ui — React-компоненты сайта uralinduktor.ru.
 *
 *   blocks/   блоки страниц (карточка товара, характеристики, каталог, FAQ…)
 *   catalog/  карточки товаров, фильтр, сравнение, правила бейджей
 *   forms/    формы заявок, маска телефона, «Запросить цену»
 *   page/     общее поведение страницы («Запросить цену», скролл к форме)
 *   primitives/ крошки, кнопки, заголовки секций, вывод HTML
 *
 * Оформление — дизайн-система сайта (public/css в apps/web); новые элементы —
 * Tailwind с токенами (apps/web/src/app/globals.css).
 */
export * from './context.ts';
export { Blocks, BlockView } from './blocks/BlockRenderer.tsx';
export { ProductHero } from './blocks/ProductHero.tsx';
export { ProductMedia, MadeBadge, StockBadge } from './blocks/ProductMedia.tsx';
export { ProductSpec, SpecTable } from './blocks/ProductSpec.tsx';
export { Lightbox } from './blocks/Lightbox.tsx';
export { CatalogList } from './blocks/CatalogList.tsx';
export { CategoryHero } from './blocks/CategoryHero.tsx';
export { Faq, Stats } from './blocks/Simple.tsx';
export { Leadgen } from './blocks/Leadgen.tsx';
export { BestOffer } from './blocks/BestOffer.tsx';
export { CatalogCta } from './blocks/CatalogCta.tsx';
export { Partner } from './blocks/Partner.tsx';
export { Adv } from './blocks/Adv.tsx';
export { WhyUs } from './blocks/WhyUs.tsx';
export { ProductCard } from './catalog/ProductCard.tsx';
export { CatalogGrid } from './catalog/CatalogGrid.tsx';
export { CompareBar, CompareButton } from './catalog/Compare.tsx';
export { isMadeInRussia, productSlug } from './catalog/rules.ts';
export { FileField, FormStatus, LeadForm, PhoneInput, SubmitButton } from './forms/LeadForm.tsx';
export { ARROW, LEAD_ENDPOINT } from './forms/constants.ts';
export { PageEnhancements } from './page/PageEnhancements.tsx';
export { RawElement, Inline } from './primitives/Html.tsx';
export { ActionLink, Breadcrumbs, SectionHead } from './primitives/common.tsx';
