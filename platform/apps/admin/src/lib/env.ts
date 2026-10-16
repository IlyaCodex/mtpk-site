import { z } from 'zod';

/** Пустая переменная («ADMIN_EMAIL=») — как не заданная. */
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** Переменные окружения админки (локально — platform/.env, см. next.config.ts). */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  /** служебный токен для /admin/v1 сервисов */
  ADMIN_TOKEN: z.string().min(8),
  /** секрет ссылки входа /admin/login?token=… (см. lib/gate.ts) */
  ADMIN_LOGIN_TOKEN: z.string().min(24),
  /** главный администратор: e-mail (логин) и пароль — учётка создаётся или приводится к ним при запуске (lib/main-admin.ts) */
  ADMIN_EMAIL: z.preprocess(blank, z.string().trim().toLowerCase().email().optional()),
  ADMIN_PASSWORD: z.preprocess(blank, z.string().min(10, 'пароль главного администратора — не короче 10 символов').optional()),
  CONTENT_URL: z.string().default('http://127.0.0.1:4101'),
  LEADS_URL: z.string().default('http://127.0.0.1:4102'),
  SEARCH_URL: z.string().default('http://127.0.0.1:4103'),
  MEDIA_URL: z.string().default('http://127.0.0.1:4104'),
  MAILING_URL: z.string().default('http://127.0.0.1:4105'),
  /** публичный адрес сайта: ссылки «открыть на сайте», стили и картинки предпросмотра */
  PUBLIC_SITE_URL: z.string().default('http://127.0.0.1:3200'),
  /** адрес сайта для запросов с сервера (на сервере — http://web:3000); пусто — PUBLIC_SITE_URL */
  WEB_URL: z.string().default(''),
  /** cookie сессии только по HTTPS (в проде за шлюзом с TLS) */
  ADMIN_SECURE_COOKIE: z.enum(['true', 'false']).optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
      throw new Error(`Некорректные переменные окружения админки:\n${lines.join('\n')}`);
    }
    cached = parsed.data;
  }
  return cached;
}
