import type { PageDto } from '@mtpk/shared/contracts';
import { jsonLdHtml } from './seo';
import { SITE } from './site';

const ARTICLE = new Set(['Article', 'NewsArticle', 'BlogPosting', 'TechArticle']);
const COMPANY = { '@type': 'Organization', name: 'УралИндуктор', url: `${SITE}/` };

/**
 * Разметка статьи в документах Практикума вписана в их HTML вручную (со старого сайта) и неполная:
 * у одних нет автора, у других дат. Яндекс и Google советуют author, datePublished и dateModified —
 * недостающее дописывается из данных страницы: даты — из базы (публикация не позже правки,
 * дата правки из самого документа — приоритетнее), автор и издатель — компания.
 */
export function completeArticleLd(html: string, page: Pick<PageDto, 'publishedAt' | 'modifiedAt' | 'lastmodAt'>): string {
  return html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi, (whole, open: string, json: string, close: string) => {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      return whole;
    }
    const root = data as Record<string, unknown>;
    const nodes = (Array.isArray(data) ? data : ((root['@graph'] as unknown[]) ?? [data])) as Record<string, unknown>[];
    let changed = false;
    for (const node of nodes) {
      const types = ([] as string[]).concat((node['@type'] as string | string[]) ?? []);
      if (!types.some((t) => ARTICLE.has(t))) continue;
      const modified = (node.dateModified as string | undefined) ?? page.modifiedAt ?? page.lastmodAt;
      if (!node.datePublished && page.publishedAt) {
        node.datePublished = modified && modified < page.publishedAt ? modified : page.publishedAt;
        changed = true;
      }
      if (!node.dateModified && modified) {
        node.dateModified = modified;
        changed = true;
      }
      if (!node.author) {
        node.author = COMPANY;
        changed = true;
      }
      if (!node.publisher) {
        node.publisher = COMPANY;
        changed = true;
      }
    }
    return changed ? `${open}${jsonLdHtml(data as object)}${close}` : whole;
  });
}
