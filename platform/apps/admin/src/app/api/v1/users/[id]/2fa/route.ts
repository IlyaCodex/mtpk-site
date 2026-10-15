import { jsonError, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { disableTwoFactor } from '@/lib/two-factor';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Сброс 2FA пользователя администратором — потерян телефон и резервные коды:
 * следующий вход — по паролю, затем 2FA включается заново. Свою — только в
 * «Настройках входа» с кодом (иначе чужая открытая сессия сняла бы защиту).
 */
export const DELETE = route<Ctx>('users', async (_req, user, ctx) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return jsonError(404, 'not_found');
  if (id === user.id) return jsonError(409, 'self', { message: 'Свою 2FA выключите в «Настройках входа» — с кодом из приложения' });
  const target = await db().user.findUnique({ where: { id } });
  if (!target) return jsonError(404, 'not_found');
  await disableTwoFactor(id);
  await audit(user, '2fa.reset', target.email);
  return Response.json({ ok: true });
});
