import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'playwright';

/** Адрес админки для проверок: ADMIN_BASE или локальный dev-сервер (/admin). */
export const ADMIN_BASE = (process.env.ADMIN_BASE ?? 'http://127.0.0.1:3300/admin').replace(/\/$/, '');

/** Секрет ссылки входа — из окружения или platform/.env (в вывод не печатается). */
function loginToken(): string {
  if (process.env.ADMIN_LOGIN_TOKEN) return process.env.ADMIN_LOGIN_TOKEN;
  const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env');
  const m = fs.readFileSync(envFile, 'utf8').match(/^ADMIN_LOGIN_TOKEN=(.+)$/m);
  if (!m) throw new Error('нет ADMIN_LOGIN_TOKEN в platform/.env');
  return m[1].trim();
}

/**
 * Вход в админку: секретная ссылка → форма входа (когда загрузились скрипты и
 * кнопка активна) → главная админки. E-mail и пароль — ADMIN_SMOKE_EMAIL/PASSWORD.
 */
export async function adminLogin(page: Page): Promise<void> {
  await page.goto(`${ADMIN_BASE}/login?token=${encodeURIComponent(loginToken())}`, { waitUntil: 'networkidle', timeout: 240_000 });
  await page.waitForSelector('button[type=submit]:not([disabled])', { timeout: 120_000 });
  await page.fill('input[name=email]', process.env.ADMIN_SMOKE_EMAIL ?? '');
  await page.fill('input[name=password]', process.env.ADMIN_SMOKE_PASSWORD ?? '');
  await page.click('button[type=submit]');
  await page.waitForURL(ADMIN_BASE, { timeout: 180_000 });
}
