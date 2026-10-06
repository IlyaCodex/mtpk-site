import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, users } from '@mtpk/db';
import { db, redis } from './db';
import { env } from './env';

/**
 * Роли:
 *   admin   — всё, включая пользователей и журнал;
 *   editor  — контент: страницы, медиатека, редиректы, наличие, настройки;
 *   manager — заявки.
 */
export type Role = 'admin' | 'editor' | 'manager';
export const ROLES: Role[] = ['admin', 'editor', 'manager'];
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  editor: 'Редактор',
  manager: 'Менеджер заявок',
};

/** Кто к какому разделу допущен. */
export const ACCESS = {
  content: ['admin', 'editor'],
  media: ['admin', 'editor'],
  search: ['admin', 'editor'],
  leads: ['admin', 'manager'],
  users: ['admin'],
  audit: ['admin'],
} satisfies Record<string, Role[]>;
export type Area = keyof typeof ACCESS;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

const COOKIE = 'mtpk_admin';
const TTL = 7 * 24 * 3600; // неделя с последнего действия
const sessionKey = (id: string) => `admin:sess:${id}`;
const userSessionsKey = (userId: number) => `admin:user-sess:${userId}`;

export function can(user: SessionUser, area: Area): boolean {
  return (ACCESS[area] as Role[]).includes(user.role);
}

/** Новая сессия после входа: случайный id в cookie, данные — в Redis. */
export async function createSession(userId: number): Promise<void> {
  const id = crypto.randomBytes(32).toString('base64url');
  await redis().multi().set(sessionKey(id), String(userId), 'EX', TTL).sadd(userSessionsKey(userId), id).exec();
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env().ADMIN_SECURE_COOKIE ? env().ADMIN_SECURE_COOKIE === 'true' : env().NODE_ENV === 'production',
    path: '/',
    maxAge: TTL,
  });
}

/**
 * Текущий пользователь. Роль и активность читаются из БД на каждый запрос:
 * отключённый или понижённый пользователь теряет доступ сразу.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const userId = Number(await redis().get(sessionKey(id)));
  if (!userId) return null;
  const [user] = await db().select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.active) return null;
  await redis().expire(sessionKey(id), TTL);
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
}

/** Для страниц: без входа — на /login, без прав — на главную админки. */
export async function requireUser(area?: Area): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (area && !can(user, area)) redirect('/?forbidden=1');
  return user;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) {
    const userId = await redis().get(sessionKey(id));
    await redis().del(sessionKey(id));
    if (userId) await redis().srem(userSessionsKey(Number(userId)), id);
  }
  jar.delete(COOKIE);
}

/** Завершить все сессии пользователя (отключение, смена пароля). */
export async function revokeUserSessions(userId: number): Promise<void> {
  const ids = await redis().smembers(userSessionsKey(userId));
  if (ids.length) await redis().del(...ids.map(sessionKey));
  await redis().del(userSessionsKey(userId));
}
