import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { qrMatrix, qrSvg } from './qr';

const versionOf = (text: string) => (qrMatrix(text).length - 17) / 4;

test('версия — наименьшая, в которую помещается текст (уровень M)', () => {
  assert.equal(versionOf('a'.repeat(14)), 1);
  assert.equal(versionOf('a'.repeat(15)), 2);
  assert.equal(versionOf('a'.repeat(213)), 10);
  assert.equal(versionOf('a'.repeat(214)), 11);
  assert.equal(versionOf('a'.repeat(412)), 15);
  assert.throws(() => qrMatrix('a'.repeat(413)), /слишком длинный/);
});

test('угловые квадраты на местах', () => {
  const m = qrMatrix('https://uralinduktor.ru/');
  const size = m.length;
  for (const [x0, y0] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let i = 0; i < 7; i++) {
      assert.equal(m[y0][x0 + i], true);
      assert.equal(m[y0 + 6][x0 + i], true);
      assert.equal(m[y0 + i][x0], true);
      assert.equal(m[y0 + i][x0 + 6], true);
    }
    assert.equal(m[y0 + 1][x0 + 1], false);
    assert.equal(m[y0 + 3][x0 + 3], true);
  }
});

test('эталон: адрес приложения даёт тот же код, что прочитал декодер ZXing', () => {
  // проверено 15.10.2026: картинка этого кода читается zxing-cpp в исходный адрес
  const text =
    'otpauth://totp/%D0%A3%D1%80%D0%B0%D0%BB%D0%98%D0%BD%D0%B4%D1%83%D0%BA%D1%82%D0%BE%D1%80%3Aadmin%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=%D0%A3%D1%80%D0%B0%D0%BB%D0%98%D0%BD%D0%B4%D1%83%D0%BA%D1%82%D0%BE%D1%80';
  const m = qrMatrix(text);
  const hash = crypto.createHash('sha256').update(m.map((row) => row.map((d) => (d ? 1 : 0)).join('')).join('\n')).digest('hex');
  assert.equal(m.length, 57);
  assert.equal(hash, '0eae7e22f20e2b782da63071ed9ac016e1a9946df4d58882b5365a5211e03a2c');
});

test('SVG: поле 4 модуля, только свои символы', () => {
  const svg = qrSvg('test');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 29 29"/);
  assert.match(svg, /<path d="(M\d+ \d+h\d+v1h-\d+z)+" fill="#000"\/><\/svg>$/);
});
