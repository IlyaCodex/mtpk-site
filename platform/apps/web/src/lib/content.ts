import { cache } from 'react';
import { DEFAULT_SETTINGS, type SiteSettings } from '@mtpk/content-model';
import type { PageDto, PageListItem, RedirectDto, SiteDataDto } from '@mtpk/shared/contracts';

const CONTENT = process.env.CONTENT_URL ?? 'http://127.0.0.1:4101';

async function getJson<T>(url: string, tags: string[]): Promise<T | null> {
  const res = await fetch(url, { next: { tags } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`контент-сервис: ${res.status} ${url}`);
  return (await res.json()) as T;
}

/**
 * Страница по пути. React cache — один запрос на рендер (страницу берут и
 * layout, и page, и generateMetadata).
 */
export const getPage = cache(async (path: string): Promise<PageDto | null> => {
  return getJson<PageDto>(`${CONTENT}/v1/pages/by-path?path=${encodeURIComponent(path)}`, ['pages', `page:${path}`]);
});

export async function listPages(): Promise<PageListItem[]> {
  return (await getJson<PageListItem[]>(`${CONTENT}/v1/pages`, ['pages'])) ?? [];
}

export async function listRedirects(): Promise<RedirectDto[]> {
  return (await getJson<RedirectDto[]>(`${CONTENT}/v1/redirects`, ['redirects'])) ?? [];
}

/** Настройки сайта (контакты, меню, подвал); контент-сервис недоступен — значения по умолчанию. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return (await getJson<SiteSettings>(`${CONTENT}/v1/settings`, ['pages', 'settings'])) ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

/** Данные для блоков: наличие на складе и разделы со сравнением. */
export const getSiteData = cache(async (): Promise<SiteDataDto> => {
  return (await getJson<SiteDataDto>(`${CONTENT}/v1/site-data`, ['pages', 'site-data'])) ?? { stock: {}, compareSections: [] };
});
