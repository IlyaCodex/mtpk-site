import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { destroySession } from '@/lib/auth';

/** Выход: сессия удаляется из Redis, cookie стирается. */
export const POST = route(null, async (_req, user) => {
  await destroySession();
  await audit(user, 'logout', user.email);
  return Response.json({ ok: true });
});
