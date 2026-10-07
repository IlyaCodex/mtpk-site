import { md5_12 } from './styles.ts';

/**
 * Скрипты блоков «Скрипт» (TypeScript/JavaScript). Контент-сервис при
 * сохранении страницы собирает исходник в JS и хранит его по хешу исходника;
 * страница подключает файл /js/page/<хеш>.js — как стили, без кода в HTML.
 */
export function scriptHash(source: string): string {
  return md5_12(source.trim());
}

export function scriptUrl(hash: string): string {
  return `/js/page/${hash}.js`;
}
