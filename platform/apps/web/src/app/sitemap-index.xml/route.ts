import { listPages } from '@/lib/content';
import { buildSitemapIndex } from '@/lib/sitemap';

// Динамически: список страниц и так кешируется в контент-сервисе (Redis), а при
// сборке Docker-образа сервисов ещё нет — пререндер на сборке недопустим.
export const dynamic = 'force-dynamic';

export async function GET() {
  // lastmod индекса — самая свежая правка контента (а не время сборки)
  const pages = await listPages();
  const lastmod = pages.reduce((max, p) => (p.lastmodAt > max ? p.lastmodAt : max), '1970-01-01T00:00:00.000Z');
  return new Response(buildSitemapIndex(lastmod), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
