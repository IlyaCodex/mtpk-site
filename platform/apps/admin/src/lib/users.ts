import { users } from '@mtpk/db';

/** Поля пользователя, которые отдаёт API (без хеша пароля). */
export const publicUser = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  active: users.active,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};
