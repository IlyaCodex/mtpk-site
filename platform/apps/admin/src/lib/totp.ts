import crypto from 'node:crypto';

/**
 * Двухфакторный вход: одноразовые коды из приложения (TOTP, RFC 6238) — Яндекс Ключ,
 * Google Authenticator, Microsoft Authenticator и подобные. Секрет — 20 случайных байт;
 * в приложение он попадает QR-кодом (адрес otpauth://) или строкой Base32. Код —
 * 6 цифр, меняется каждые 30 секунд. Резервные коды — на случай потери телефона.
 */
export const ISSUER = 'УралИндуктор';
const STEP_S = 30;
const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let value = 0;
  let bits = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const out: number[] = [];
  let value = 0;
  let bits = 0;
  for (const ch of text.toUpperCase().replace(/[\s=-]/g, '')) {
    const index = ALPHABET.indexOf(ch);
    if (index < 0) throw new Error(`не Base32: ${ch}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Новый секрет (Base32, 32 знака). */
export const newSecret = () => base32Encode(crypto.randomBytes(20));

/** Код для шага counter (RFC 4226). */
export function hotp(secret: string, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hash = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
  const at = hash[hash.length - 1] & 0xf;
  const n = ((hash[at] & 0x7f) << 24) | (hash[at + 1] << 16) | (hash[at + 2] << 8) | hash[at + 3];
  return String(n % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Шаг (номер 30-секундного окна), которому соответствует код, или null. Подходят и
 * соседние шаги: часы телефона могут спешить или отставать на полминуты.
 */
export function totpStep(secret: string, code: string, now = Date.now()): number | null {
  const digits = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(digits)) return null;
  const step = Math.floor(now / 1000 / STEP_S);
  for (const s of [step, step - 1, step + 1]) {
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, s)), Buffer.from(digits))) return s;
  }
  return null;
}

/** Адрес для приложения (его и кодирует QR-код). Алгоритм, длина и период — стандартные, не указываются. */
export const otpauthUri = (secret: string, account: string) =>
  `otpauth://totp/${encodeURIComponent(`${ISSUER}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}`;

/** Секрет группами по 4 знака — для ввода в приложение вручную. */
export const groupSecret = (secret: string) => secret.replace(/(.{4})(?=.)/g, '$1 ');

/** Резервный код: 12 знаков Base32 (60 бит), «abcd-efgh-ijkl». */
export const isRecoveryFormat = (code: string) => normalizeRecovery(code).length === 12;
export const normalizeRecovery = (code: string) => code.toLowerCase().replace(/[^a-z2-7]/g, '');
export const hashRecovery = (code: string) => crypto.createHash('sha256').update(normalizeRecovery(code)).digest('hex');

export function newRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const s = base32Encode(crypto.randomBytes(8)).slice(0, 12).toLowerCase();
    return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
  });
}
