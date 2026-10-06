/**
 * HTML-сверка всех страниц: новая платформа (Next.js) против итоговой Astro-сборки.
 * Сравнивается то, что видят посетитель и поисковики: заголовок, мета, canonical,
 * JSON-LD, порядок стилей (каскад!), скрипты, шапка/подвал/меню и <main>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, serialize, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

const isEl = (n: Node): n is Element => 'tagName' in n;
const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;

function* walk(nodes: Node[]): Generator<Element> {
  for (const n of nodes) {
    if (!isEl(n)) continue;
    yield n;
    yield* walk(n.childNodes as Node[]);
  }
}

/** Канон DOM: атрибуты по алфавиту, style без лишних пробелов, пробелы схлопнуты. */
function canonNodes(nodes: Node[]) {
  for (const el of walk(nodes)) {
    // служебный span Pagefind (в новой версии поиска не нужен) — выкидываем
    el.childNodes = el.childNodes.filter((c) => !(isEl(c) && c.tagName === 'span' && attr(c, 'data-pagefind-meta') !== undefined));
    for (const a of el.attrs) {
      if (a.name === 'style') {
        a.value = a.value.split(';').map((d) => d.trim()).filter(Boolean).map((d) => d.replace(/\s*:\s*/, ':')).join(';');
      }
    }
    el.attrs = el.attrs.filter((a) => !/^data-astro-cid-/.test(a.name));
    el.attrs.sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
  }
}

function canon(el: Element | undefined): string {
  if (!el) return '';
  canonNodes([el]);
  return serializeOuter(el)
    .replace(/<span data-pagefind-meta[^>]*><\/span>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
}

export interface PageFacts {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  og: string;
  jsonLd: string[];
  styles: string[];
  scripts: string[];
  header: string;
  footer: string;
  drawer: string;
  main: string;
}

/** Факты страницы, по которым сравниваем. */
export function facts(html: string): PageFacts {
  const doc = parse(html);
  const all = [...walk(doc.childNodes as Node[])];
  const head = all.find((e) => e.tagName === 'head')!;
  const body = all.find((e) => e.tagName === 'body')!;
  const meta = (key: string, val: string) => all.find((e) => e.tagName === 'meta' && attr(e, key) === val);
  const headEls = [...walk(head.childNodes as Node[])];

  const jsonLd = all
    .filter((e) => e.tagName === 'script' && attr(e, 'type') === 'application/ld+json')
    .map((e) => {
      const obj = JSON.parse(serialize(e)) as Record<string, unknown>;
      // даты Article: формат ISO может различаться (+05:00 / Z) — сравниваем момент времени
      for (const k of ['datePublished', 'dateModified']) if (typeof obj[k] === 'string') obj[k] = new Date(obj[k] as string).toISOString();
      return JSON.stringify(obj);
    })
    .sort();

  // Порядок каскада: внешние стили и inline-блоки в <head> (служебные Next/шрифты — мимо)
  const styles = headEls
    .filter((e) => (e.tagName === 'link' && attr(e, 'rel') === 'stylesheet') || e.tagName === 'style')
    .map((e) => {
      if (e.tagName === 'style') return `inline:${serialize(e).trim().length}`;
      return (attr(e, 'href') ?? '').replace('/_astro/BaseLayout.CK1KI5ak.css', '/css/base-layout.css');
    })
    .filter((s) => !s.startsWith('/_next/') && s !== '/fonts/fonts-extended.css' && s !== 'inline:0');

  const scripts = all
    .filter((e) => e.tagName === 'script' && attr(e, 'src'))
    .map((e) => attr(e, 'src')!)
    .filter((s) => !s.startsWith('/_next/') && !s.includes('_pagefind'));

  const og = all
    .filter((e) => e.tagName === 'meta' && /^(og:|twitter:)/.test(attr(e, 'property') ?? attr(e, 'name') ?? ''))
    .map((e) => `${attr(e, 'property') ?? attr(e, 'name')}=${attr(e, 'content')}`)
    .sort()
    .join('\n');

  const bodyEls = (body.childNodes as Node[]).filter(isEl);
  return {
    title: (serialize(all.find((e) => e.tagName === 'title')!) ?? '').trim(),
    description: attr(meta('name', 'description') ?? ({ attrs: [] } as unknown as Element), 'content') ?? '',
    canonical: attr(all.find((e) => e.tagName === 'link' && attr(e, 'rel') === 'canonical') ?? ({ attrs: [] } as unknown as Element), 'href') ?? '',
    robots: attr(meta('name', 'robots') ?? ({ attrs: [] } as unknown as Element), 'content') ?? '',
    og,
    jsonLd,
    styles,
    scripts,
    header: canon(bodyEls.find((e) => attr(e, 'class') === 'header-shell')),
    footer: canon(bodyEls.find((e) => e.tagName === 'footer')),
    drawer: canon(bodyEls.find((e) => e.tagName === 'aside')),
    main: canon(bodyEls.find((e) => e.tagName === 'main'))
      .replace(/^<main[^>]*>/, '<main>'),
  };
}

export interface Diff {
  path: string;
  field: keyof PageFacts | 'status';
  old: string;
  new: string;
}

function firstDiff(a: string, b: string): [string, string] {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 60);
  return [a.slice(from, i + 140), b.slice(from, i + 140)];
}

export async function checkHtml(opts: {
  distDir: string;
  newBase: string;
  paths: string[];
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<{ checked: number; diffs: Diff[]; byField: Record<string, number> }> {
  const diffs: Diff[] = [];
  let done = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < opts.paths.length) {
      const p = opts.paths[cursor++];
      const file = path.join(opts.distDir, ...p.split('/').filter(Boolean), 'index.html');
      const oldHtml = fs.readFileSync(file, 'utf8');
      const res = await fetch(`${opts.newBase}${p}`, { redirect: 'manual' });
      if (res.status !== 200) {
        diffs.push({ path: p, field: 'status', old: '200', new: String(res.status) });
      } else {
        const a = facts(oldHtml);
        const b = facts(await res.text());
        for (const k of Object.keys(a) as (keyof PageFacts)[]) {
          const av = Array.isArray(a[k]) ? (a[k] as string[]).join('\n') : (a[k] as string);
          const bv = Array.isArray(b[k]) ? (b[k] as string[]).join('\n') : (b[k] as string);
          if (av !== bv) {
            const [o, n] = firstDiff(av, bv);
            diffs.push({ path: p, field: k, old: o, new: n });
          }
        }
      }
      opts.onProgress?.(++done, opts.paths.length);
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 6 }, worker));
  const byField: Record<string, number> = {};
  for (const d of diffs) byField[d.field] = (byField[d.field] ?? 0) + 1;
  return { checked: opts.paths.length, diffs, byField };
}
