import { createDb, type Db } from '@mtpk/db';
import { createRedis, type Redis } from '@mtpk/shared/redis';
import { env } from './env';

/**
 * Подключения админки: PostgreSQL (схема admin — пользователи и журнал) и
 * Redis (сессии, ограничение попыток входа). Один экземпляр на процесс —
 * в dev переживает горячую перезагрузку модулей через globalThis. Клиент базы
 * перегенерирован (prisma generate после правки схемы) — подключение к базе
 * создаётся заново: прежний клиент не знает новых полей.
 */
const g = globalThis as typeof globalThis & { __mtpkAdmin?: { db: Db; redis: Redis; createDb: typeof createDb } };

function connections() {
  const current = g.__mtpkAdmin;
  if (current && current.createDb !== createDb) {
    void current.db.$disconnect().catch(() => {});
    current.db = createDb(env().DATABASE_URL, { max: 5, appName: 'admin' }).db;
    current.createDb = createDb;
  }
  if (!g.__mtpkAdmin) {
    const { db } = createDb(env().DATABASE_URL, { max: 5, appName: 'admin' });
    const redis = createRedis(env().REDIS_URL, { lazyConnect: false });
    g.__mtpkAdmin = { db, redis, createDb };
  }
  return g.__mtpkAdmin;
}

export const db = (): Db => connections().db;
export const redis = (): Redis => connections().redis;
