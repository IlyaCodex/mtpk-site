import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRawPages, splitSegments, stripHtmlComments, type RawPage } from '@mtpk/content-kit';
import { topLevelElements } from './html-to-jsx.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PLATFORM = path.resolve(here, '../../..');
export const ASTRO = path.resolve(PLATFORM, '../astro');
export const DIST = path.join(ASTRO, 'dist');

let cache: RawPage[] | null = null;
export function rawPages(): RawPage[] {
  cache ??= readRawPages(path.join(ASTRO, 'src', 'raw-pages'));
  return cache;
}

export function distHtml(urlPath: string): string {
  const file = path.join(DIST, ...urlPath.split('/').filter(Boolean), 'index.html');
  return fs.readFileSync(file, 'utf-8');
}

export function mainInner(html: string): string {
  const open = html.indexOf('<main');
  const start = html.indexOf('>', open) + 1;
  const end = html.lastIndexOf('</main>');
  return html.slice(start, end);
}

export interface RenderedBlock {
  name: string;
  html: string;
}

/**
 * Находит в готовой странице dist HTML, который Astro отрисовал на месте
 * маркеров <!--C:имя-->: html-сегменты тела ищутся в <main> как есть,
 * всё между ними — отрисованные блоки (соседние блоки режутся по элементам).
 */
export function renderedBlocks(page: RawPage): RenderedBlock[] {
  const body = stripHtmlComments(page.body, { keepBlockMarkers: true });
  const segments = splitSegments(body);
  const main = mainInner(distHtml(page.path));
  const out: RenderedBlock[] = [];
  let cursor = 0;
  let pending: string[] = [];
  const flush = (chunk: string) => {
    if (!pending.length) return;
    const tops = topLevelElements(chunk);
    if (tops.length !== pending.length) {
      throw new Error(`${page.path}: блоков ${pending.length} (${pending.join(',')}), элементов ${tops.length}`);
    }
    tops.forEach((t, i) => out.push({ name: pending[i], html: chunk.slice(t.start, t.end) }));
    pending = [];
  };
  for (const seg of segments) {
    if (seg.type === 'block') {
      pending.push(seg.name);
      continue;
    }
    // Пробельный сегмент между соседними блоками — не опора для поиска
    // (indexOf нашёл бы перевод строки внутри отрисованного блока).
    if (pending.length && !seg.content.trim()) continue;
    const at = main.indexOf(seg.content, cursor);
    if (at < 0) throw new Error(`${page.path}: html-сегмент не найден в dist`);
    flush(main.slice(cursor, at));
    cursor = at + seg.content.length;
  }
  flush(main.slice(cursor));
  return out;
}
