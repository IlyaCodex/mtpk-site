import type { PageDto } from '@mtpk/shared/contracts';

const CONTENT = process.env.CONTENT_URL ?? 'http://127.0.0.1:4101';

export const revalidate = 3600;

/**
 * Раздел «Практикум»: статьи собраны отдельно и хранятся в контенте целыми
 * HTML-документами — отдаются как есть, без общего каркаса сайта.
 * Ассеты раздела (css, картинки) идут через медиасервис (rewrites в next.config).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const segments = (await params).path ?? [];
  const last = segments[segments.length - 1] ?? '';
  const urlPath = `/praktikum/${segments.join('/')}${segments.length && !last.includes('.') ? '/' : ''}`;
  const res = await fetch(`${CONTENT}/v1/pages/by-path?path=${encodeURIComponent(urlPath)}`, {
    next: { tags: ['pages', `page:${urlPath}`] },
  });
  if (res.status === 404) {
    return new Response('Страница не найдена', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (!res.ok) return new Response('Ошибка сервера', { status: 502 });
  const page = (await res.json()) as PageDto;
  return new Response(page.bodyHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, must-revalidate',
    },
  });
}
