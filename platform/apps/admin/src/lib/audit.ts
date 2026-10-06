import { headers } from 'next/headers';
import type { Prisma } from '@mtpk/db';
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
    await db().auditEntry.create({
      data: {
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        action,
        target: target ?? null,
        details: details as Prisma.InputJsonObject | undefined,
        ip: await clientIp(),
      },
    });
  } catch (err) {
    console.error('журнал действий: запись не удалась', err);
  }
}

/** Записи журнала, новые сверху; поиск — по действию, адресу и e-mail. */
export async function listAudit(search: string | undefined, offset: number, limit: number) {
  const contains = search ? { contains: search, mode: 'insensitive' as const } : null;
  const where: Prisma.AuditEntryWhereInput = contains ? { OR: [{ action: contains }, { target: contains }, { userEmail: contains }] } : {};
  const [total, items] = await Promise.all([
    db().auditEntry.count({ where }),
    db().auditEntry.findMany({ where, orderBy: { at: 'desc' }, skip: offset, take: limit }),
  ]);
  return { total, items };
}
