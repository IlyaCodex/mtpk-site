import { buildSitemap } from '@/lib/sitemap';

// Динамически: список страниц и так кешируется в контент-сервисе (Redis), а при
// сборке Docker-образа сервисов ещё нет — пререндер на сборке недопустим.
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await buildSitemap(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
