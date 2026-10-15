import { db, redis } from './db';
import { qrSvg } from './qr';
import { groupSecret, hashRecovery, isRecoveryFormat, newRecoveryCodes, newSecret, otpauthUri, totpStep } from './totp';

/**
 * Двухфакторный вход (2FA) пользователя админки — включается им самим в «Настройках
 * входа». После пароля вход просит код из приложения или резервный код. Неверных
 * кодов — не больше 5 за 15 минут на пользователя (перебор с разных адресов не поможет);
 * один и тот же код дважды не принимается.
 */
const SETUP_TTL = 10 * 60;
const MAX_FAILS = 5;
const FAIL_WINDOW = 15 * 60;
const setupKey = (userId: number) => `admin:2fa:setup:${userId}`;
const failKey = (userId: number) => `admin:2fa:fail:${userId}`;
/** принятый код: окно и сам код (после смены секрета в том же окне код другой — не путать) */
const usedKey = (userId: number, step: number, code: string) => `admin:2fa:used:${userId}:${step}:${code.replace(/\s/g, '')}`;

type TwoFactorUser = { id: number; email: string; totpSecret: string | null; recoveryCodes: string[] };

export const twoFactorOn = (user: { totpSecret: string | null; totpEnabledAt: Date | null }) => Boolean(user.totpSecret && user.totpEnabledAt);

/** Начало включения: новый секрет ждёт подтверждения кодом 10 минут; в базе — только после него. */
export async function startSetup(user: { id: number; email: string }) {
  const secret = newSecret();
  await redis().set(setupKey(user.id), secret, 'EX', SETUP_TTL);
  const uri = otpauthUri(secret, user.email);
  return { secret: groupSecret(secret), uri, qr: qrSvg(uri) };
}

/** Код из приложения при включении верный — 2FA включена; ответ — резервные коды (показываются один раз). */
export async function confirmSetup(userId: number, code: string): Promise<string[] | 'expired' | 'bad_code'> {
  const secret = await redis().get(setupKey(userId));
  if (!secret) return 'expired';
  const step = totpStep(secret, code);
  if (step === null) return 'bad_code';
  await redis().set(usedKey(userId, step, code), '1', 'EX', 120);
  const codes = newRecoveryCodes();
  await db().user.update({
    where: { id: userId },
    data: { totpSecret: secret, totpEnabledAt: new Date(), recoveryCodes: codes.map(hashRecovery) },
  });
  await redis().del(setupKey(userId), failKey(userId));
  return codes;
}

export type CodeCheck = { ok: true; via: 'app' } | { ok: true; via: 'recovery'; left: number } | { ok: false; reason: 'bad_code' | 'too_many' };

/** Проверка второго фактора: 6 цифр из приложения или резервный код (он после входа сгорает). */
export async function checkCode(user: TwoFactorUser, code: string): Promise<CodeCheck> {
  if (Number(await redis().get(failKey(user.id))) >= MAX_FAILS) return { ok: false, reason: 'too_many' };
  if (user.totpSecret && /^\d{6}$/.test(code.replace(/\s/g, ''))) {
    const step = totpStep(user.totpSecret, code);
    // код принимается один раз: повтор (подсмотрели, перехватили) — отказ
    if (step !== null && (await redis().set(usedKey(user.id, step, code), '1', 'EX', 120, 'NX'))) {
      await redis().del(failKey(user.id));
      return { ok: true, via: 'app' };
    }
  } else if (isRecoveryFormat(code)) {
    const hash = hashRecovery(code);
    // убрать код из списка и проверить, что он там был, — одним запросом (два входа с одним кодом не пройдут)
    const left = await db().$queryRaw<{ left: number }[]>`
      UPDATE "admin"."users" SET "recovery_codes" = array_remove("recovery_codes", ${hash})
      WHERE "id" = ${user.id} AND ${hash} = ANY("recovery_codes")
      RETURNING cardinality("recovery_codes") AS "left"`;
    if (left.length) {
      await redis().del(failKey(user.id));
      return { ok: true, via: 'recovery', left: Number(left[0].left) };
    }
  }
  const fails = await redis().incr(failKey(user.id));
  if (fails === 1) await redis().expire(failKey(user.id), FAIL_WINDOW);
  return { ok: false, reason: fails >= MAX_FAILS ? 'too_many' : 'bad_code' };
}

/** Сообщение пользователю о неверном коде. */
export const codeProblem = (reason: 'bad_code' | 'too_many') =>
  reason === 'too_many' ? 'Слишком много неверных кодов. Подождите 15 минут.' : 'Неверный код. Проверьте время на телефоне и введите новый код.';

/** Новые резервные коды (прежние перестают действовать). */
export async function renewRecoveryCodes(userId: number): Promise<string[]> {
  const codes = newRecoveryCodes();
  await db().user.update({ where: { id: userId }, data: { recoveryCodes: codes.map(hashRecovery) } });
  return codes;
}

/** Выключить 2FA (сам пользователь — с кодом; администратор — сбросом, если телефон потерян). */
export async function disableTwoFactor(userId: number): Promise<void> {
  await db().user.update({ where: { id: userId }, data: { totpSecret: null, totpEnabledAt: null, recoveryCodes: [] } });
  await redis().del(setupKey(userId), failKey(userId));
}
