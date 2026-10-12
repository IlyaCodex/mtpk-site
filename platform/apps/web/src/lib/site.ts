/** Канонический адрес сайта: canonical, og:url, sitemap, JSON-LD. */
export const SITE = (process.env.SITE_URL ?? 'https://uralinduktor.ru').replace(/\/$/, '');

/**
 * Версии статики, которую страницы подключают по прямому адресу (сброс кеша
 * браузера: шлюз и браузеры кешируют /css и /js). Общие стили сайта
 * собираются в /assets с хешем в имени — им версия не нужна.
 */
export const ASSET_VERSIONS = {
  /** общая версия /css/tpl/*.css */
  tplCss: '20261012a',
} as const;

/**
 * Скрипты для блоков «HTML как есть»: имя → версия (какие нужны странице —
 * решает контент-сервис по содержимому этих блоков, content-kit/features).
 */
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
