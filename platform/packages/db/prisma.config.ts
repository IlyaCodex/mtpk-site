/**
 * Настройки Prisma CLI: где схема и миграции, к какой базе применять.
 * Адрес базы — DATABASE_URL (локально — из platform/.env, в контейнере —
 * из окружения). Генерации клиента база не нужна.
 */
import path from 'node:path';
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '../../.env'));
} catch {
  /* в контейнере .env нет — переменные приходят из окружения */
}

const url = process.env.DATABASE_URL;
/** пустая служебная база для сверки миграций со схемой (prisma migrate diff --from-migrations) */
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(url ? { datasource: { url, ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}) } } : {}),
});
