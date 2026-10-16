/**
 * Версии файлов из public с постоянными адресами — старых скриптов (/js), логотипов (/brand),
 * значков сайта: хеши содержимого. Их считает сборка (scripts/build-client.ts), в код сайта
 * вшивает next.config.ts (env). Файлы здесь не читаются — модуль годится и компонентам страниц (Logo).
 */
const VERSIONS = JSON.parse(process.env.MTPK_STATIC_VERSIONS || '{}') as Record<string, string>;

/**
 * Адрес файла с версией по содержимому (?v=хеш): поменялся файл — у страниц новый адрес,
 * и браузер с шлюзом берут новый файл без чистки кеша. Файла нет в сборке — адрес как есть.
 */
export function versioned(url: string): string {
  const v = VERSIONS[`v:${url.replace(/^\//, '')}`];
  return v ? `${url}?v=${v}` : url;
}

/** Версия сборки сайта — для файлов, содержимое которых сборка не видит (стили и скрипты статей Практикума в S3). */
export const BUILD_VERSION = VERSIONS.build ?? 'dev';
