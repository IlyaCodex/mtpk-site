import assert from 'node:assert/strict';
import { test } from 'node:test';
import { base32Decode, base32Encode, groupSecret, hashRecovery, hotp, isRecoveryFormat, newRecoveryCodes, newSecret, otpauthUri, totpStep } from './totp';

// RFC 6238, приложение B: секрет «12345678901234567890», SHA-1; последние 6 цифр 8-значных кодов
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const RFC_CODES: [number, string][] = [
  [59, '287082'],
  [1111111109, '081804'],
  [1111111111, '050471'],
  [1234567890, '005924'],
  [2000000000, '279037'],
  [20000000000, '353130'],
];

test('коды совпадают с примерами RFC 6238', () => {
  for (const [time, code] of RFC_CODES) {
    assert.equal(hotp(RFC_SECRET, Math.floor(time / 30)), code, `время ${time}`);
    assert.equal(totpStep(RFC_SECRET, code, time * 1000), Math.floor(time / 30));
  }
});

test('Base32: туда и обратно, RFC 4648', () => {
  assert.equal(base32Encode(Buffer.from('foobar')), 'MZXW6YTBOI');
  assert.equal(base32Decode('MZXW6YTBOI').toString(), 'foobar');
  assert.equal(base32Decode('mzxw 6ytb-oi').toString(), 'foobar');
  const secret = newSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.equal(base32Encode(base32Decode(secret)), secret);
});

test('допуск — соседние 30-секундные окна, не дальше', () => {
  const secret = newSecret();
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 30_000);
  assert.equal(totpStep(secret, hotp(secret, step - 1), now), step - 1);
  assert.equal(totpStep(secret, hotp(secret, step + 1), now), step + 1);
  assert.equal(totpStep(secret, hotp(secret, step - 2), now), null);
  assert.equal(totpStep(secret, `${hotp(secret, step).slice(0, 3)} ${hotp(secret, step).slice(3)}`, now), step);
  assert.equal(totpStep(secret, '12345', now), null);
  assert.equal(totpStep(secret, 'abcdef', now), null);
});

test('адрес для приложения и секрет группами', () => {
  const uri = otpauthUri('JBSWY3DPEHPK3PXP', 'admin@example.com');
  assert.equal(uri, 'otpauth://totp/%D0%A3%D1%80%D0%B0%D0%BB%D0%98%D0%BD%D0%B4%D1%83%D0%BA%D1%82%D0%BE%D1%80%3Aadmin%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=%D0%A3%D1%80%D0%B0%D0%BB%D0%98%D0%BD%D0%B4%D1%83%D0%BA%D1%82%D0%BE%D1%80');
  assert.equal(groupSecret('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
});

test('резервные коды: формат, различие, хеш не зависит от записи', () => {
  const codes = newRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  for (const code of codes) {
    assert.match(code, /^[a-z2-7]{4}-[a-z2-7]{4}-[a-z2-7]{4}$/);
    assert.ok(isRecoveryFormat(code));
    assert.equal(hashRecovery(code.toUpperCase().replace(/-/g, ' ')), hashRecovery(code));
  }
  assert.ok(!isRecoveryFormat('123456'));
});
