/** Канонический адрес сайта: canonical, og:url, sitemap, JSON-LD. */
export const SITE = (process.env.SITE_URL ?? 'https://uralinduktor.ru').replace(/\/$/, '');

/**
 * Версии статики (сброс кеша браузера, nginx/шлюз кешируют css/js 7 дней).
 * При правке файла в public/ поднимай его версию здесь.
 */
export const ASSET_VERSIONS = {
  siteCss: '20261005b',
  praktikumNavCss: '20261005a',
  auditFixesCss: '20261005c',
  /** общая версия /css/tpl/*.css */
  tplCss: '20260928a',
  mobileNavJs: '20261003-a11y1',
  phoneMaskJs: '20260601',
  formsJs: '20261002-delivery1',
  scrollToFormJs: '20261002-fix1',
} as const;

/** Скрипты отдельных страниц: имя → версия (какие нужны — решает content-kit/features). */
export const PAGE_SCRIPT_VERSIONS: Record<string, string> = {
  'phero-gallery': '20260914',
  'stock-product': '20261003-a11y1',
  'quote-form': '20260607',
  'stock-badges': '20260601',
  'made-badges': '20260623-1',
  compare: '20260923b',
  'catalog-filter': '20260601-3',
  'spec-tabs': '20260608-2',
  'zapchasti-catalog': '20260918c',
  'zapchasti-tranzistornye': '20260918',
  projects: '20260921a',
  'project-case': '20260921c',
};

/** Коллтрекинг Mango: имя файла содержит дату и хеш сборки — кешируется надолго. */
export const MANGO_SCRIPT = '/js/mango-uibusiness-tracking-20261002-6a7d1dff2fde.js';

export const DEFAULT_OG_IMAGE = '/og/default.jpg';
export const DEFAULT_DESCRIPTION =
  'Производим, поставляем и запускаем оборудование для металлургии и литейных производств — индукционные печи, дробемётные установки, чиллеры, ковши.';

/** '/' | '/products/x/' из сегментов catch-all маршрута. */
export function slugToPath(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return '/';
  return `/${slug.join('/')}/`;
}
