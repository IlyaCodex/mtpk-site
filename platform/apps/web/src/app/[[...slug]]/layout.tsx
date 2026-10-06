import type { Metadata } from 'next';
import { activeNavFor } from '@mtpk/content-kit/page-meta';
import '../globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Drawer } from '@/components/layout/Drawer';
import { CookieConsent } from '@/components/CookieConsent';
import { SearchModal } from '@/components/SearchModal';
import { Analytics, AnalyticsNoscript } from '@/components/Analytics';
import { PageHead } from '@/components/PageHead';
import { getPage, getSettings } from '@/lib/content';
import { FONTS_CRITICAL_CSS, MOBILE_FIXES_CSS, STOCK_CSS, TOKENS_CSS } from '@/lib/legacy-css';
import { NOT_FOUND_PAGE, ORGANIZATION_SCHEMA, WEBSITE_SCHEMA, jsonLdHtml, pageMetadata } from '@/lib/seo';
import { ASSET_VERSIONS, MANGO_SCRIPT, PAGE_SCRIPT_VERSIONS, slugToPath } from '@/lib/site';

// Страницы рендерятся по первому запросу и кешируются (ISR); контент-сервис
// присылает сигнал на /api/revalidate, когда страница меняется. Час — страховка.
export const revalidate = 3600;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const path = slugToPath((await params).slug);
  const page = await getPage(path);
  return pageMetadata(page ?? NOT_FOUND_PAGE);
}

/**
 * Расширенные начертания шрифтов — асинхронно (T-PERF-10): та же механика, что
 * <link rel=preload onload="this.rel='stylesheet'"> в Astro: файл качается как
 * preload и применяется только после загрузки. От момента применения зависит
 * раскладка элементов с line-height: normal (например, select фильтра каталога).
 */
const FONTS_EXTENDED_JS =
  "(function(){var l=document.createElement('link');l.rel='preload';l.as='style';l.href='/fonts/fonts-extended.css';l.onload=function(){l.onload=null;l.rel='stylesheet';};document.head.appendChild(l);})();";

/**
 * Битрикс24 — сквозная аналитика / call tracker (портал b1785973). Строго перед
 * </body>: проверка «готовности сайта» в кабинете Битрикс ищет код именно там.
 */
const BITRIX_JS = `(function(w,d,u){
      var s=d.createElement('script');s.async=true;s.src=u+'?'+(Date.now()/60000|0);
      var h=d.getElementsByTagName('script')[0];h.parentNode.insertBefore(s,h);
    })(window,document,'https://cdn-ru.bitrix24.ru/b1785973/crm/tag/call.tracker.js');`;

/**
 * Каркас всех страниц (перенос BaseLayout.astro). Порядок элементов <head>
 * повторяет Astro-сборку: от него зависит каскад legacy CSS.
 */
export default async function RootLayout({ children, params }: Params & { children: React.ReactNode }) {
  const path = slugToPath((await params).slug);
  const page = await getPage(path);
  const isPage = page?.kind === 'page';
  const activeNav = isPage ? activeNavFor(path) : undefined;
  const home = isPage && path === '/' ? page : await getPage('/');
  const settings = await getSettings();

  return (
    // suppressHydrationWarning: коллтрекинг Mango ставит data-атрибут на <html> до гидратации
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(ORGANIZATION_SCHEMA) }} />
        {path === '/' && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(WEBSITE_SCHEMA) }} />}
        {/* Лого в шапке — LCP-элемент; основные веса Inter — параллельно с HTML (T-PERF-2) */}
        <link rel="preload" as="image" href="/brand/logo-header-clean.png" fetchPriority="high" />
        <link rel="preload" href="/fonts/inter-400-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-400-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-600-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-600-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
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
        {isPage ? (
          <PageHead page={page} />
        ) : (
          // 404: стили каркаса берутся у главной (как в 404.astro)
          home && <PageHead page={{ ...home, preloadImage: null, jsonLd: [], cssTemplates: [] }} />
        )}
        <style dangerouslySetInnerHTML={{ __html: MOBILE_FIXES_CSS }} />
        <style dangerouslySetInnerHTML={{ __html: STOCK_CSS }} />
        <link rel="stylesheet" href="/css/base-layout.css" />
      </head>
      <body>
        <Header settings={settings} activeNav={activeNav} />
        {children}
        <Footer settings={settings} />
        <Drawer items={settings.drawer} contacts={settings.contacts} />
        <CookieConsent />
        {/* Скрипты для блоков «HTML как есть» (старые формы, каталог запчастей…):
            поведение типизированных блоков встроено в их React-компоненты */}
        {(isPage ? page.features : []).map((name) => (
          <script key={name} src={`/js/${name}.js?v=${PAGE_SCRIPT_VERSIONS[name] ?? '1'}`} defer />
        ))}
        <SearchModal />
        <Analytics />
        <AnalyticsNoscript />
        <script dangerouslySetInnerHTML={{ __html: BITRIX_JS }} />
        {/* Коллтрекинг Mango Office (вместо отключённого B242YA) */}
        <script src={MANGO_SCRIPT} defer />
      </body>
    </html>
  );
}
