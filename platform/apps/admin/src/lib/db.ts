import { createDb, type Db } from '@mtpk/db';
import { createRedis, type Redis } from '@mtpk/shared/redis';
import { env } from './env';

/**
 * Подключения админки: PostgreSQL (схема admin — пользователи и журнал) и
 * Redis (сессии, ограничение попыток входа). Один экземпляр на процесс —
 * в dev переживает горячую перезагрузку модулей через globalThis.
 */
const g = globalThis as typeof globalThis & { __mtpkAdmin?: { db: Db; redis: Redis } };

function connections() {
  if (!g.__mtpkAdmin) {
    const { db } = createDb(env().DATABASE_URL, { max: 5, appName: 'admin' });
    const redis = createRedis(env().REDIS_URL, { lazyConnect: false });
    g.__mtpkAdmin = { db, redis };
  }
  return g.__mtpkAdmin;
}

export const db = (): Db => connections().db;
export const redis = (): Redis => connections().redis;
