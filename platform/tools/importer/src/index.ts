/**
 * Импорт контента Astro-проекта в платформу.
 *
 *   npm run import                     — всё: страницы, стили, Практикум, редиректы, склад, файлы в S3
 *   npm run import -- --only=pages     — выборочно: pages | redirects | stock | assets
 *   npm run import -- --dry-run        — только посчитать, ничего не писать
 *   npm run import -- --force          — перезаписать и страницы, правленные в админке
 *   npm run import -- --source=../astro
 *
 * Импорт идемпотентный: повторный запуск переносит только изменения
 * (страницы — по хешу исходника, файлы — по MD5). После записи публикует
 * событие content.reindex и просит контент-сервис сбросить кеш.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  createLogger,
  createRedis,
  createS3,
  envParts,
  publishEvent,
  readEnv,
  CONTENT_STREAM,
} from '@mtpk/shared';
import { createDb } from '@mtpk/db';
import { importPages } from './pages.ts';
import { syncAssets } from './assets.ts';
import { importRedirects } from './redirects.ts';
import { importStock } from './stock.ts';

const env = readEnv(
  z.object({
    ...envParts.base,
    ...envParts.db,
    ...envParts.redis,
    ...envParts.s3,
    CONTENT_SOURCE_DIR: z.string().default('../astro'),
    REDIRECTS_MAP_FILE: z.string().default('../server/redirects-legacy.map'),
    CONTENT_URL: z.string().default('http://127.0.0.1:4101'),
    ADMIN_TOKEN: z.string().default(''),
  }),
);
const log = createLogger('importer');

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'] as const;
  }),
);
const dryRun = args.get('dry-run') === 'true';
const force = args.get('force') === 'true';
const only = new Set((args.get('only') ?? 'pages,redirects,stock,assets').split(',').map((s) => s.trim()));

// Относительные пути из .env — от корня platform/ (tools/importer/src → ../../..).
const platformRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const resolveFromRoot = (p: string) => (path.isAbsolute(p) ? p : path.resolve(platformRoot, p));
const sourceDir = resolveFromRoot(args.get('source') ?? env.CONTENT_SOURCE_DIR);
const mapFile = resolveFromRoot(args.get('redirects') ?? env.REDIRECTS_MAP_FILE);

const { db, close } = createDb(env.DATABASE_URL, { max: 4, appName: 'importer' });
const redis = createRedis(env.REDIS_URL);
let changedPaths: string[] = [];
let anyChange = false;

try {
  log.info({ sourceDir, only: [...only], dryRun }, 'импорт начат');

  if (only.has('pages')) {
    const res = await importPages(db, sourceDir, log, { dryRun, force });
    changedPaths = [...res.changed, ...res.deleted];
    anyChange ||= changedPaths.length > 0;
    log.info(res.stats, 'страницы');
  }
  if (only.has('redirects')) {
    const res = await importRedirects(db, mapFile, { dryRun });
    anyChange ||= res.written > 0;
    log.info({ mapFile, ...res }, 'редиректы');
  }
  if (only.has('stock')) {
    const res = await importStock(db, path.join(sourceDir, 'data', 'stock.config.json'), { dryRun });
    anyChange ||= res.total > 0;
    log.info(res, 'склад');
  }
  if (only.has('assets')) {
    const s3 = createS3(env);
    const res = await syncAssets(db, s3, env.S3_BUCKET_ASSETS, path.join(sourceDir, 'public'), log, {
      dryRun,
      dirs: args.get('dirs')?.split(','),
    });
    log.info({ ...res, mbUploaded: +(res.bytesUploaded / 1048576).toFixed(1) }, 'файлы в S3');
    if (res.failed) process.exitCode = 1;
  }

  if (!dryRun && anyChange) {
    // Поиску и прочим подписчикам — пересобрать индекс; контент-сервису — сбросить кеш.
    await publishEvent(redis, CONTENT_STREAM, { type: 'content.reindex' });
    try {
      const res = await fetch(`${env.CONTENT_URL}/admin/v1/cache/purge`, {
        method: 'POST',
        headers: { 'x-admin-token': env.ADMIN_TOKEN, 'content-type': 'application/json' },
        body: JSON.stringify({ paths: changedPaths.slice(0, 2000) }),
      });
      log.info({ status: res.status }, 'кеш контент-сервиса сброшен');
    } catch {
      log.warn('контент-сервис не запущен — кеш сбросится по TTL или при старте');
    }
  }
  log.info('импорт завершён');
} catch (err) {
  log.error({ err }, 'импорт упал');
  process.exitCode = 1;
} finally {
  await close();
  redis.disconnect();
}
