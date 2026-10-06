/**
 * Применяет миграции БД. Запуск: npm run db:migrate (локально) или
 * одноразовый контейнер migrate в docker-compose.yml (прод).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { z } from 'zod';
import { createLogger, envParts, readEnv } from '@mtpk/shared';
import { createDb } from './index.ts';

const env = readEnv(z.object({ ...envParts.base, ...envParts.db }));
const log = createLogger('migrate');
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(here, '../migrations');

const { db, pool, close } = createDb(env.DATABASE_URL, { max: 1, appName: 'migrate' });
try {
  // Расширения ставятся до миграций: индекс по триграммам в схеме search их требует.
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  await migrate(db, { migrationsFolder, migrationsSchema: 'public' });
  log.info({ migrationsFolder }, 'миграции применены');
} catch (err) {
  log.error({ err }, 'миграции не применены');
  process.exitCode = 1;
} finally {
  await close();
}
