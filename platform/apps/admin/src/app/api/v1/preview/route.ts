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
const link = (href: string) => `<link rel="stylesheet" href="${escapeAttr(href)}">`;

/** Если манифеста сайта нет — общие стили по прямым адресам (как в сборке, apps/web/scripts/build-client.ts). */
const CORE = ['/fonts/fonts-critical.css', '/fonts/fonts-extended.css', '/tokens.css', '/css/site.css', '/css/praktikum-nav-v26.css', '/css/audit-fixes-20261002.css'];
const CORE_END = ['/css/mobile-fixes.css', '/css/stock.css', '/css/base-layout.css'];

/**
 * Собранные стили сайта — файлы с хешем в имени (core, core-end) и версия
 * шаблонных /css/tpl: те же адреса, что у страниц сайта, поэтому браузер не
 * показывает в предпросмотре устаревшие стили из кеша. Манифест — раз в 30 с.
 */
let assets: { at: number; map: Record<string, string> } | null = null;
async function siteAssets(site: string): Promise<Record<string, string>> {
  if (!assets || Date.now() - assets.at > 30_000) {
    try {
      const res = await fetch(`${site}/assets/manifest.json`, { cache: 'no-store' });
      if (res.ok) assets = { at: Date.now(), map: (await res.json()) as Record<string, string> };
    } catch {
      /* сайт недоступен — общие стили по прямым адресам */
    }
  }
  return assets?.map ?? {};
}

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

  // каскад как на сайте (SiteHead): общие → шаблонные → свои стили страницы → общие «после»
  const built = await siteAssets(site);
  const version = built['tpl-css-version'];
  const before = [...(built['core.css'] ? [built['core.css']] : CORE), ...page.cssTemplates.map((href) => (version ? `${href}?v=${version}` : href))];
  const after = built['core-end.css'] ? [built['core-end.css']] : CORE_END;
  const html = `<!doctype html>
<html lang="ru"${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${escapeAttr(site)}/">
<title>${escapeAttr(page.title || 'Предпросмотр')}</title>
${before.map(link).join('\n')}
${page.inlineStyles.map(styleTag).join('\n')}
${after.map(link).join('\n')}
<style>html:not(.mtpk-live) a{pointer-events:none}</style>
</head>
<body><main>${body}</main></body>
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
});
