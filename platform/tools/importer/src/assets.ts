import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { contentTypeFor, listObjects, putObject, type S3Client, type Logger } from '@mtpk/shared';
import type { Db } from '@mtpk/db';

/**
 * Каталоги public/ Astro-проекта, которые являются КОНТЕНТОМ и живут в S3.
 * Код и дизайн-ассеты (css, js, fonts, brand) лежат в apps/web/public.
 */
export const ASSET_DIRS = ['img', 'files', 'docs', 'og', 'praktikum'];

/** Файлы, которые не публикуются (лог генератора картинок с промптами — T-IMG-C). */
const SKIP = [/(^|\/)history\.jsonl$/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/];

function md5File(file: string): string {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

function* walkFiles(root: string, rel = ''): Generator<{ abs: string; key: string }> {
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) yield* walkFiles(root, r);
    else if (e.isFile()) yield { abs: path.join(root, r), key: r };
  }
}

export interface AssetSyncStats {
  scanned: number;
  uploaded: number;
  skipped: number;
  bytesUploaded: number;
  failed: number;
}

/**
 * Загружает файлы в бакет ассетов. Ключ = путь от public/ ('img/foo.png'),
 * поэтому URL на сайте не меняются. Уже загруженные (совпал размер и MD5) —
 * пропускаются. HTML-документы Практикума идут в БД, здесь — только их ассеты.
 */
export async function syncAssets(
  db: Db,
  s3: S3Client,
  bucket: string,
  publicDir: string,
  log: Logger,
  opts: { dirs?: string[]; concurrency?: number; dryRun?: boolean } = {},
): Promise<AssetSyncStats> {
  const dirs = opts.dirs ?? ASSET_DIRS;
  const remote = new Map<string, { size: number; etag: string }>();
  for await (const o of listObjects(s3, bucket)) remote.set(o.key, { size: o.size, etag: o.etag });
  log.info({ remote: remote.size }, 'список объектов бакета получен');

  const files: { abs: string; key: string }[] = [];
  for (const dir of dirs) {
    const abs = path.join(publicDir, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of walkFiles(publicDir, dir)) {
      if (SKIP.some((re) => re.test(f.key))) continue;
      if (f.key.startsWith('praktikum/') && f.key.endsWith('.html')) continue;
      files.push(f);
    }
  }

  const stats: AssetSyncStats = { scanned: files.length, uploaded: 0, skipped: 0, bytesUploaded: 0, failed: 0 };
  const catalog: { key: string; size: number; etag: string; contentType: string }[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < files.length) {
      const f = files[cursor++];
      const size = fs.statSync(f.abs).size;
      const contentType = contentTypeFor(f.key);
      const prev = remote.get(f.key);
      const md5 = md5File(f.abs);
      if (prev && prev.size === size && prev.etag === md5) {
        stats.skipped++;
        catalog.push({ key: f.key, size, etag: md5, contentType });
        continue;
      }
      if (opts.dryRun) {
        stats.uploaded++;
        continue;
      }
      try {
        const etag = await putObject(s3, bucket, f.key, fs.readFileSync(f.abs), contentType);
        stats.uploaded++;
        stats.bytesUploaded += size;
        catalog.push({ key: f.key, size, etag: etag || md5, contentType });
      } catch (err) {
        stats.failed++;
        log.error({ err, key: f.key }, 'не загрузился файл');
      }
      if ((stats.uploaded + stats.skipped) % 500 === 0) {
        log.info({ done: stats.uploaded + stats.skipped, of: files.length }, 'загрузка ассетов…');
      }
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 12 }, worker));

  if (!opts.dryRun && catalog.length) {
    // Каталог объектов в БД: медиасервис по нему решает, есть ли WebP-сосед,
    // не дёргая S3 на каждый запрос.
    // запись каталога целиком заменяется свежей (связей у таблицы нет)
    for (let i = 0; i < catalog.length; i += 500) {
      const chunk = catalog.slice(i, i + 500);
      await db.$transaction([
        db.asset.deleteMany({ where: { key: { in: chunk.map((c) => c.key) } } }),
        db.asset.createMany({ data: chunk.map((c) => ({ ...c, updatedAt: new Date() })) }),
      ]);
    }
  }
  return stats;
}
