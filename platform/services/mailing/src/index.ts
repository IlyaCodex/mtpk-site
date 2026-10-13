/**
 * Сервис рассылок: базы адресов, письма, переходы и отписка. Служебное API
 * (/admin/v1) — для раздела админки «Email-рассылки»; адреса из писем (/r/…)
 * — для получателей. Отправляет письма отдельный процесс — worker.ts.
 */
import multipart from '@fastify/multipart';
import { createLogger, startService } from '@mtpk/shared';
import { createDb } from '@mtpk/db';
import { adminRoutes } from './admin.ts';
import { env, PUBLIC_URL, SENDS_FOR_REAL } from './env.ts';
import { publicRoutes } from './public.ts';

const log = createLogger('mailing');
const { db, close } = createDb(env.DATABASE_URL, { max: 5, appName: 'mailing' });

await startService({
  name: 'mailing',
  description: 'E-mail рассылки: базы адресов (файлы, заявки сайта, CRM), письма с UTM-метками, переходы, отписка. Служебное API /admin/v1 — для админки (заголовок X-Admin-Token).',
  port: env.MAILING_PORT,
  logger: log,
  // большие файлы адресов идут через multipart, текст — до 5 МБ
  bodyLimit: 8 * 1024 * 1024,
  async setup(app) {
    await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
    await app.register(publicRoutes, { db });
    await app.register(adminRoutes, { db, adminToken: env.ADMIN_TOKEN });
    log.info({ publicUrl: PUBLIC_URL, sendsForReal: SENDS_FOR_REAL }, SENDS_FOR_REAL ? 'рассылки: письма уходят через SMTP' : 'рассылки: тестовый режим — письма не отправляются');
  },
  async readiness() {
    await db.$queryRaw`select 1`;
  },
  async onClose() {
    await close();
  },
});
