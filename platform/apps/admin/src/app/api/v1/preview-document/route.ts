import { z } from 'zod';
import { route } from '@/lib/api';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';

const input = z.object({ body: z.string() });

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Предпросмотр страницы-документа (Практикум) в редакторе: документ как есть,
 * элементы помечены местом в исходнике (правка щелчком меняет ровно этот кусок),
 * формы — как на сайте. Адреса стилей и картинок — от сайта (<base>); скриптов
 * предпросмотр не выполняет (iframe без allow-scripts).
 */
export const POST = route('content', async (req, user) => {
  const { body } = input.parse(await req.json());
  const site = env().PUBLIC_SITE_URL.replace(/\/$/, '');
  let html: string;
  try {
    ({ html } = await serviceJson<{ html: string }>('content', 'documents/preview', { method: 'POST', json: { body }, user }));
  } catch (err) {
    const why = err instanceof ServiceError ? JSON.stringify(err.body).slice(0, 600) : (err as Error).message;
    html = `<!doctype html><html><body><div style="padding:24px;font:14px/1.5 system-ui;color:#b42318">Документ не отрисовался: ${escapeAttr(why)}</div></body></html>`;
  }
  const extra = `<base href="${escapeAttr(site)}/"><style>html:not(.mtpk-live) a{pointer-events:none}</style>`;
  // сразу после <head ...>; нет <head> — в начало документа
  const head = /<head(?:\s[^>]*)?>/i.exec(html);
  const out = head ? html.slice(0, head.index + head[0].length) + extra + html.slice(head.index + head[0].length) : extra + html;
  return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
});
