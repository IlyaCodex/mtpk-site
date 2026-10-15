import { cookies } from 'next/headers';
import { z } from 'zod';
import { audit, clientIp } from '@/lib/audit';
import { jsonError } from '@/lib/api';
import { createSession } from '@/lib/auth';
import { BASE_PATH } from '@/lib/base-path';
import { GATE_COOKIE, GATE_TTL, gatePass, secureCookies } from '@/lib/gate';
import { db, redis } from '@/lib/db';
import { env } from '@/lib/env';
import { verifyPassword } from '@/lib/password';
import { checkCode, codeProblem, twoFactorOn } from '@/lib/two-factor';

const input = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
  /** второй шаг при включённой 2FA: код из приложения или резервный */
  code: z.string().trim().max(40).optional(),
});
const MAX_ATTEMPTS = 10;
const WINDOW_S = 15 * 60;

/**
 * Вход: e-mail и пароль → cookie сессии. Включена 2FA — сначала ответ code_required,
 * затем те же e-mail и пароль с кодом. Не больше 10 попыток за 15 минут с одного IP.
 */
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
  const { email, password, code } = parsed.data;

  const user = await db().user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok || !user.active) {
    await audit(null, 'login.failed', email);
    return jsonError(401, 'invalid_credentials', { message: 'Неверный e-mail или пароль' });
  }
  if (twoFactorOn(user)) {
    if (!code) return jsonError(401, 'code_required', { message: 'Введите код из приложения' });
    const check = await checkCode(user, code);
    if (!check.ok) {
      await audit(null, 'login.2fa_failed', email);
      return jsonError(check.reason === 'too_many' ? 429 : 401, check.reason, { message: codeProblem(check.reason) });
    }
    if (check.via === 'recovery') await audit(user, '2fa.recovery_used', user.email, { left: check.left });
  }
  await createSession(user.id);
  // пропуск продлевается с каждым входом (сюда без пропуска не попасть — см. proxy.ts)
  (await cookies()).set(GATE_COOKIE, await gatePass(env().ADMIN_LOGIN_TOKEN), {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies(),
    path: BASE_PATH,
    maxAge: GATE_TTL,
  });
  await db().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await redis().del(attemptsKey);
  await audit(user, 'login', user.email);
  return Response.json({ ok: true });
}
