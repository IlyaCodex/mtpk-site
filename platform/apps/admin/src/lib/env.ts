import { z } from 'zod';

/** Переменные окружения админки (локально — platform/.env, см. next.config.ts). */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  /** служебный токен для /admin/v1 сервисов */
  ADMIN_TOKEN: z.string().min(8),
  /** секрет ссылки входа /admin/login?token=… (см. lib/gate.ts) */
  ADMIN_LOGIN_TOKEN: z.string().min(24),
  CONTENT_URL: z.string().default('http://127.0.0.1:4101'),
  LEADS_URL: z.string().default('http://127.0.0.1:4102'),
  SEARCH_URL: z.string().default('http://127.0.0.1:4103'),
  MEDIA_URL: z.string().default('http://127.0.0.1:4104'),
  /** публичный адрес сайта: ссылки «открыть на сайте», стили и картинки предпросмотра */
  PUBLIC_SITE_URL: z.string().default('http://127.0.0.1:3200'),
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
