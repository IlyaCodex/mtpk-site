import { headers } from 'next/headers';
import { auditLog } from '@mtpk/db';
import { db } from './db';
import type { SessionUser } from './auth';

/** IP пользователя: за шлюзом — из X-Real-IP. */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

/** Запись в журнал действий. Сбой журнала не ломает само действие. */
export async function audit(
  user: Pick<SessionUser, 'id' | 'email'> | null,
  action: string,
  target?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await db()
      .insert(auditLog)
      .values({ userId: user?.id ?? null, userEmail: user?.email ?? null, action, target: target ?? null, details: details ?? null, ip: await clientIp() });
  } catch (err) {
    console.error('журнал действий: запись не удалась', err);
  }
}
