import type { GetStaticProps } from 'next';
import type { SiteSettings } from '@mtpk/content-model';
import { CookieConsent } from '@/components/CookieConsent';
import { Viewport } from '@/components/Viewport';
import { Drawer } from '@/components/layout/Drawer';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getPage, getSettings } from '@/lib/content';
import { pageModules, type DocumentProps } from '@/lib/page-props';
import { NOT_FOUND_PAGE } from '@/lib/seo';

export const config = { unstable_runtimeJS: false };

type Props = DocumentProps & { settings: SiteSettings };

/** Стили страницы 404 — на токенах дизайн-системы (tokens.css). */
const CSS = `.nf{background:var(--surface-page);padding:clamp(56px,12vw,140px) 0}
.nf .container{max-width:560px;text-align:center}
.nf__code{font-family:var(--font-display);font-size:clamp(96px,20vw,200px);line-height:1;font-weight:800;letter-spacing:-.04em;color:var(--teal-600);opacity:.14}
.nf__title{margin:clamp(4px,1.5vw,12px) 0 0;font-family:var(--font-display);font-size:clamp(24px,4.5vw,38px);line-height:1.1;font-weight:700;color:var(--text-primary)}
.nf__text{margin:14px auto 0;max-width:44ch;font-size:var(--fs-lead,18px);line-height:1.5;color:var(--text-secondary)}
.nf__actions{margin-top:clamp(24px,4vw,36px);display:flex;flex-wrap:wrap;justify-content:center;gap:var(--sp-4,16px)}
.nf__actions .btn{cursor:pointer}`;

// Каркас страницы 404 — стили главной (как в 404.astro), без её LCP-картинки и разметки.
export const getStaticProps: GetStaticProps<Props> = async () => {
  const [home, settings] = await Promise.all([getPage('/').catch(() => null), getSettings()]);
  return {
    props: {
      settings,
      home: false,
      head: {
        ...NOT_FOUND_PAGE,
        preloadImage: null,
        jsonLd: [],
        cssTemplates: [],
        externalStyles: home?.externalStyles ?? [],
        inlineStyles: [...(home?.inlineStyles ?? []), CSS],
      },
      modules: pageModules([]),
      legacy: [],
    },
    revalidate: 3600,
  };
};

export default function NotFound({ settings }: Props) {
  return (
    <>
      <Viewport />
      <Header settings={settings} />
      <main>
        <section className="nf">
          <div className="container">
            <div className="nf__code">404</div>
            <h1 className="nf__title">{'Страница не\u00A0найдена'}</h1>
            <p className="nf__text">{'Возможно, адрес изменился или\u00A0страница была перемещена.'}</p>
            <div className="nf__actions">
              <a href="/" className="btn btn--primary">
                {'На\u00A0главную '}
                <span className="btn__arrow">→</span>
              </a>
              <button type="button" className="btn btn--secondary" data-search-open="">
                {'Поиск по\u00A0сайту'}
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
      <Drawer items={settings.drawer} contacts={settings.contacts} />
      <CookieConsent />
    </>
  );
}
