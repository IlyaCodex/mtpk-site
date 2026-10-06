import { revalidatePath } from 'next/cache';

/**
 * Сигнал от контент-сервиса: страницы изменились — сбросить их ISR-кеш.
 * POST { paths: ['/products/x/'] } или { all: true }, заголовок x-revalidate-secret.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { paths?: string[]; all?: boolean };
  if (body.all) {
    revalidatePath('/', 'layout');
    return Response.json({ ok: true, revalidated: 'all' });
  }
  const paths = (body.paths ?? []).filter((p) => typeof p === 'string' && p.startsWith('/')).slice(0, 5000);
  for (const p of paths) revalidatePath(p);
  // список страниц изменился — карта сайта тоже
  revalidatePath('/sitemap-0.xml');
  revalidatePath('/sitemap-index.xml');
  return Response.json({ ok: true, revalidated: paths.length });
}
