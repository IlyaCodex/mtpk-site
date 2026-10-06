import fs from 'node:fs';
import path from 'node:path';

/**
 * Чтение исходников Astro-проекта (src/raw-pages/<url>/{body.html,meta.json}).
 * Используется импортёром и сверочными тестами.
 */

export interface RawMeta {
  title?: string;
  description?: string;
  inline_styles?: string[];
  css_templates?: string[];
  preload_image?: string;
  noindex?: boolean;
  [key: string]: unknown;
}

export interface RawPage {
  /** '/products/x/' */
  path: string;
  /** 'products/x/body.html' — относительный путь файла, ключ для дат из git */
  relBody: string;
  relMeta: string;
  body: string;
  meta: RawMeta;
  metaRaw: string;
}

/** Рекурсивный обход в порядке readdirSync (как getStaticPaths в Astro). */
export function readRawPages(rawRoot: string): RawPage[] {
  const out: RawPage[] = [];
  const walk = (dir: string, rel: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel ? `${rel}/${entry.name}` : entry.name);
      } else if (entry.name === 'body.html') {
        const body = fs.readFileSync(full, 'utf-8');
        const metaPath = path.join(dir, 'meta.json');
        let meta: RawMeta = { title: '', description: '', inline_styles: [] };
        let metaRaw = '';
        if (fs.existsSync(metaPath)) {
          metaRaw = fs.readFileSync(metaPath, 'utf-8');
          try {
            meta = JSON.parse(metaRaw) as RawMeta;
          } catch {
            /* как в Astro: битый meta.json → значения по умолчанию */
          }
        }
        out.push({
          path: rel ? `/${rel}/` : '/',
          relBody: rel ? `${rel}/body.html` : 'body.html',
          relMeta: rel ? `${rel}/meta.json` : 'meta.json',
          body,
          meta,
          metaRaw,
        });
      }
    }
  };
  walk(rawRoot, '');
  return out;
}

/**
 * Даты из git по исходникам raw-pages: для каждого файла — первый и последний
 * коммит. Один проход git log на всё дерево (как в astro.config.mjs).
 */
export function readGitDates(
  gitLog: string,
  prefix = 'astro/src/raw-pages/',
): Map<string, { first: string; last: string }> {
  const map = new Map<string, { first: string; last: string }>();
  let cur: string | null = null;
  for (const line of gitLog.split(/\r?\n/)) {
    if (line.startsWith('C:')) {
      cur = line.slice(2);
      continue;
    }
    if (!line || !cur || !line.startsWith(prefix)) continue;
    const rel = line.slice(prefix.length);
    const prev = map.get(rel);
    // лог идёт от новых коммитов к старым
    if (prev) prev.first = cur;
    else map.set(rel, { first: cur, last: cur });
  }
  return map;
}
