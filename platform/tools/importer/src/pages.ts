import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  readRawPages,
  readGitDates,
  classifyStyleBlock,
  detectTemplate,
  type RawPage,
} from '@mtpk/content-kit';
import { pages, styleBlocks, sql, inArray, type Db, type NewPage } from '@mtpk/db';
import type { Logger } from '@mtpk/shared';
import { htmlToBlocks, newReport, type ConvertReport } from './blocks/to-blocks.ts';

/**
 * Версия конвертера «HTML → блоки». Входит в хеш исходника: после доработки
 * парсеров повторный импорт пересоберёт блоки даже у неизменённых страниц.
 */
export const CONVERTER_VERSION = '2026-10-07.2';

const KNOWN_META = new Set(['title', 'description', 'inline_styles', 'css_templates', 'preload_image', 'noindex']);

function sha1(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

/**
 * git log по каталогу исходников. Возвращает лог и префикс путей в нём
 * относительно корня репозитория (например 'astro/src/raw-pages/').
 * Без git (архив без .git) — пустой лог: даты станут датой импорта.
 */
function gitLog(absTarget: string): { log: string; prefix: string } {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: absTarget, encoding: 'utf-8' }).trim();
    const rel = path.relative(root, absTarget).split(path.sep).join('/');
    const log = execFileSync('git', ['log', '--format=C:%cI', '--name-only', '--', rel], {
      cwd: root,
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024,
    });
    return { log, prefix: `${rel}/` };
  } catch {
    return { log: '', prefix: '' };
  }
}

function toDate(iso: string | undefined | null): Date | null {
  return iso ? new Date(iso) : null;
}

function laterOf(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export interface PageImportStats {
  total: number;
  inserted: number;
  updated: number;
  unchanged: number;
  /** правлены в админке — импорт их не трогает (кроме --force) */
  edited: number;
  deleted: number;
  styles: number;
}

/** Готовит запись страницы из исходника Astro (raw-pages). */
function rawToRecord(
  raw: RawPage,
  dates: Map<string, { first: string; last: string }>,
  importTime: Date,
  report: ConvertReport,
): { page: NewPage; styles: ReturnType<typeof classifyStyleBlock>[] } {
  const meta = raw.meta;
  // В 10 meta.json вместо массива стоит строка ' ' — Astro выводил её как пустой
  // inline-блок. Пустые блоки ничего не стилизуют, поэтому отбрасываем.
  const toList = (v: unknown): string[] =>
    (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []).filter((s): s is string => typeof s === 'string');
  const styles = toList(meta.inline_styles).filter((b) => b.trim()).map(classifyStyleBlock);
  const cssTemplates = toList(meta.css_templates);
  const bodyDates = dates.get(raw.relBody);
  const metaDates = dates.get(raw.relMeta);
  const lastmod = laterOf(bodyDates?.last, metaDates?.last);
  const extraMeta: Record<string, unknown> = { source: 'astro-raw-pages' };
  for (const [k, v] of Object.entries(meta)) if (!KNOWN_META.has(k)) extraMeta[k] = v;
  return {
    styles,
    page: {
      path: raw.path,
      kind: 'page',
      template: detectTemplate(raw.path, raw.body),
      title: meta.title ?? '',
      description: meta.description ?? null,
      blocks: htmlToBlocks(raw.body, raw.path, report),
      body: raw.body,
      cssTemplates,
      styleHashes: styles.map((s) => s.hash),
      preloadImage: meta.preload_image ?? null,
      noindex: meta.noindex === true,
      extraMeta,
      publishedAt: toDate(bodyDates?.first),
      modifiedAt: toDate(bodyDates?.last),
      lastmodAt: toDate(lastmod) ?? importTime,
      sourceHash: sha1(`${CONVERTER_VERSION}\u0000${raw.body}\u0000${raw.metaRaw}`),
    },
  };
}

/** HTML-документы Практикума: готовые страницы целиком, отдаются как есть. */
function readPraktikum(publicDir: string, dates: Map<string, { first: string; last: string }>, importTime: Date): NewPage[] {
  const root = path.join(publicDir, 'praktikum');
  if (!fs.existsSync(root)) return [];
  const out: NewPage[] = [];
  const walk = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        walk(full, r);
        continue;
      }
      if (!e.name.endsWith('.html')) continue;
      const html = fs.readFileSync(full, 'utf-8');
      const urlPath = e.name === 'index.html'
        ? `/praktikum/${rel ? `${rel}/` : ''}`
        : `/praktikum/${r}`;
      const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
      const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? null;
      const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
      const d = dates.get(`praktikum/${r}`);
      out.push({
        path: urlPath,
        kind: 'document',
        template: e.name === 'index.html' ? 'praktikum' : 'praktikum-sheet',
        title,
        description,
        body: html,
        cssTemplates: [],
        styleHashes: [],
        preloadImage: null,
        noindex,
        extraMeta: { source: 'astro-public-praktikum', file: `praktikum/${r}`, pagefindBody: html.includes('data-pagefind-body') },
        publishedAt: toDate(d?.first),
        modifiedAt: toDate(d?.last),
        lastmodAt: toDate(d?.last) ?? importTime,
        sourceHash: sha1(html),
      });
    }
  };
  walk(root, '');
  return out;
}

