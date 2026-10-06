import type { Prisma } from '@mtpk/db';

/** Поля пользователя, которые отдаёт API (без хеша пароля). */
export const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
