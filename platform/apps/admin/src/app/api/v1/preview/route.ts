import { z } from 'zod';
import { route } from '@/lib/api';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';

const input = z.object({
  path: z.string().default('/'),
  title: z.string().default(''),
  blocks: z.array(z.unknown()),
  cssTemplates: z.array(z.string()).default([]),
  inlineStyles: z.array(z.string()).default([]),
});

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const styleTag = (css: string) => (css.trim().startsWith('<style') ? css : `<style>${css}</style>`);

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
  try {
    ({ html: body } = await serviceJson<{ html: string }>('content', 'render', { method: 'POST', json: { path: page.path, blocks: page.blocks, mark: true }, user }));
  } catch (err) {
    const why = err instanceof ServiceError ? JSON.stringify(err.body).slice(0, 600) : (err as Error).message;
    body = `<div style="padding:24px;font:14px/1.5 system-ui;color:#b42318">Блоки не отрисовались: ${escapeAttr(why)}</div>`;
  }

  const css = [
    '/fonts/fonts-critical.css',
    '/tokens.css',
    '/fonts/fonts-extended.css',
    '/css/site.css',
    '/css/praktikum-nav-v26.css',
    '/css/audit-fixes-20261002.css',
    ...page.cssTemplates,
  ];
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${escapeAttr(site)}/">
<title>${escapeAttr(page.title || 'Предпросмотр')}</title>
${css.map((href) => `<link rel="stylesheet" href="${escapeAttr(href)}">`).join('\n')}
${page.inlineStyles.map(styleTag).join('\n')}
<link rel="stylesheet" href="/css/mobile-fixes.css">
<link rel="stylesheet" href="/css/stock.css">
<link rel="stylesheet" href="/css/base-layout.css">
<style>html:not(.mtpk-live) a{pointer-events:none}</style>
</head>
<body><main>${body}</main></body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
});
