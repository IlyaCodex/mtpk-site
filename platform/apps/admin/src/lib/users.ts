import type { Prisma } from '@mtpk/db';

/** Поля пользователя, которые отдаёт API (без хеша пароля и секретов 2FA). */
export const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  /** когда включена 2FA; null — выключена */
  totpEnabledAt: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
