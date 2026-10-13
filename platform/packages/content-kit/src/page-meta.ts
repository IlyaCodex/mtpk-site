/**
 * Производные свойства страницы: картинка для поиска, индексируемость, вес,
 * тип шаблона, раздел меню.
 */

/** Нормализованный путь: '/', '/products/', '/products/x/y/' */
export function normalizePath(p: string): string {
  let s = p.trim();
  if (!s.startsWith('/')) s = `/${s}`;
  if (!s.endsWith('/')) s = `${s}/`;
  return s.replace(/\/{2,}/g, '/');
}

/** '/products/x/' → 'products/x' ('' для главной) */
export function pathToSlug(p: string): string {
  return p.replace(/^\/|\/$/g, '');
}

/**
 * Картинка-превью для выдачи поиска: LCP-картинка из meta, иначе главное
 * фото товара, фон hero или первое изображение страницы.
 */
export function pickSearchImage(body: string, preloadImage: string | null | undefined): string | null {
  // кавычки в url() бывают и сущностями: React пишет style="background-image:url(&#x27;/img/…&#x27;)"
  const q = `(?:['"]|&#x27;|&#39;|&quot;)?`;
  const m = body.match(/class="phero__main"[\s\S]*?<img[^>]*?src="([^"]+)"/)
    || body.match(new RegExp(`background-image:\\s*url\\(${q}([^'"&)]+)${q}\\)`))
    || body.match(/<img[^>]*?src="([^"]+)"/);
  const raw = (preloadImage || (m && m[1]) || '').replace(/\?v=\d+/, '');
  return raw || null;
}

/** Что попадает в поиск по сайту: проекты и служебные страницы не ищутся. */
export function isSearchable(path: string): boolean {
  const slug = pathToSlug(path);
  if (slug.startsWith('proekty')) return false;
  if (slug === 'spasibo' || slug === 'sravnenie') return false;
  return true;
}

/** Разделы каталога (с .cat-hero) поднимаются над карточками товаров. */
export function searchWeight(path: string, body: string): number {
  const slug = pathToSlug(path);
  return slug.startsWith('products') && body.includes('class="cat-hero"') ? 10 : 1;
}

/** Пункт главного меню, подсвечиваемый на странице. */
export function activeNavFor(path: string): string | undefined {
  const slug = pathToSlug(path);
  if (slug === '') return 'home';
  if (slug.startsWith('products')) return 'catalog';
  if (slug.startsWith('uslugi')) return 'uslugi';
  if (slug.startsWith('proizvodstvo')) return 'proizvodstvo';
  if (slug.startsWith('proekty')) return 'proekty';
  if (slug.startsWith('nalichie')) return 'nalichie';
  if (slug.startsWith('o-kompanii') || slug.startsWith('o-company')) return 'o-kompanii';
  if (slug.startsWith('kontakty')) return 'kontakty';
  if (slug.startsWith('otzyvy')) return 'otzyvy';
  if (slug.startsWith('praktikum')) return 'praktikum';
  return undefined;
}

/**
 * Тип шаблона страницы (docs/page-types): нужен для админки, отчётов и
 * постепенного переноса шаблонов на React-компоненты.
 */
export function detectTemplate(path: string, body: string): string {
  const slug = pathToSlug(path);
  const depth = slug ? slug.split('/').length : 0;
  if (slug === '') return 'home';
  if (slug === 'products') return 'catalog-root';
  if (slug.startsWith('products/zapchasti')) {
    if (/<div\s+class="(product-overview|tr-product-overview)"/.test(body)) return 'spare';
    return depth <= 2 ? 'section' : 'spare-category';
  }
  if (slug.startsWith('products/')) {
    if (/<section\s+class="phero"/.test(body)) return 'product';
    if (depth === 2) return 'section';
    return 'category';
  }
  if (slug === 'uslugi') return 'services-root';
  if (slug.startsWith('uslugi/')) return 'service';
  if (slug === 'proekty') return 'projects-root';
  if (slug.startsWith('proekty/')) return 'project';
  if (slug === 'news') return 'news-root';
  if (slug.startsWith('news/')) return 'news';
  if (slug === 'resheniya') return 'solutions-root';
  if (slug.startsWith('resheniya/')) return 'solution';
  if (slug === 'policy' || slug === 'soglasie') return 'legal';
  if (slug === 'spasibo' || slug === 'sravnenie') return 'utility';
  if (slug === 'nalichie') return 'stock';
  if (slug === 'proizvodstvo') return 'proizvodstvo';
  if (slug === 'o-company') return 'company';
  if (slug === 'kontakty') return 'contacts';
  if (slug === 'otzyvy') return 'reviews';
  if (slug.startsWith('praktikum')) return 'praktikum';
  return 'page';
}

/** Приоритет и частота обновления в sitemap — по типу страницы. */
export function sitemapRules(path: string): { priority: number; changefreq: string } {
  if (path === '/' || path === '') return { priority: 1.0, changefreq: 'weekly' };
  if (
    ['/products/', '/uslugi/', '/proizvodstvo/', '/o-kompanii/', '/o-company/', '/nalichie/', '/contact/', '/proekty/'].includes(path)
  ) {
    return { priority: 0.9, changefreq: 'weekly' };
  }
  if (path.startsWith('/products/') && path.split('/').filter(Boolean).length <= 3) {
    return { priority: 0.8, changefreq: 'monthly' };
  }
  if (path.startsWith('/products/')) return { priority: 0.7, changefreq: 'monthly' };
  if (path.startsWith('/proekty/') || path.startsWith('/news/') || path.startsWith('/reviews/')) {
    return { priority: 0.5, changefreq: 'monthly' };
  }
  return { priority: 0.6, changefreq: 'monthly' };
}

/** Страницы вне sitemap: служебные и закрытые от поисковиков (noindex). */
export function inSitemap(path: string): boolean {
  if (path.includes('/404')) return false;
  if (path.includes('/sravnenie')) return false;
  if (/\/(spasibo|policy|soglasie)\/$/.test(path)) return false;
  return true;
}
