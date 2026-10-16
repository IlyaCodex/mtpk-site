/**
 * Создать (или обновить пароль и роль) пользователя админки из консоли. Главного администратора
 * заводить не нужно: он — из platform/.env (ADMIN_EMAIL, ADMIN_PASSWORD), создаётся сам при запуске
 * админки (src/lib/main-admin.ts); его пароль этим скриптом не менять — при запуске вернётся из .env.
 *
 *   npm run create-user -w @mtpk/admin -- --email=editor@uralinduktor.ru --name="Редактор" --role=editor
 *
 * Пароль спрашивается в консоли (или берётся из ADMIN_USER_PASSWORD) — не из
 * аргументов: они попадают в историю команд.
 */
import readline from 'node:readline/promises';
import path from 'node:path';
import { createDb } from '@mtpk/db';
import { hashPassword, passwordProblem } from '../src/lib/password.ts';

try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'));
} catch {
  /* переменные из окружения */
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  }),
);
const email = String(args.email ?? '').trim().toLowerCase();
const name = String(args.name ?? email.split('@')[0]);
const role = String(args.role ?? 'admin');
if (!email.includes('@') || !['admin', 'editor', 'manager'].includes(role)) {
  console.error('Использование: --email=… [--name=…] [--role=admin|editor|manager]');
  process.exit(1);
}

let password = process.env.ADMIN_USER_PASSWORD ?? '';
if (!password) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question(`Пароль для ${email}: `);
  rl.close();
}
const problem = passwordProblem(password);
if (problem) {
  console.error(problem);
  process.exit(1);
}

const { db, close } = createDb(process.env.DATABASE_URL ?? '', { max: 1, appName: 'admin-cli' });
const passwordHash = await hashPassword(password);
const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
if (existing) {
  await db.user.update({ where: { id: existing.id }, data: { passwordHash, role, name, active: true } });
  console.log(`Обновлён пользователь ${email} (${role})`);
} else {
  await db.user.create({ data: { email, name, role, passwordHash } });
  console.log(`Создан пользователь ${email} (${role})`);
}
await close();