/**
 * Синхронизирует страницы с исходниками Astro-проекта: новые — вставить,
 * изменённые (по хешу исходника) — обновить, исчезнувшие — удалить.
 * Возвращает пути изменённых страниц — для событий и сброса кеша.
 */
export async function importPages(
  db: Db,
  sourceDir: string,
  log: Logger,
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<{ stats: PageImportStats; changed: string[]; deleted: string[] }> {
  const importTime = new Date();
  const rawRoot = path.join(sourceDir, 'src', 'raw-pages');
  const publicDir = path.join(sourceDir, 'public');
  const rawPages = readRawPages(rawRoot);
  const rawGit = gitLog(rawRoot);
  const rawDates = readGitDates(rawGit.log, rawGit.prefix);
  // ключи дат Практикума — от public/: 'praktikum/<путь>'
  const prGit = gitLog(path.join(publicDir, 'praktikum'));
  const praktikumDates = readGitDates(prGit.log, prGit.prefix.replace(/praktikum\/$/, ''));
  log.info({ pages: rawPages.length, gitFiles: rawDates.size }, 'исходники прочитаны');

  const report = newReport();
  const records = rawPages.map((r) => rawToRecord(r, rawDates, importTime, report));
  const typed = Object.values(report.typed).reduce((a, b) => a + b, 0);
  const html = Object.values(report.fallback).reduce((a, b) => a + b, 0);
  log.info({ typed, html, byType: report.typed }, 'секции → блоки');
  const docs = readPraktikum(publicDir, praktikumDates, importTime);
  const allPages: NewPage[] = [...records.map((r) => r.page), ...docs];

  // Стили — дедупликация по хешу
  const styleMap = new Map<string, ReturnType<typeof classifyStyleBlock>>();
  for (const r of records) for (const s of r.styles) styleMap.set(s.hash, s);

  const existing = await db
    .select({ path: pages.path, sourceHash: pages.sourceHash, extraMeta: pages.extraMeta })
    .from(pages);
  const existingByPath = new Map(existing.map((e) => [e.path, e]));
  const incoming = new Set(allPages.map((p) => p.path));

  const stats: PageImportStats = { total: allPages.length, inserted: 0, updated: 0, unchanged: 0, edited: 0, deleted: 0, styles: styleMap.size };
  const editedInAdmin = (e: { extraMeta: unknown }) => (e.extraMeta as Record<string, unknown>)?.source === 'admin';
  const changed: string[] = [];
  const toWrite: NewPage[] = [];
  for (const p of allPages) {
    const prev = existingByPath.get(p.path);
    if (!prev) {
      stats.inserted++;
      changed.push(p.path);
      toWrite.push(p);
    } else if (editedInAdmin(prev) && !opts.force) {
      stats.edited++;
    } else if (prev.sourceHash !== p.sourceHash) {
      stats.updated++;
      changed.push(p.path);
      toWrite.push(p);
    } else {
      stats.unchanged++;
    }
  }
  // Удаляем только то, что сам импорт и создавал (ручные страницы не трогаем).
  const deleted = existing
    .filter((e) => !incoming.has(e.path))
    .filter((e) => String((e.extraMeta as Record<string, unknown>)?.source ?? '').startsWith('astro-'))
    .map((e) => e.path);
  stats.deleted = deleted.length;

  if (opts.dryRun) return { stats, changed, deleted };

  await db.transaction(async (tx) => {
    const styleRows = [...styleMap.values()];
    for (let i = 0; i < styleRows.length; i += 200) {
      await tx.insert(styleBlocks).values(styleRows.slice(i, i + 200)).onConflictDoNothing();
    }
    for (let i = 0; i < toWrite.length; i += 100) {
      const chunk = toWrite.slice(i, i + 100).map((p) => ({ ...p, updatedAt: importTime }));
      await tx
        .insert(pages)
        .values(chunk)
        .onConflictDoUpdate({
          target: pages.path,
          set: {
            kind: sql`excluded.kind`,
            template: sql`excluded.template`,
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            blocks: sql`excluded.blocks`,
            body: sql`excluded.body`,
            cssTemplates: sql`excluded.css_templates`,
            styleHashes: sql`excluded.style_hashes`,
            preloadImage: sql`excluded.preload_image`,
            noindex: sql`excluded.noindex`,
            extraMeta: sql`excluded.extra_meta`,
            publishedAt: sql`excluded.published_at`,
            modifiedAt: sql`excluded.modified_at`,
            lastmodAt: sql`excluded.lastmod_at`,
            sourceHash: sql`excluded.source_hash`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }
    if (deleted.length) await tx.delete(pages).where(inArray(pages.path, deleted));
  });
  return { stats, changed, deleted };
}
