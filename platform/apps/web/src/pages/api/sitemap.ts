import type { NextApiRequest, NextApiResponse } from 'next';
import { listPages } from '@/lib/content';
import { buildSitemap, buildSitemapIndex } from '@/lib/sitemap';

/**
 * Карта сайта: /sitemap-index.xml и /sitemap-0.xml (переписываются сюда в
 * next.config). Список страниц кешируется в контент-сервисе (Redis).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  if (req.query.part === 'index') {
    // lastmod индекса — самая свежая правка контента (а не время сборки)
    const pages = await listPages();
    const lastmod = pages.reduce((max, p) => (p.lastmodAt > max ? p.lastmodAt : max), '1970-01-01T00:00:00.000Z');
    return res.send(buildSitemapIndex(lastmod));
  }
  res.send(await buildSitemap());
}
