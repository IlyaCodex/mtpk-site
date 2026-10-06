import { compareWalkOrder } from '@mtpk/content-kit/compare';
import { inSitemap, sitemapRules } from '@mtpk/content-kit/page-meta';
import { listPages } from './content';
import { SITE } from './site';

const URLSET_OPEN =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Карта сайта в формате @astrojs/sitemap: те же адреса, lastmod из истории
 * правок (SEO-T6), priority/changefreq по типу страницы, без служебных и noindex.
 * Статьи Практикума — в конце, как customPages в astro.config.mjs.
 */
export async function buildSitemap(): Promise<string> {
  const all = await listPages();
  const pages = all
    .filter((p) => p.kind === 'page' && !p.noindex && inSitemap(p.path))
    .sort((a, b) => compareWalkOrder(a.path, b.path));
  const praktikum = all
    .filter((p) => p.kind === 'document' && p.path.endsWith('/') && !p.noindex)
    .sort((a, b) => (a.path < b.path ? -1 : 1));
  const urls = [...pages, ...praktikum].map((p) => {
    const { priority, changefreq } = sitemapRules(p.path);
    return `<url><loc>${esc(SITE + p.path)}</loc><lastmod>${p.lastmodAt}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority.toFixed(1)}</priority></url>`;
  });
  return `${URLSET_OPEN}${urls.join('')}</urlset>`;
}

export function buildSitemapIndex(lastmod: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-0.xml</loc><lastmod>${lastmod}</lastmod></sitemap></sitemapindex>`;
}
