import { route } from '@/lib/api';
import { ACCESS, can, type Area } from '@/lib/auth';

/** Текущий пользователь и разделы, к которым у него есть доступ. */
export const GET = route(null, async (_req, user) =>
  Response.json({ ...user, areas: (Object.keys(ACCESS) as Area[]).filter((a) => can(user, a)) }),
);
