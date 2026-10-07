import crypto from 'node:crypto';

/**
 * Стили страниц (бывший meta.inline_styles и <style> в теле страниц).
 * Все они отдаются внешними файлами /css/inline-extracted/inline-<хеш>.css —
 * в исходном коде страниц <style> нет, а файлы кешируются браузером.
 * Блоки от 20 000 символов адресуются хешем содержимого, мелкие — хешем
 * с префиксом «i».
 */
export const INLINE_LIMIT = 20000;

export interface StyleBlockRecord {
  hash: string;
  mode: 'inline' | 'external';
  css: string;
  bytes: number;
}

export function md5_12(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
}

/**
 * Относительные url() ломаются после переноса CSS в /css/inline-extracted/ —
 * переписываем на абсолютные, как это делала сборка.
 */
function absolutizeUrls(css: string): string {
  return css
    .replace(/url\((['"]?)\.\/img\//g, 'url($1/img/')
    .replace(/url\((['"]?)\.\/brand\//g, 'url($1/brand/')
    .replace(/url\((['"]?)\.\.\/img\//g, 'url($1/img/')
    .replace(/url\((['"]?)\.\.\/brand\//g, 'url($1/brand/');
}

/** Содержимое <style>…</style> без самого тега. */
export function styleBlockCssText(block: string): string {
  return block.replace(/^\s*<style[^>]*>/, '').replace(/<\/style>\s*$/, '');
}

export function classifyStyleBlock(block: string): StyleBlockRecord {
  if (block.length < INLINE_LIMIT) {
    // мелкие блоки адресуем хешем с префиксом, чтобы не пересечься с крупными
    return { hash: `i${md5_12(block)}`, mode: 'inline', css: block, bytes: Buffer.byteLength(block) };
  }
  const css = absolutizeUrls(styleBlockCssText(block));
  return { hash: md5_12(css), mode: 'external', css, bytes: Buffer.byteLength(css) };
}

/**
 * CSS блока «Стили» в содержимом страницы → файл: страница подключает его
 * ссылкой, а не вставляет <style> в свой код.
 */
export function cssFileRecord(css: string): StyleBlockRecord {
  const clean = absolutizeUrls(css.trim());
  return { hash: md5_12(clean), mode: 'external', css: clean, bytes: Buffer.byteLength(clean) };
}

/** Текст CSS-файла для записи любого вида (у мелких блоков хранится вместе с тегом <style>). */
export function styleFileCss(record: { mode: string; css: string }): string {
  return record.mode === 'external' ? record.css : absolutizeUrls(styleBlockCssText(record.css));
}

export function externalStyleUrl(hash: string): string {
  return `/css/inline-extracted/inline-${hash}.css`;
}
