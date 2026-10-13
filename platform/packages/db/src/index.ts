/**
 * База данных платформы: Prisma Client поверх пула соединений pg.
 * Схема и миграции — prisma/schema.prisma и prisma/migrations; клиент
 * генерируется в src/generated/prisma (npm run db:generate, в git не хранится).
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client.ts';

export type Db = PrismaClient;

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

/** Клиент базы с пулом соединений. Каждому сервису — своё имя в pg_stat_activity. */
export function createDb(url: string, opts: { max?: number; appName?: string } = {}): DbHandle {
  const adapter = new PrismaPg({
    connectionString: url,
    max: opts.max ?? 10,
    application_name: opts.appName ?? 'mtpk',
    idleTimeoutMillis: 30_000,
  });
  const db = new PrismaClient({ adapter });
  return { db, close: () => db.$disconnect() };
}

/** Изменение или удаление по ключу, а записи нет (Prisma бросает P2025) → null. */
export async function orNotFound<T>(query: Promise<T>): Promise<T | null> {
  try {
    return await query;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
    throw err;
  }
}

export { Prisma };
export type {
  Asset,
  AuditEntry,
  Lead,
  LeadReject,
  MailCampaign,
  MailClick,
  MailContact,
  MailImport,
  MailLink,
  MailList,
  MailRecipient,
  Page,
  Redirect,
  SearchDocument,
  Setting,
  StockGroup,
  StockItem,
  StyleBlock,
  User,
} from './generated/prisma/client.ts';
