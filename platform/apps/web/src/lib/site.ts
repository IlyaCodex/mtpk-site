/** Канонический адрес сайта: canonical, og:url, sitemap, JSON-LD. */
export const SITE = (process.env.SITE_URL ?? 'https://uralinduktor.ru').replace(/\/$/, '');

/** Коллтрекинг Mango: имя файла содержит дату и хеш сборки — кешируется надолго. */
export const MANGO_SCRIPT = '/js/mango-uibusiness-tracking-20261007-63dc454cb493.js';

export const DEFAULT_OG_IMAGE = '/og/default.jpg';
export const DEFAULT_DESCRIPTION =
  'Производим, поставляем и запускаем оборудование для металлургии и литейных производств — индукционные печи, дробемётные установки, чиллеры, ковши.';

/** '/' | '/products/x/' из сегментов catch-all маршрута. */
export function slugToPath(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return '/';
  return `/${slug.join('/')}/`;
}
