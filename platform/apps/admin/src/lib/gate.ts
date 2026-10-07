/**
 * Вход в админку — только по секретной ссылке /admin/login?token=<ADMIN_LOGIN_TOKEN>.
 * Правильный токен даёт браузеру «пропуск»: cookie со значением, производным
 * от токена (сам токен не хранится). Без пропуска страница входа и вход по API
 * отвечают 404 — снаружи не видно, что админка здесь есть. Новый токен в .env
 * отменяет все выданные пропуска.
 */
export const GATE_COOKIE = 'mtpk_admin_gate';
export const GATE_TTL = 90 * 24 * 3600;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

export function loginToken(): string | null {
  return process.env.ADMIN_LOGIN_TOKEN || null;
}

/** Значение пропуска для токена. */
export const gatePass = (token: string) => sha256(`mtpk-admin-gate:${token}`);

/** Сравнение секретов без утечки по времени (сравниваются хеши одинаковой длины). */
export async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function hasGate(cookie: string | undefined): Promise<boolean> {
  const token = loginToken();
  return Boolean(token && cookie) && sameSecret(cookie!, await gatePass(token!));
}

/** cookie только по HTTPS — в проде (как у сессии) */
export const secureCookies = () =>
  process.env.ADMIN_SECURE_COOKIE ? process.env.ADMIN_SECURE_COOKIE === 'true' : process.env.NODE_ENV === 'production';
