import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractInlineStyles, styleClassName } from './inline-styles.ts';

test('style="" → класс и правило', () => {
  const { html, rules } = extractInlineStyles('<div class="a" style="margin: 0; color: red">x</div>');
  const cls = styleClassName('margin:0;color:red');
  assert.equal(html, `<div class="a ${cls}">x</div>`);
  assert.equal(rules.get(cls), 'margin:0;color:red');
});

test('цвет иконки остаётся у <svg>, остальное — классом', () => {
  const only = extractInlineStyles('<svg viewBox="0 0 24 24" style="color: #1f5e78"><path d="M0 0"></path></svg>');
  assert.equal(only.html, '<svg viewBox="0 0 24 24" style="color:#1f5e78"><path d="M0 0"></path></svg>');
  assert.equal(only.rules.size, 0);
  const mixed = extractInlineStyles('<svg style="width:20px;color:#4fab3a"></svg>');
  const cls = styleClassName('width:20px');
  assert.equal(mixed.html, `<svg style="color:#4fab3a" class="${cls}"></svg>`);
  assert.equal(mixed.rules.get(cls), 'width:20px');
  // не у иконки — как обычно
  assert.equal(extractInlineStyles('<span style="color:#4fab3a">x</span>').rules.size, 1);
});
