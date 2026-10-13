import { z } from 'zod';
import { route } from '@/lib/api';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';
import { escapeAttr, siteAssets, siteDocument } from '@/lib/site-document';

const input = z.object({
  holiday: z.unknown(),
  signature: z.string().optional(),
});

type HomePage = { blocks: { type: string }[]; cssTemplates: string[]; inlineStyles: string[] };

/** Модуль эффекта сайта (снег, искры…) текстом: в документ предпросмотра — встроенным скриптом. */
let fxCache: { url: string; js: string } | null = null;
async function effectScript(site: string): Promise<string> {
  const url = (await siteAssets(site))['holiday-fx'];
  if (!url) return '';
  if (fxCache?.url !== url) {
    try {
      const res = await fetch(`${site}${url}`, { cache: 'no-store' });
      if (!res.ok) return '';
      fxCache = { url, js: await res.text() };
    } catch {
      return '';
    }
  }
  return `<script type="module">${fxCache.js.replace(/<\/script/gi, '<\\/script')}</script>`;
}

/**
 * Предпросмотр праздника (раздел «Праздники»): обложка главной в праздничном
 * виде — баннер, поздравление, эффект — как на сайте, ещё до сохранения.
 * Обложка и стили — со страницы «/». Документ для <iframe srcdoc> со
 * скриптом эффекта (iframe без своего адреса: модуль с сайта не подгрузится).
 */
export const POST = route('content', async (req, user) => {
  const { holiday, signature } = input.parse(await req.json());
  const site = env().PUBLIC_SITE_URL.replace(/\/$/, '');
  let body: string;
  let page: HomePage = { blocks: [], cssTemplates: [], inlineStyles: [] };
  let htmlAttrs = '';
  try {
    const look = await serviceJson<{ id: number }>('content', 'pages/lookup?path=%2F', { user });
    page = await serviceJson<HomePage>('content', `pages/${look.id}`, { user });
    const hero = page.blocks.find((b) => b.type === 'homeHero');
    if (!hero) throw new Error('на главной нет блока «Обложка главной»');
    ({ html: body, htmlAttrs = '' } = await serviceJson<{ html: string; htmlAttrs?: string }>('content', 'render', {
      method: 'POST',
      json: { path: '/', blocks: [hero], holiday, signature },
      user,
    }));
  } catch (err) {
    const why = err instanceof ServiceError ? JSON.stringify(err.body).slice(0, 600) : (err as Error).message;
    body = `<div style="padding:24px;font:14px/1.5 system-ui;color:#b42318">Предпросмотр не отрисовался: ${escapeAttr(why)}</div>`;
  }
  const html = await siteDocument({
    site,
    title: 'Праздник — предпросмотр',
    body,
    htmlAttrs,
    cssTemplates: page.cssTemplates,
    inlineStyles: page.inlineStyles,
    tail: await effectScript(site),
  });
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
});
