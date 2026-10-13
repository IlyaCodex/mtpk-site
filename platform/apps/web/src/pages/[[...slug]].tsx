import type { GetStaticPaths, GetStaticProps } from 'next';
import { activeNavFor } from '@mtpk/content-kit/page-meta';
import { activeHoliday, nextHolidayChange, type Block } from '@mtpk/content-model';
import { Blocks, buildRenderContext, holidayImageHints, preloadHints } from '@mtpk/ui';
import { CookieConsent } from '@/components/CookieConsent';
import { Viewport } from '@/components/Viewport';
import { Drawer } from '@/components/layout/Drawer';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getHolidays, getPage, getSettings, getSiteData } from '@/lib/content';
import { legacyScripts, pageModules, type SitePageProps } from '@/lib/page-props';
import { slugToPath } from '@/lib/site';

/** Страница уходит в браузер чистым HTML: без React-рантайма и без копии данных. */
export const config = { unstable_runtimeJS: false };

// Страницы генерируются при первом запросе и кешируются (ISR); контент-сервис
// сообщает об изменениях через /api/revalidate. Час — страховка.
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps<SitePageProps> = async ({ params }) => {
  const path = slugToPath(params?.slug as string[] | undefined);
  const home = path === '/';
  const [page, settings, site, holidays] = await Promise.all([getPage(path), getSettings(), getSiteData(), home ? getHolidays() : null]);
  if (!page || page.kind !== 'page') return { notFound: true, revalidate: 60 };
  const blocks = page.blocks as Block[];
  // главная в дни праздника — праздничная обложка (раздел «Праздники»): баннер предзагружается вместо фото обложки
  const now = Date.now();
  const holiday = home && blocks.some((b) => b.type === 'homeHero') ? activeHoliday(holidays, now) : null;
  const preload = holiday ? holidayImageHints(holiday.image) : page.preloadImage ? preloadHints(page.preloadImage, blocks) : null;
  // перегенерировать к ближайшей смене праздника (основной сигнал — от контент-сервиса в ту же минуту)
  const change = home ? nextHolidayChange(holidays, now) : null;
  const revalidate = change ? Math.min(3600, Math.max(15, Math.ceil((change - now) / 1000) + 5)) : 3600;
  return {
    props: {
      path,
      blocks,
      settings,
      site,
      activeNav: activeNavFor(path) ?? null,
      home,
      holiday,
      head: {
        path: page.path,
        title: page.title,
        description: page.description,
        noindex: page.noindex,
        preloadImage: preload?.href ?? page.preloadImage,
        preloadSrcSet: preload?.srcSet ?? null,
        preloadSizes: preload?.sizes ?? null,
        jsonLd: page.jsonLd,
        cssTemplates: page.cssTemplates,
        externalStyles: page.externalStyles,
        inlineStyles: page.inlineStyles,
      },
      modules: pageModules(blocks, holiday),
      legacy: legacyScripts(page.features),
    },
    revalidate,
  };
};

/** Любая страница сайта: шапка, блоки страницы (React-компоненты @mtpk/ui), подвал. */
export default function SitePage({ path, blocks, settings, site, activeNav, holiday }: SitePageProps) {
  return (
    <>
      <Viewport />
      <Header settings={settings} activeNav={activeNav ?? undefined} />
      <main>
        <Blocks blocks={blocks} ctx={buildRenderContext(path, blocks, site, holiday)} />
      </main>
      <Footer settings={settings} />
      <Drawer settings={settings} />
      <CookieConsent />
    </>
  );
}
