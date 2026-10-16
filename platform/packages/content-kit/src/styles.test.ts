import assert from 'node:assert/strict';
import { test } from 'node:test';
import { externalStyleUrl, stylesRevision } from './styles.ts';

test('адрес стилей страницы: хеш CSS в имени, ревизия обработки в ?r=', () => {
  assert.match(stylesRevision(), /^[a-f0-9]{8}$/);
  assert.equal(stylesRevision(), stylesRevision());
  assert.equal(externalStyleUrl('i0123456789ab'), `/css/inline-extracted/inline-i0123456789ab.css?r=${stylesRevision()}`);
});
