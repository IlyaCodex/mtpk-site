import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSearchImage } from './page-meta.ts';

test('картинка для поиска: фон с кавычками-сущностями (React), обычными и без кавычек', () => {
  assert.equal(pickSearchImage('<div style="background-image:url(&#x27;/img/hero-shotblast.png&#x27;)"></div>', null), '/img/hero-shotblast.png');
  assert.equal(pickSearchImage('<div style="background-image: url(&quot;/img/a.webp&quot;)"></div>', null), '/img/a.webp');
  assert.equal(pickSearchImage("<div style=\"background-image:url('/img/b.png?v=3')\"></div>", null), '/img/b.png');
  assert.equal(pickSearchImage('<div style="background-image:url(/img/c.png)"></div>', null), '/img/c.png');
  assert.equal(pickSearchImage('<img src="/img/d.png">', '/img/lcp.webp'), '/img/lcp.webp');
});
