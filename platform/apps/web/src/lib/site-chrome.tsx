import { renderToStaticMarkup } from 'react-dom/server';
import { buttonDesignHtml } from '@mtpk/content-kit/design';
import { activeNavFor } from '@mtpk/content-kit/page-meta';
import type { SiteSettings } from '@mtpk/content-model';
import { CookieConsent } from '@/components/CookieConsent';
import { CoreAssets } from '@/components/SiteHead';
import { SiteScripts } from '@/components/SiteScripts';
import { Drawer } from '@/components/layout/Drawer';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { clientModuleUrl } from './assets';

/** Места в документе под общие шапку и подвал сайта. */
const HEADER_SLOT = /<site-header\b[^>]*>\s*<\/site-header>/i;
const FOOTER_SLOT = /<site-footer\b[^>]*>\s*<\/site-footer>/i;

/** Документ (статья Практикума) с местами <site-header>/<site-footer> — в общем каркасе сайта. */
export const hasSiteChrome = (html: string) => HEADER_SLOT.test(html) || FOOTER_SLOT.test(html);

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Вставка перед первым совпадением (или перед запасной позицией). */
function insertBefore(html: string, re: RegExp, fallback: RegExp, chunk: string): string {
  const m = re.exec(html) ?? fallback.exec(html);
  return m ? html.slice(0, m.index) + chunk + html.slice(m.index) : chunk + html;
}

/**
 * Статья Практикума — целый HTML-документ своей вёрстки — в том же каркасе,
 * что все страницы сайта: на месте <site-header></site-header> — шапка
 * (компонент Header, без переключателя темы: статьи всегда светлые), на месте
 * <site-footer></site-footer> — подвал, мобильное меню и плашка cookie; в <head> —
 * общие стили до стилей статьи (core.css) и после них (core-end.css); в конце
 * <body> — общий модуль сайта и счётчики (SiteScripts); на <html> — оформление
 * кнопок из настроек. Пункты меню, контакты и подвал правятся в админке
 * «Шапка, меню, контакты» — и сразу меняются везде.
 */
export function withSiteChrome(html: string, settings: SiteSettings, path: string): string {
  if (!hasSiteChrome(html)) return html;
  const site = clientModuleUrl('site');
  const modules = site ? [site] : [];
  const coreEnd = clientModuleUrl('core-end.css');

  const header = renderToStaticMarkup(<Header settings={settings} activeNav={activeNavFor(path)} themeToggle={false} />);
  const footer = renderToStaticMarkup(
    <>
      <Footer settings={settings} />
      <Drawer settings={settings} />
      <CookieConsent />
    </>,
  );
  const scripts = renderToStaticMarkup(<SiteScripts modules={modules} legacy={[]} />);
  const head = renderToStaticMarkup(<CoreAssets modules={modules} />);

  let out = html.replace(HEADER_SLOT, () => header).replace(FOOTER_SLOT, () => footer);
  // общие стили — до стилей статьи, «после» — последними, как у страниц сайта (SiteHead)
  out = insertBefore(out, /<link\b[^>]*rel=["']?stylesheet[^>]*>/i, /<\/head>/i, head);
  if (coreEnd) out = insertBefore(out, /<\/head>/i, /<body\b/i, `<link rel="stylesheet" href="${coreEnd}">`);
  out = insertBefore(out, /<\/body>/i, /$/, scripts);

  // оформление кнопок из настроек сайта — атрибутами и переменными на <html> (как в _document)
  const design = buttonDesignHtml(settings.design);
  const attrs = Object.keys(design.attrs).map((k) => ` ${k}`).join('');
  const vars = Object.entries(design.vars).map(([k, v]) => `${k}:${v}`).join(';');
  if (attrs || vars) out = out.replace(/<html\b([^>]*)>/i, (_m, rest: string) => `<html${rest}${attrs}${vars ? ` style="${escapeAttr(vars)}"` : ''}>`);
  return out;
}
