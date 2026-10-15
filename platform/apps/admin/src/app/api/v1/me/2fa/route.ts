import { z } from 'zod';
import { jsonError, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { checkCode, codeProblem, confirmSetup, disableTwoFactor, renewRecoveryCodes, startSetup, twoFactorOn } from '@/lib/two-factor';

const code = z.string().trim().min(1).max(40);
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setup') }),
  z.object({ action: z.literal('enable'), code }),
  z.object({ action: z.literal('codes'), code }),
  z.object({ action: z.literal('disable'), code }),
]);

/**
 * Своя 2FA («Настройки входа»): setup — новый секрет и QR-код для приложения;
 * enable — подтверждение кодом из приложения (ответ — резервные коды); codes — новые
 * резервные коды; disable — выключить. При включённой 2FA изменения — только с
 * действующим кодом: кто воспользуется чужой открытой сессией, защиту не снимет.
 */
export const POST = route(null, async (req, user) => {
  const body = input.parse(await req.json());
  const row = await db().user.findUniqueOrThrow({ where: { id: user.id }, select: { totpSecret: true, totpEnabledAt: true, recoveryCodes: true } });
  const on = twoFactorOn(row);
  if (body.action === 'setup' || body.action === 'enable') {
    if (on) return jsonError(409, 'already_enabled', { message: '2FA уже включена' });
    if (body.action === 'setup') return Response.json(await startSetup(user));
    const result = await confirmSetup(user.id, body.code);
    if (result === 'expired') return jsonError(410, 'setup_expired', { message: 'Прошло больше 10 минут — начните включение заново' });
    if (result === 'bad_code') return jsonError(400, 'bad_code', { message: codeProblem('bad_code') });
    await audit(user, '2fa.enable', user.email);
    return Response.json({ codes: result });
  }

  if (!on) return jsonError(409, 'not_enabled', { message: '2FA выключена' });
  const check = await checkCode({ ...row, id: user.id, email: user.email }, body.code);
  if (!check.ok) return jsonError(check.reason === 'too_many' ? 429 : 400, check.reason, { message: codeProblem(check.reason) });
  if (body.action === 'codes') {
    const codes = await renewRecoveryCodes(user.id);
    await audit(user, '2fa.codes', user.email);
    return Response.json({ codes });
  }
  await disableTwoFactor(user.id);
  await audit(user, '2fa.disable', user.email);
  return Response.json({ ok: true });
});
