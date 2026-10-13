import { z } from 'zod';
import { route } from '@/lib/api';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';
import { escapeAttr, siteDocument } from '@/lib/site-document';

const input = z.object({
  path: z.string().default('/'),
  title: z.string().default(''),
  blocks: z.array(z.unknown()),
  cssTemplates: z.array(z.string()).default([]),
  inlineStyles: z.array(z.string()).default([]),
});

/**
 * Предпросмотр страницы в редакторе: блоки рендерит контент-сервис теми же
 * React-компонентами, что и сайт; стили — с сайта, в том же порядке каскада.
 * Возвращает HTML-документ для <iframe srcdoc>; скриптов в нём нет. Перед
 * каждым блоком — метка <!--mtpk:N--> (правка текста прямо в предпросмотре).
 */
export const POST = route('content', async (req, user) => {
  const page = input.parse(await req.json());
  const site = env().PUBLIC_SITE_URL.replace(/\/$/, '');

  let body: string;
  // оформление кнопок из настроек сайта (атрибуты <html>, как на сайте)
  let htmlAttrs = '';
  try {
    ({ html: body, htmlAttrs = '' } = await serviceJson<{ html: string; htmlAttrs?: string }>('content', 'render', { method: 'POST', json: { path: page.path, blocks: page.blocks, mark: true }, user }));
  } catch (err) {
    const why = err instanceof ServiceError ? JSON.stringify(err.body).slice(0, 600) : (err as Error).message;
    body = `<div style="padding:24px;font:14px/1.5 system-ui;color:#b42318">Блоки не отрисовались: ${escapeAttr(why)}</div>`;
  }

  const html = await siteDocument({ site, title: page.title, body, htmlAttrs, cssTemplates: page.cssTemplates, inlineStyles: page.inlineStyles });
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
});
