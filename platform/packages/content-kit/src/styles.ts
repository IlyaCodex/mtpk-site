import crypto from 'node:crypto';
import { darkVars } from './dark.ts';
import { responsiveHeroCss } from './hero-css.ts';

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

/**
 * Образец стилей со всеми случаями обработки при отдаче (контент-сервис, /v1/styles): относительные
 * адреса, копии фото обложек (hero-css.ts), тёмная тема (dark.ts) — свои переменные (и в селекторах
 * через запятую), var() с запасным значением, токены палитры, hex, rgb(), имена цветов, градиенты,
 * рамки, @media, комментарии и строки.
 */
const PROBE = `
:root{--ink:#1c3038;--line:rgba(0,0,0,.12);--paper:#fff}
.card,.panel:is(.a,.b){--accent:#2c6985;--edge:#e5e5e5}
.hero__image{background-image:url(./img/probe/hero.jpg)}
.cat-hero__image{background:#0b2530 url("/img/probe/cat.png?v=1") center/cover no-repeat}
.a{color:#18181b;background:#ffffff;border:1px solid #e5e5e5;outline:2px solid rgba(255,255,255,.6)}
.b{background:linear-gradient(180deg,#f8fafc 0%,rgb(238 242 247) 100%);fill:black;stroke:#4fab3a}
.c{color:var(--ink);background:var(--paper);border-color:var(--line,#ddd);background-color:var(--neutral-0)}
.card a{color:var(--accent);border-bottom:1px solid var(--edge)}
@media (max-width:600px){.d{background-color:white;caret-color:#2c6985;text-decoration-color:#a1a1aa}}
.e::after{/* #fff */content:"#fff;color:#000";box-shadow:0 2px 8px rgba(0,0,0,.08);column-rule-color:#d4d4d8}
`;

let revision: string | undefined;

/**
 * Ревизия обработки стилей страниц — отпечаток её результата на образце (PROBE). Стоит в адресах
 * стилей страниц (?r=), а они кешируются навсегда: правка dark.ts или hero-css.ts меняет адреса
 * сама, и браузеры берут новые стили без чистки кеша. Её же ставит медиасервис в ETag стилей
 * статей Практикума.
 */
export function stylesRevision(): string {
  revision ??= md5_12(responsiveHeroCss(darkVars(absolutizeUrls(PROBE), { ownVars: true }))).slice(0, 8);
  return revision;
}

/** Адрес файла стилей страницы: имя — хеш его CSS, ?r= — ревизия обработки при отдаче (кеш навсегда). */
export function externalStyleUrl(hash: string): string {
  return `/css/inline-extracted/inline-${hash}.css?r=${stylesRevision()}`;
}
