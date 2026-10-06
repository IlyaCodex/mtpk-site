import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as contentTables from './schema/content.ts';
import * as leadsTables from './schema/leads.ts';
import * as searchTables from './schema/search.ts';
import * as adminTables from './schema/admin.ts';

export const schema = { ...contentTables, ...leadsTables, ...searchTables, ...adminTables };
export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  pool: pg.Pool;
  close: () => Promise<void>;
}

/** Пул соединений + Drizzle. Каждому сервису — своё имя в pg_stat_activity. */
export function createDb(url: string, opts: { max?: number; appName?: string } = {}): DbHandle {
  const pool = new pg.Pool({
    connectionString: url,
    max: opts.max ?? 10,
    application_name: opts.appName ?? 'mtpk',
    idleTimeoutMillis: 30_000,
  });
  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}

export * from './schema/content.ts';
export * from './schema/leads.ts';
export * from './schema/search.ts';
export * from './schema/admin.ts';
export { sql, eq, ne, and, or, inArray, notInArray, desc, asc, isNull, isNotNull, count, like, ilike, lt, gt } from 'drizzle-orm';
