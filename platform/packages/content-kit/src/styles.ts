import crypto from 'node:crypto';

/**
 * Page-специфичные стили (meta.inline_styles). Правило T-PERF-4 из
 * [...slug].astro: блоки < 20 000 символов остаются inline, крупные
 * выносятся во внешний файл /css/inline-extracted/inline-<md5:12>.css.
 * Хеш считается тем же способом, что в Astro, поэтому адреса файлов
 * совпадают со старой сборкой (браузерный кеш посетителей остаётся валидным).
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

export function classifyStyleBlock(block: string): StyleBlockRecord {
  if (block.length < INLINE_LIMIT) {
    // inline-блоки адресуем хешем с префиксом, чтобы не пересечься с external
    return { hash: `i${md5_12(block)}`, mode: 'inline', css: block, bytes: Buffer.byteLength(block) };
  }
  let css = block.replace(/^\s*<style[^>]*>/, '').replace(/<\/style>\s*$/, '');
  // Относительные url() ломаются после переноса CSS в /css/inline-extracted/ —
  // переписываем на абсолютные, как это делала сборка.
  css = css.replace(/url\((['"]?)\.\/img\//g, 'url($1/img/');
  css = css.replace(/url\((['"]?)\.\/brand\//g, 'url($1/brand/');
  css = css.replace(/url\((['"]?)\.\.\/img\//g, 'url($1/img/');
  css = css.replace(/url\((['"]?)\.\.\/brand\//g, 'url($1/brand/');
  return { hash: md5_12(css), mode: 'external', css, bytes: Buffer.byteLength(css) };
}

export function externalStyleUrl(hash: string): string {
  return `/css/inline-extracted/inline-${hash}.css`;
}
