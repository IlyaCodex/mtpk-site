import { z } from 'zod';
import { audit, clientIp } from '@/lib/audit';
import { jsonError } from '@/lib/api';
import { createSession } from '@/lib/auth';
import { db, redis } from '@/lib/db';
import { verifyPassword } from '@/lib/password';

const input = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
const MAX_ATTEMPTS = 10;
const WINDOW_S = 15 * 60;

/** Вход: e-mail и пароль → cookie сессии. Не больше 10 попыток за 15 минут с одного IP. */
export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || new URL(origin).host !== host) return jsonError(403, 'bad_origin');

  const ip = (await clientIp()) ?? 'local';
  const attemptsKey = `admin:login:${ip}`;
  const attempts = await redis().incr(attemptsKey);
  if (attempts === 1) await redis().expire(attemptsKey, WINDOW_S);
  if (attempts > MAX_ATTEMPTS) return jsonError(429, 'too_many_attempts', { message: 'Слишком много попыток. Подождите 15 минут.' });

  const parsed = input.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, 'bad_request', { message: 'Укажите e-mail и пароль' });
  const { email, password } = parsed.data;

  const user = await db().user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok || !user.active) {
    await audit(null, 'login.failed', email);
    return jsonError(401, 'invalid_credentials', { message: 'Неверный e-mail или пароль' });
  }
  await createSession(user.id);
  await db().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await redis().del(attemptsKey);
  await audit(user, 'login', user.email);
  return Response.json({ ok: true });
}
