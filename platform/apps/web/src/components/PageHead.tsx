import type { PageDto } from '@mtpk/shared/contracts';
import { jsonLdHtml } from '@/lib/seo';
import { ASSET_VERSIONS } from '@/lib/site';

/**
 * Головная часть конкретной страницы — то, что [...slug].astro клал в slot="head":
 * preload LCP-картинки, JSON-LD (крошки, FAQ, товар, статья), шаблонные CSS,
 * вынесенные крупные стили и мелкие inline-стили — строго в этом порядке каскада.
 */
export function PageHead({ page }: { page: Pick<PageDto, 'preloadImage' | 'jsonLd' | 'cssTemplates' | 'externalStyles' | 'inlineStyles'> }) {
  return (
    <>
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
    </>
  );
}
