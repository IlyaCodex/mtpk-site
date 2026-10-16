import { revokeUserSessions } from './auth';
import { db } from './db';
import { env } from './env';
import { hashPassword, verifyPassword } from './password';

/**
 * Главный администратор — учётка из platform/.env: ADMIN_EMAIL (логин) и ADMIN_PASSWORD. При запуске админки
 * (instrumentation.ts) она есть, активна, с ролью admin и паролем из .env: в базе — только хеш пароля, поэтому
 * сменить пароль — значит поменять его в .env и перезапустить админку. В админке эту учётку не отключить,
 * не понизить, не удалить и пароль ей не сменить — иначе .env и база разойдутся.
 */
export function isMainAdmin(email: string): boolean {
  const main = env().ADMIN_EMAIL;
  return Boolean(main) && email.toLowerCase() === main;
}

export async function syncMainAdmin(): Promise<'created' | 'updated' | 'ok' | 'off'> {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = env();
  if (!email || !password) return 'off';
  const user = await db().user.findUnique({ where: { email } });
  if (!user) {
    await db().user.create({ data: { email, name: 'Главный администратор', role: 'admin', passwordHash: await hashPassword(password) } });
    return 'created';
  }
  const same = await verifyPassword(password, user.passwordHash);
  if (same && user.role === 'admin' && user.active) return 'ok';
  await db().user.update({
    where: { id: user.id },
    data: { role: 'admin', active: true, ...(same ? {} : { passwordHash: await hashPassword(password) }) },
  });
  // пароль сменился — входы со старым паролем закрываются
  if (!same) await revokeUserSessions(user.id);
  return 'updated';
}
