import type { GetStaticPaths, GetStaticProps } from 'next';
import { activeNavFor } from '@mtpk/content-kit/page-meta';
import type { Block } from '@mtpk/content-model';
import { Blocks, buildRenderContext, preloadHints } from '@mtpk/ui';
import { CookieConsent } from '@/components/CookieConsent';
import { Viewport } from '@/components/Viewport';
import { Drawer } from '@/components/layout/Drawer';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getPage, getSettings, getSiteData } from '@/lib/content';
import { legacyScripts, pageModules, type SitePageProps } from '@/lib/page-props';
import { slugToPath } from '@/lib/site';

/** Страница уходит в браузер чистым HTML: без React-рантайма и без копии данных. */
export const config = { unstable_runtimeJS: false };

// Страницы генерируются при первом запросе и кешируются (ISR); контент-сервис
// сообщает об изменениях через /api/revalidate. Час — страховка.
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps<SitePageProps> = async ({ params }) => {
  const path = slugToPath(params?.slug as string[] | undefined);
  const [page, settings, site] = await Promise.all([getPage(path), getSettings(), getSiteData()]);
  if (!page || page.kind !== 'page') return { notFound: true, revalidate: 60 };
  const blocks = page.blocks as Block[];
  const preload = page.preloadImage ? preloadHints(page.preloadImage, blocks) : null;
  return {
    props: {
      path,
      blocks,
      settings,
      site,
      activeNav: activeNavFor(path) ?? null,
      home: path === '/',
      head: {
        path: page.path,
        title: page.title,
        description: page.description,
        noindex: page.noindex,
        preloadImage: page.preloadImage,
        preloadSrcSet: preload?.srcSet ?? null,
        preloadSizes: preload?.sizes ?? null,
        jsonLd: page.jsonLd,
        cssTemplates: page.cssTemplates,
        externalStyles: page.externalStyles,
        inlineStyles: page.inlineStyles,
      },
      modules: pageModules(blocks),
      legacy: legacyScripts(page.features),
    },
    revalidate: 3600,
  };
};

/** Любая страница сайта: шапка, блоки страницы (React-компоненты @mtpk/ui), подвал. */
export default function SitePage({ path, blocks, settings, site, activeNav }: SitePageProps) {
  return (
    <>
      <Viewport />
      <Header settings={settings} activeNav={activeNav ?? undefined} />
      <main>
        <Blocks blocks={blocks} ctx={buildRenderContext(path, blocks, site)} />
      </main>
      <Footer settings={settings} />
      <Drawer items={settings.drawer} contacts={settings.contacts} />
      <CookieConsent />
    </>
  );
}
