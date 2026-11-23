/**
 * Фото запчасти — одно, на её странице (`button.product-photo` в HTML-секции; админка — поле «Фото детали»).
 * Карточки этой детали в списках раздела и в «похожих» на других страницах (`a.card-image` со ссылкой на
 * её страницу) показывают его же: сайт подставляет фото со страницы детали при выводе, поэтому правится
 * оно в одном месте. Нет фото — заглушка «Фотография уточняется при подборе», как на странице.
 */
import type { Block } from '@mtpk/content-model';

export interface SparePhoto {
  src: string;
  alt: string;
  width?: string;
  height?: string;
}

/** Заглушка вместо фото — на странице детали (внутри кнопки) и в карточке. */
export const SPARE_PLACEHOLDER = '<div class="empty-image">Фотография<br>уточняется при подборе</div>';

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** Фото со страницы детали: картинка; заглушка — null; блока фото нет (не страница детали) — undefined. */
export function sparePhoto(html: string): SparePhoto | null | undefined {
  const m = html.match(/<button class="product-photo"[^>]*>([\s\S]*?)<\/button>/);
  if (!m) return undefined;
  const img = m[1].match(/<img\b[^>]*>/)?.[0];
  const src = img && attr(img, 'src');
  if (!img || !src) return null;
  const width = attr(img, 'width');
  const height = attr(img, 'height');
  return { src, alt: attr(img, 'alt') ?? '', ...(width && height ? { width, height } : {}) };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Код секций (CSS, скрипт) — не разметка. */
const CODE = new Set(['css', 'code', 'script']);

/** Все строки разметки в блоках (HTML-секции, вложенные контейнеры). */
function mapHtml(v: unknown, fn: (html: string) => string, key?: string): unknown {
  if (typeof v === 'string') return (key && CODE.has(key)) || !v.includes('<') ? v : fn(v);
  if (Array.isArray(v)) return v.map((x) => mapHtml(x, fn));
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapHtml(x, fn, k)]));
  return v;
}

/** Фото детали по блокам её страницы. */
export function sparePhotoOfBlocks(blocks: unknown): SparePhoto | null | undefined {
  let found: SparePhoto | null | undefined;
  mapHtml(blocks, (html) => {
    if (found === undefined) found = sparePhoto(html);
    return html;
  });
  return found;
}

const cardImage = (p: SparePhoto) =>
  `<img src="${p.src}" alt="${p.alt}"${p.width && p.height ? ` width="${p.width}" height="${p.height}"` : ''} loading="lazy" decoding="async">`;

/** Карточки деталей в разметке: картинка — со страницы детали (photos(адрес): фото, null — заглушка, undefined — как есть). */
export function syncSpareCards(html: string, photos: (path: string) => SparePhoto | null | undefined): string {
  if (!html.includes('class="card-image"')) return html;
  return html.replace(/<a class="card-image" href="([^"]+)">([\s\S]*?)<\/a>/g, (all, href: string, inner: string) => {
    const photo = photos(href);
    if (photo === undefined) return all;
    const next = photo ? cardImage(photo) : SPARE_PLACEHOLDER;
    return next === inner ? all : `<a class="card-image" href="${href}">${next}</a>`;
  });
}

/** То же по блокам страницы. */
export function syncSpareCardBlocks(blocks: Block[], photos: (path: string) => SparePhoto | null | undefined): Block[] {
  return mapHtml(blocks, (html) => syncSpareCards(html, photos)) as Block[];
}

/** Блоки, где есть карточки деталей. */
export const hasSpareCards = (blocks: unknown) => JSON.stringify(blocks).includes('class=\\"card-image\\"');
