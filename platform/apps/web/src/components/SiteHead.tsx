import type { PageDto } from '@mtpk/shared/contracts';
import { FONTS_CRITICAL_CSS, MOBILE_FIXES_CSS, STOCK_CSS, TOKENS_CSS } from '@/lib/legacy-css';
import { jsonLdHtml, ORGANIZATION_SCHEMA, WEBSITE_SCHEMA } from '@/lib/seo';
import { ASSET_VERSIONS, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE } from '@/lib/site';

export type HeadPage = Pick<
  PageDto,
  'path' | 'title' | 'description' | 'noindex' | 'preloadImage' | 'jsonLd' | 'cssTemplates' | 'externalStyles' | 'inlineStyles'
>;

/**
 * Расширенные начертания шрифтов — асинхронно (T-PERF-10): файл качается как
 * preload и применяется только после загрузки.
 */
const FONTS_EXTENDED_JS =
  "(function(){var l=document.createElement('link');l.rel='preload';l.as='style';l.href='/fonts/fonts-extended.css';l.onload=function(){l.onload=null;l.rel='stylesheet';};document.head.appendChild(l);})();";

/**
 * <head> страницы. Порядок стилей повторяет прежний сайт — от него зависит
 * каскад: ядро (site.css) → шаблонные стили страницы → её собственные →
 * мобильные правки. Мелкий критический CSS встроен, крупный — файлами.
 */
export function SiteHead({ page, home = false, modules = [] }: { page: HeadPage; home?: boolean; modules?: string[] }) {
  const canonical = `${SITE}${page.path}`;
  const ogDescription = page.description ?? DEFAULT_DESCRIPTION;
  const image = `${SITE}${DEFAULT_OG_IMAGE}`;
  return (
    <>
      <title>{page.title}</title>
      {page.description && <meta name="description" content={page.description} />}
      <link rel="canonical" href={canonical} />
      {page.noindex && <meta name="robots" content="noindex, follow" />}
      {/* Google Search Console и Яндекс.Вебмастер */}
      <meta name="google-site-verification" content="klj1lj9utoieH9ZljmhDYykW6XSM3G7dtdVklWGJQw4" />
      <meta name="yandex-verification" content="5cf3197708e8d0e7" />
      <meta property="og:title" content={page.title} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="УралИндуктор · МТПК" />
      <meta property="og:locale" content="ru_RU" />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={page.title} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={image} />
      <link rel="icon" href="/brand/favicon-original.ico" type="image/x-icon" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(ORGANIZATION_SCHEMA) }} />
      {home && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(WEBSITE_SCHEMA) }} />}
      {/* Лого в шапке — LCP-элемент; основные веса Inter — параллельно с HTML (T-PERF-2) */}
      <link rel="preload" as="image" href="/brand/logo-header-clean.png" fetchPriority="high" />
      <link rel="preload" href="/fonts/inter-400-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/fonts/inter-400-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/fonts/inter-600-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/fonts/inter-600-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      {/* модули страницы качаются параллельно со стилями, выполняются после разбора HTML */}
      {modules.map((src) => (
        <link key={src} rel="modulepreload" href={src} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: FONTS_CRITICAL_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: TOKENS_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: FONTS_EXTENDED_JS }} />
      <noscript>
        <link rel="stylesheet" href="/fonts/fonts-extended.css" />
      </noscript>
      {/* Общее CSS-ядро до стилей страницы: дельты страницы переопределяют ядро */}
      <link rel="stylesheet" href={`/css/site.css?v=${ASSET_VERSIONS.siteCss}`} />
      <link rel="stylesheet" href={`/css/praktikum-nav-v26.css?v=${ASSET_VERSIONS.praktikumNavCss}`} />
      <link rel="stylesheet" href={`/css/audit-fixes-20261002.css?v=${ASSET_VERSIONS.auditFixesCss}`} />
      {page.preloadImage && <link rel="preload" as="image" href={page.preloadImage} fetchPriority="high" />}
      {page.jsonLd.map((json, i) => (
        <script key={`ld${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(json) }} />
      ))}
      {page.cssTemplates.map((href) => (
        <link key={href} rel="stylesheet" href={`${href}?v=${ASSET_VERSIONS.tplCss}`} />
      ))}
      {page.externalStyles.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {page.inlineStyles.map((css, i) => (
        <style key={`st${i}`} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: MOBILE_FIXES_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: STOCK_CSS }} />
      <link rel="stylesheet" href="/css/base-layout.css" />
    </>
  );
}
