import type { Metadata } from 'next';
import type { PageDto } from '@mtpk/shared/contracts';
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE } from './site';

/** JSON-LD Organization — единое описание компании (SEO-T3). */
export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'УралИндуктор',
  legalName: 'ООО «МТПК»',
  alternateName: 'МТПК-УралИндуктор',
  url: SITE,
  logo: {
    '@type': 'ImageObject',
    '@id': `${SITE}/brand/logo-color.png`,
    url: `${SITE}/brand/logo-color.png`,
    width: 512,
    height: 512,
  },
  image: `${SITE}/og/default.jpg`,
  description:
    'Производство индукционных плавильных печей, дробемётных установок, чиллеров и градирен, сталеразливочных ковшей и оборудования для литейных производств.',
  telephone: ['+7-800-351-34-01', '+7-351-211-65-97'],
  email: 'info@uralinduktor.ru',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'ул. Уральских Добровольцев, стр. 1В',
    addressLocality: 'Миасс',
    addressRegion: 'Челябинская область',
    postalCode: '456318',
    addressCountry: 'RU',
  },
  areaServed: ['Россия', 'Казахстан', 'Беларусь', 'Узбекистан', 'Кыргызстан', 'Таджикистан', 'Армения'].map((name) => ({
    '@type': 'Country',
    name,
  })),
  sameAs: ['https://t.me/uralinduktor', 'https://max.ru/uralinduktor'],
};

/** JSON-LD WebSite с поиском по сайту — только на главной. */
export const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  url: SITE,
  name: 'УралИндуктор · МТПК',
  description:
    'Производство индукционных плавильных печей, дробемётных установок, чиллеров и градирен, сталеразливочных ковшей и оборудования для литейных производств.',
  publisher: { '@id': `${SITE}/#organization` },
  inLanguage: 'ru-RU',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?q={search_term_string}` },
    'query-input': { '@type': 'PropertyValueSpecification', valueRequired: true, valueName: 'search_term_string' },
  },
};

/** JSON для <script type="application/ld+json">: «</» экранируется, чтобы не закрыть тег. */
export function jsonLdHtml(json: string | object): string {
  const s = typeof json === 'string' ? json : JSON.stringify(json);
  return s.replace(/<\//g, '<\\/');
}

const VERIFICATION: Metadata['verification'] = {
  // Google Search Console (2026-08-28) и Яндекс.Вебмастер — тот же код, что в /yandex_*.html
  google: 'klj1lj9utoieH9ZljmhDYykW6XSM3G7dtdVklWGJQw4',
  yandex: '5cf3197708e8d0e7',
};

const ICONS: Metadata['icons'] = { icon: [{ url: '/brand/favicon-original.ico', type: 'image/x-icon' }] };

/** Метаданные страницы: title, description, canonical, robots, Open Graph, Twitter (SEO-T1/T2). */
export function pageMetadata(page: Pick<PageDto, 'path' | 'title' | 'description' | 'noindex'>): Metadata {
  const canonical = `${SITE}${page.path}`;
  const description = page.description ?? undefined;
  const ogDescription = page.description ?? DEFAULT_DESCRIPTION;
  const image = `${SITE}${DEFAULT_OG_IMAGE}`;
  return {
    metadataBase: new URL(SITE),
    title: page.title,
    description,
    alternates: { canonical },
    robots: page.noindex ? { index: false, follow: true } : undefined,
    verification: VERIFICATION,
    icons: ICONS,
    openGraph: {
      type: 'website',
      url: canonical,
      title: page.title,
      description: ogDescription,
      images: [{ url: image, width: 1200, height: 630 }],
      siteName: 'УралИндуктор · МТПК',
      locale: 'ru_RU',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: ogDescription,
      images: [image],
    },
  };
}

export const NOT_FOUND_PAGE = {
  path: '/404/',
  title: 'Страница не найдена — УралИндуктор',
  description:
    'Запрошенная страница не найдена. Вернитесь на главную сайта УралИндуктор / МТПК или воспользуйтесь поиском.',
  noindex: false,
};
