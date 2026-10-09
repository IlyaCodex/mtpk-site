import { walkBlocks, type Block, type SiteSettings } from '@mtpk/content-model';
import type { SiteDataDto } from '@mtpk/shared/contracts';
import type { HeadPage } from '@/components/SiteHead';
import { clientModuleUrl, type ClientModule } from './assets';
import { PAGE_SCRIPT_VERSIONS } from './site';

/**
 * Данные страницы для шаблона документа (_document): <head> и скрипты
 * в конце <body>. В браузер они не передаются — страница уходит чистым HTML.
 */
export interface DocumentProps {
  head: HeadPage;
  home: boolean;
  /** клиентские модули страницы (адреса собранных файлов) */
  modules: string[];
  /** старые скрипты блоков «HTML как есть» */
  legacy: string[];
}

export interface SitePageProps extends DocumentProps {
  path: string;
  blocks: Block[];
  settings: SiteSettings;
  site: SiteDataDto;
  activeNav: string | null;
}

/** Какие клиентские модули нужны странице — по её блокам. */
export function pageModules(blocks: Block[]): string[] {
  const need = new Set<ClientModule>(['site']);
  for (const b of walkBlocks(blocks)) {
    if (b.type === 'productHero' && b.media.photos.length > 1) need.add('gallery');
    if (b.type === 'lightbox') need.add('lightbox');
    if (b.type === 'productSpec') need.add('spec-nav');
    if (b.type === 'catalogList') need.add('catalog-filter');
    if (b.type === 'carousel' && b.slides.length > 1) need.add('carousel');
    if (b.type === 'gallery' && b.zoom && b.photos.length) need.add('lightbox');
    if (b.type === 'stockShowcase') need.add('stock');
    if (b.type === 'stockList') {
      need.add('stock');
      need.add('lightbox');
    }
  }
  return [...need].map((m) => clientModuleUrl(m)).filter((u): u is string => Boolean(u));
}

/** Старые скрипты для блоков «HTML как есть» (решает контент-сервис по их разметке). */
export function legacyScripts(features: string[]): string[] {
  return features.map((name) => `/js/${name}.js?v=${PAGE_SCRIPT_VERSIONS[name] ?? '1'}`);
}
