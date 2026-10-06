import { DEFAULT_SETTINGS, type SiteSettings } from '@mtpk/content-model';
import type { PageDto, PageListItem, RedirectDto, SiteDataDto } from '@mtpk/shared/contracts';

/**
 * Данные сайта из контент-сервиса. Запросы идут при генерации страницы
 * (ISR): готовый HTML кешируется Next.js и перегенерируется по сигналу
 * контент-сервиса (/api/revalidate) или раз в час.
 */
const CONTENT = process.env.CONTENT_URL ?? 'http://127.0.0.1:4101';

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${CONTENT}${path}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`контент-сервис: ${res.status} ${path}`);
  return (await res.json()) as T;
}

export const getPage = (path: string) => getJson<PageDto>(`/v1/pages/by-path?path=${encodeURIComponent(path)}`);

export async function listPages(): Promise<PageListItem[]> {
  return (await getJson<PageListItem[]>('/v1/pages')) ?? [];
}

export async function listRedirects(): Promise<RedirectDto[]> {
  return (await getJson<RedirectDto[]>('/v1/redirects')) ?? [];
}

/** Настройки сайта (контакты, меню, подвал); контент-сервис недоступен — значения по умолчанию. */
export async function getSettings(): Promise<SiteSettings> {
  try {
    return (await getJson<SiteSettings>('/v1/settings')) ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Данные для блоков: наличие на складе и разделы со сравнением. */
export async function getSiteData(): Promise<SiteDataDto> {
  return (await getJson<SiteDataDto>('/v1/site-data')) ?? { stock: {}, compareSections: [] };
}
