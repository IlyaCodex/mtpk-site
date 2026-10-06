import {
  buildPageJsonLd,
  detectPageFeatures,
  externalStyleUrl,
  styleBlockCss,
  htmlToText,
  isSearchable,
  pickSearchImage,
  searchWeight,
  stripHtmlComments,
} from '@mtpk/content-kit';
import { renderPageBody } from '@mtpk/blocks/render';
import type { Page, StyleBlock } from '@mtpk/db';
import type { PageDto } from '@mtpk/shared';

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/**
 * Запись БД → страница для вывода. Делает ровно то, что делал [...slug].astro:
 * развёртка блоков, разделение стилей на внешние/inline, JSON-LD, картинка поиска.
 */
export function renderPage(page: Page, styles: Map<string, StyleBlock>, site: string): PageDto {
  const base = {
    path: page.path,
    kind: page.kind as PageDto['kind'],
    template: page.template,
    title: page.title,
    description: page.description,
    noindex: page.noindex,
    preloadImage: page.preloadImage,
    publishedAt: iso(page.publishedAt),
    modifiedAt: iso(page.modifiedAt),
    lastmodAt: page.lastmodAt.toISOString(),
  };

  if (page.kind === 'document') {
    // Практикум: готовый документ, при сборке у него тоже вырезались комментарии.
    return {
      ...base,
      bodyHtml: stripHtmlComments(page.body),
      cssTemplates: [],
      externalStyles: [],
      inlineStyles: [],
      jsonLd: [],
      features: [],
      searchable: Boolean((page.extraMeta as Record<string, unknown>)?.pagefindBody),
      searchWeight: 1,
      searchImage: null,
    };
  }

  const externalStyles: string[] = [];
  const inline: string[] = [];
  for (const hash of page.styleHashes) {
    const block = styles.get(hash);
    if (!block) continue;
    if (block.mode === 'external') externalStyles.push(externalStyleUrl(block.hash));
    else inline.push(styleBlockCss(block.css));
  }

  return {
    ...base,
    bodyHtml: renderPageBody(page.body),
    cssTemplates: page.cssTemplates,
    externalStyles,
    inlineStyles: inline,
    jsonLd: buildPageJsonLd(
      page.body,
      {
        path: page.path,
        title: page.title,
        description: page.description,
        publishedAt: iso(page.publishedAt),
        modifiedAt: iso(page.modifiedAt),
      },
      site,
    ),
    features: detectPageFeatures(page.body),
    searchable: isSearchable(page.path),
    searchWeight: searchWeight(page.path, page.body),
    searchImage: pickSearchImage(page.body, page.preloadImage),
  };
}

export interface SearchDoc {
  path: string;
  title: string;
  body: string;
  image: string | null;
  weight: number;
}

function stripCrumbs(html: string): string {
  return html
    .replace(/<nav\s+class="(?:breadcrumb|tr-crumbs)[^"]*"[^>]*>[\s\S]*?<\/nav>/g, ' ')
    .replace(/<div\s+class="(?:breadcrumbs|ui-crumb)"[^>]*>[\s\S]*?<\/div>/g, ' ');
}

/** Текст первого <h1> — Pagefind брал заголовок результата именно отсюда. */
function firstH1(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? htmlToText(m[1]) : null;
}

/** Содержимое элемента с data-pagefind-body (у документов Практикума). */
function pagefindRegion(html: string): string {
  const open = html.search(/<[a-z]+[^>]*\bdata-pagefind-body\b[^>]*>/i);
  if (open < 0) return html;
  const tag = html.slice(open + 1).match(/^[a-z]+/i)?.[0] ?? 'main';
  const close = html.lastIndexOf(`</${tag}>`);
  return html.slice(open, close > open ? close : undefined);
}

/**
 * Документ для поискового индекса. Индексируется собственный текст страницы
 * (без повторяющихся на сотнях страниц блоков заявки и преимуществ) — иначе
 * слова из формы находились бы на каждой второй странице.
 */
export function toSearchDoc(page: Page, dto: PageDto): SearchDoc | null {
  if (!dto.searchable || page.noindex || page.status !== 'published') return null;
  // Хлебные крошки в индекс не идут: иначе фрагмент в выдаче начинается с «Главная / Каталог…»
  const source = stripCrumbs(page.kind === 'document' ? pagefindRegion(page.body) : page.body);
  // неразрывный дефис (УИД\u2011376) → обычный: иначе поиск по коду модели не совпадает
  const hyphens = (t: string) => t.replace(/[\u2010\u2011\u2012]/g, '-');
  const title = hyphens(firstH1(source) || page.title.split('|')[0].trim());
  return {
    path: page.path,
    title,
    body: hyphens(htmlToText(source)),
    image: dto.searchImage,
    weight: dto.searchWeight,
  };
}
