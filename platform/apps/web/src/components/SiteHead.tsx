import type { PageDto } from '@mtpk/shared/contracts';
import { clientModuleUrl, templateCssUrl } from '@/lib/assets';
import { jsonLdHtml, ORGANIZATION_SCHEMA, WEBSITE_SCHEMA } from '@/lib/seo';
import { ASSET_VERSIONS, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE } from '@/lib/site';
import { THEME_INIT } from '@/lib/theme';

export type HeadPage = Pick<
  PageDto,
  'path' | 'title' | 'description' | 'noindex' | 'preloadImage' | 'jsonLd' | 'cssTemplates' | 'externalStyles' | 'inlineStyles'
> & {
  /** srcset/sizes предзагружаемой картинки — те же, что у неё на странице */
  preloadSrcSet?: string | null;
  preloadSizes?: string | null;
};

/**
 * <head> страницы. Все стили — внешние файлы (кешируются браузером, в коде
 * страницы <style> нет). Порядок — каскад прежнего сайта: общее ядро
 * (core.css) → шаблонные стили страницы → её собственные → мобильные правки
 * и компоненты (core-end.css).
 */
export function SiteHead({ page, home = false, modules = [] }: { page: HeadPage; home?: boolean; modules?: string[] }) {
  const canonical = `${SITE}${page.path}`;
  const ogDescription = page.description ?? DEFAULT_DESCRIPTION;
  const image = `${SITE}${DEFAULT_OG_IMAGE}`;
  const core = clientModuleUrl('core.css');
  const coreEnd = clientModuleUrl('core-end.css');
  return (
    <>
      {/* тёмная тема — до стилей, чтобы страница не мигнула светлой (lib/theme.ts) */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
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
      {core && <link rel="stylesheet" href={core} />}
      {page.preloadImage && (
        <link
          rel="preload"
          as="image"
          href={page.preloadImage}
          imageSrcSet={page.preloadSrcSet ?? undefined}
          imageSizes={page.preloadSizes ?? undefined}
          fetchPriority="high"
        />
      )}
      {page.jsonLd.map((json, i) => (
        <script key={`ld${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(json) }} />
      ))}
      {page.cssTemplates.map((href) => (
        <link key={href} rel="stylesheet" href={templateCssUrl(href, ASSET_VERSIONS.tplCss)} />
      ))}
      {page.externalStyles.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {coreEnd && <link rel="stylesheet" href={coreEnd} />}
    </>
  );
}
