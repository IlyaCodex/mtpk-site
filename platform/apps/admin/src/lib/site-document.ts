/**
 * HTML-документ предпросмотра (<iframe srcdoc>) со стилями сайта в том же
 * порядке каскада, что у его страниц (SiteHead): общие → шаблонные → свои
 * стили страницы → общие «после». Общий для предпросмотра страниц и
 * праздничной обложки главной.
 */
import { env } from './env';

export const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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
export async function siteAssets(site: string): Promise<Record<string, string>> {
  if (!assets || Date.now() - assets.at > 30_000) {
    try {
      // с сервера — по внутреннему адресу сайта (на сервере http://web:3000), а не через интернет
      const res = await fetch(`${env().WEB_URL || site}/assets/manifest.json`, { cache: 'no-store' });
      if (res.ok) assets = { at: Date.now(), map: (await res.json()) as Record<string, string> };
    } catch {
      /* сайт недоступен — общие стили по прямым адресам */
    }
  }
  return assets?.map ?? {};
}

/** Общие стили сайта: до стилей страницы (core) и после них (core-end) — собранные файлы или исходные по прямым адресам. */
export async function coreStyles(site: string): Promise<{ core: string[]; coreEnd: string[] }> {
  const built = await siteAssets(site);
  return { core: built['core.css'] ? [built['core.css']] : CORE, coreEnd: built['core-end.css'] ? [built['core-end.css']] : CORE_END };
}

export async function siteDocument(o: {
  site: string;
  title: string;
  body: string;
  htmlAttrs?: string;
  cssTemplates?: string[];
  inlineStyles?: string[];
  /** в конец <body> (скрипт предпросмотра) */
  tail?: string;
}): Promise<string> {
  const built = await siteAssets(o.site);
  const version = built['tpl-css-version'];
  const before = [...(built['core.css'] ? [built['core.css']] : CORE), ...(o.cssTemplates ?? []).map((href) => (version ? `${href}?v=${version}` : href))];
  const after = built['core-end.css'] ? [built['core-end.css']] : CORE_END;
  return `<!doctype html>
<html lang="ru"${o.htmlAttrs ?? ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${escapeAttr(o.site)}/">
<title>${escapeAttr(o.title || 'Предпросмотр')}</title>
${before.map(link).join('\n')}
${(o.inlineStyles ?? []).map(styleTag).join('\n')}
${after.map(link).join('\n')}
<style>html:not(.mtpk-live) a{pointer-events:none}:root{--site-header-h:0px}</style>
</head>
<body><main>${o.body}</main>${o.tail ?? ''}</body>
</html>`;
}
