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

test('свои переменные стилей (ownVars): тёмное значение — своё для каждой роли, области — как у переменной', () => {
  const css = ':root{--ink:#1c3038;--paper:#fff}.a{color:var(--ink);background:var(--paper)}.th{background:var(--ink);color:#fff}.hero{--ink:#ffffff}';
  const out = darkVars(css, { ownVars: true });
  assert.ok(out.includes('.a{color:var(--dkv-tx-ink, var(--ink));background:var(--dkv-bg-paper, var(--paper))}'), out);
  assert.ok(out.includes('.th{background:var(--dkv-bg-ink, var(--ink));color:#fff}'), out);
  // :root — сам <html>: текст из --ink светлеет, тёмная подложка из --ink остаётся
  assert.match(out, /\nhtml\[data-theme="dark"\]\{--dkv-tx-ink:#[a-f][0-9a-f]{5};--dkv-bg-ink:initial\}/);
  assert.match(out, /\nhtml\[data-theme="dark"\]\{--dkv-bg-paper:#1[0-9a-f]{5}\}/);
  // переопределение в блоке повторяется в тёмной теме: белый текст героя остаётся белым
  assert.match(out, /\nhtml\[data-theme="dark"\] \.hero\{--dkv-tx-ink:initial;--dkv-bg-ink:#1[0-9a-f]{5}\}/);
  // без ownVars — как раньше; повторный вызов ничего не меняет
  assert.equal(darkVars(css), css);
  assert.equal(darkVars(out, { ownVars: true }), out);
});

test('ownVars: html.класс и списки селекторов; переменная не цветом или в @media — как есть', () => {
  const out = darkVars('html.a .b, .c{--line:#e0e6e6}.d{border:1px solid var(--line)}', { ownVars: true });
  assert.match(out, /html\[data-theme="dark"\]\.a \.b,html\[data-theme="dark"\] \.c\{--dkv-ln-line:#[0-9a-f]{6}\}/);
  const kept = ':root{--x:#fff;--y:var(--x)}@media print{:root{--z:#fff}}.e{background:var(--x);color:var(--y);border-color:var(--z)}';
  const res = darkVars(kept, { ownVars: true });
  assert.ok(res.includes('.e{background:var(--dkv-bg-x, var(--x));color:var(--y);border-color:var(--z)}'), res);
});
