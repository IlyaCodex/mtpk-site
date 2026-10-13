import { z } from 'zod';
import { route } from '@/lib/api';
import { env } from '@/lib/env';
import { ServiceError, serviceJson } from '@/lib/services';
import { coreStyles } from '@/lib/site-document';

const input = z.object({ body: z.string() });

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const HEADER_SLOT = /<site-header\b[^>]*>\s*<\/site-header>/i;
const FOOTER_SLOT = /<site-footer\b[^>]*>\s*<\/site-footer>/i;

/** Место общей шапки или подвала сайта в документе — подписью: правятся не здесь. */
const slot = (text: string) =>
  `<div style="padding:16px 20px;background:#0a1c25;color:#d5e6d2;font:600 13px/1.45 system-ui,sans-serif;text-align:center">` +
  `${text}. Пункты меню, контакты и подвал — в разделе «Шапка, меню, контакты»</div>`;

/** Вставка перед первым совпадением (или перед запасной позицией). */
function insertBefore(html: string, re: RegExp, fallback: RegExp, chunk: string): string {
  const m = re.exec(html) ?? fallback.exec(html);
  return m ? html.slice(0, m.index) + chunk + html.slice(m.index) : chunk + html;
}

/**
 * Предпросмотр страницы-документа (Практикум) в редакторе: документ как есть,
 * элементы помечены местом в исходнике (правка щелчком меняет ровно этот кусок),
 * формы — как на сайте. У статьи с местами общей шапки и подвала (<site-header>,
 * <site-footer>) — на них подписи, а общие стили сайта — как на сайте
 * (apps/web/src/lib/site-chrome.tsx): до стилей статьи и после них. Адреса стилей
 * и картинок — от сайта (<base>); скриптов предпросмотр не выполняет (iframe без allow-scripts).
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
  if (HEADER_SLOT.test(html) || FOOTER_SLOT.test(html)) {
    html = html
      .replace(HEADER_SLOT, () => slot('Шапка сайта — общая для всех страниц'))
      .replace(FOOTER_SLOT, () => slot('Подвал и мобильное меню — общие для всех страниц'));
    const { core, coreEnd } = await coreStyles(site);
    const link = (href: string) => `<link rel="stylesheet" href="${escapeAttr(href)}">`;
    html = insertBefore(html, /<link\b[^>]*rel=["']?stylesheet[^>]*>/i, /<\/head>/i, core.map(link).join(''));
    html = insertBefore(html, /<\/head>/i, /<body\b/i, coreEnd.map(link).join(''));
  }
  const extra = `<base href="${escapeAttr(site)}/"><style>html:not(.mtpk-live) a{pointer-events:none}</style>`;
  // сразу после <head ...>; нет <head> — в начало документа
  const head = /<head(?:\s[^>]*)?>/i.exec(html);
  const out = head ? html.slice(0, head.index + head[0].length) + extra + html.slice(head.index + head[0].length) : extra + html;
  return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
});
