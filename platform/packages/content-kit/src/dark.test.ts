import assert from 'node:assert/strict';
import { test } from 'node:test';
import { darkVars } from './dark.ts';

/** Объявления без приписки с тёмными значениями. */
const body = (css: string) => darkVars(css).split('\nhtml[data-theme="dark"]{')[0];
const defs = (css: string) => Object.fromEntries((/html\[data-theme="dark"\]\{([^}]*)\}/.exec(darkVars(css))?.[1] ?? '').split(';').filter(Boolean).map((d) => d.split(':') as [string, string]));

test('светлый фон, тёмный текст, светлая рамка → переменные с исходным цветом', () => {
  assert.equal(body('.a{background:#fff;color:#18181b;border:1px solid #e5e5e5}'), '.a{background:var(--dk-bg-ffffff, #fff);color:var(--dk-tx-18181b, #18181b);border:1px solid var(--dk-ln-e5e5e5, #e5e5e5)}');
  const d = defs('.a{background:#fff;color:#18181b}');
  // белый фон — тёмный, тёмный текст — светлый
  assert.match(d['--dk-bg-ffffff'], /^#1[0-9a-f]{5}$/);
  assert.match(d['--dk-tx-18181b'], /^#[c-f][0-9a-f]{5}$/);
});

test('белый текст и тёмные фоны не трогаются', () => {
  const css = '.hero{background:#101f26;color:#fff}.btn{background:var(--teal-600);color:white}';
  assert.equal(darkVars(css), css);
});

test('цвета палитры через var(--…) — по свойству; смысловые токены — как есть', () => {
  assert.equal(body('.c{background:var(--neutral-0)}'), '.c{background:var(--dk-bg-ffffff, var(--neutral-0))}');
  assert.equal(body('.c{color:var(--teal-600, #1F5E78)}'), '.c{color:var(--dk-tx-1f5e78, var(--teal-600, #1F5E78))}');
  assert.equal(body('.c{color:var(--text-primary)}'), '.c{color:var(--text-primary)}');
  // запасной цвет переменной (её может не быть) — тоже с тёмным значением
  assert.equal(body('.t{background:var(--bg-secondary, #f6f8f9)}'), '.t{background:var(--bg-secondary, var(--dk-bg-f6f8f9, #f6f8f9))}');
});

test('url(), строки, свои переменные и тени — как есть; градиенты — по стопам', () => {
  const svg = '.i{background:url("data:image/svg+xml;utf8,<svg fill=\'#fff\'/>") no-repeat;--paper:#fff;box-shadow:0 1px 2px #e5e5e5}';
  assert.equal(darkVars(svg), svg);
  assert.equal(body('.g{background:linear-gradient(#fff,rgba(255,255,255,0))}'), '.g{background:linear-gradient(var(--dk-bg-ffffff, #fff),rgba(255,255,255,0))}');
});

test('@media, комментарии, !important; повторный вызов ничего не меняет', () => {
  const css = '@media (max-width: 640px){.a:hover{/* фон: белый */background-color:#FAFAFA !important}}';
  const once = darkVars(css);
  assert.ok(once.startsWith('@media (max-width: 640px){.a:hover{/* фон: белый */background-color:var(--dk-bg-fafafa, #FAFAFA) !important}}'));
  assert.equal(darkVars(once).split('\nhtml')[0], once.split('\nhtml')[0]);
});
