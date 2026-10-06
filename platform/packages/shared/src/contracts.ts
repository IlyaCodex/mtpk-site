/**
 * Контракты HTTP API между сервисами и сайтом. Только типы — модуль можно
 * импортировать откуда угодно (в том числе из Next.js) без серверных зависимостей.
 */

/** Страница, готовая к выводу: блоки развёрнуты, комментарии вырезаны. */
export interface PageDto {
  path: string;
  /** page — страница сайта в общем каркасе; document — готовый HTML-документ целиком (Практикум) */
  kind: 'page' | 'document';
  template: string;
  title: string;
  description: string | null;
  noindex: boolean;
  /** Готовый HTML содержимого <main> (для document — весь документ). */
  bodyHtml: string;
  /** Общие шаблонные CSS (/css/tpl/*.css), подключаются <link> в порядке массива. */
  cssTemplates: string[];
  /** Крупные page-специфичные стили, вынесенные во внешние файлы. */
  externalStyles: string[];
  /** Мелкие page-специфичные стили — CSS для inline-блоков <style> (по одному на элемент). */
  inlineStyles: string[];
  /** LCP-картинка: preload с fetchpriority=high. */
  preloadImage: string | null;
  /** JSON-LD (строки JSON) в порядке вывода: BreadcrumbList, FAQPage, Product, Article. */
  jsonLd: string[];
  /**
   * Поведение, которое нужно странице (галерея, фильтр каталога, сравнение…):
   * имена клиентских скриптов — правила PAGE_SCRIPTS из Astro-сборки.
   */
  features: string[];
  searchable: boolean;
  searchWeight: number;
  searchImage: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  lastmodAt: string;
}

export interface PageListItem {
  path: string;
  kind: 'page' | 'document';
  template: string;
  noindex: boolean;
  lastmodAt: string;
}

export interface RedirectDto {
  from: string;
  to: string;
  code: number;
}

/** Элемент /data/stock.json — формат 1:1 со старым build-stock.mjs. */
export interface StockItemDto {
  url: string;
  slug: string;
  title: string;
  category: string;
  image: string | null;
  qty?: number;
  shipping?: string;
  specs?: [string, string][];
  card_html?: string;
  [extra: string]: unknown;
}

export interface SearchHit {
  url: string;
  title: string;
  /** Фрагмент текста с подсветкой <mark>…</mark> (HTML). */
  excerpt: string;
  image: string | null;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchHit[];
}

/** Ответ на заявку — контракт forms.js (receipt = request_id формы). */
export interface LeadResponse {
  ok: boolean;
  message: string;
  receipt?: string;
  delivery?: 'delivered' | 'queued';
}
