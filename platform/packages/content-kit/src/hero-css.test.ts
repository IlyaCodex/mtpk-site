import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heroImageInCss, heroImageInStyle, heroInlineStyle, heroMobileUrl, heroPreload, responsiveHeroCss } from './hero-css.ts';

test('копия для телефона: ширина 828, свои параметры сохраняются', () => {
  assert.equal(heroMobileUrl('/img/hero.png'), '/img/hero.png?w=828');
  assert.equal(heroMobileUrl('/img/hero.png?v=5'), '/img/hero.png?v=5&w=828');
});

test('обложка раздела: правило для узких экранов с тем же селектором', () => {
  const css = `.cat-hero__image {position: absolute; inset: 0; background: var(--neutral-950) url('/img/hero-x.png?v=2') center/cover no-repeat; z-index: 0; }`;
  const out = responsiveHeroCss(css);
  assert.ok(out.startsWith(css), 'исходное правило не меняется');
  assert.match(out, /@media \(max-width:767px\)\{\.cat-hero__image\{background-image:url\('\/img\/hero-x\.png\?v=2&w=828'\)\}\}/);
});

test('главная: .hero__image с background-image', () => {
  const out = responsiveHeroCss(`.hero__image {\n  position: absolute;\n  background-image: url('/img/hero-bg.png');\n  animation: k 24s;\n}`);
  assert.match(out, /\.hero__image\{background-image:url\('\/img\/hero-bg\.png\?w=828'\)\}/);
});

test('CSS с тегом <style> — правило внутри тега, селектор без тега', () => {
  const out = responsiveHeroCss(`<style>.cat-hero__image { background: url(/img/a.jpg) center/cover; }</style>`);
  assert.ok(out.endsWith('</style>'));
  assert.match(out, /\{\.cat-hero__image\{background-image:url\('\/img\/a\.jpg\?w=828'\)\}\}\n<\/style>$/);
});

test('сложные случаи не трогаются: @media, градиент, две картинки, чужой адрес, без картинки', () => {
  for (const css of [
    `@media (max-width: 600px) { .cat-hero__image { background: url(/img/m.png); } }`,
    `.cat-hero__image { background: linear-gradient(#000, #fff), url(/img/a.png); }`,
    `.cat-hero__image { background: url(/img/a.png), url(/img/b.png); }`,
    `.cat-hero__image { background: url(https://cdn.example.com/a.png); }`,
    `.cat-hero__image { position: absolute; }`,
    `.other { background: url(/img/a.png); }`,
  ]) assert.equal(responsiveHeroCss(css), css, css);
});

test('фото во встроенном style блока — в переменные; прочие свойства сохраняются', () => {
  assert.equal(heroImageInStyle("background-image: url('/img/kovshi-hero.jpg?v=2');"), '/img/kovshi-hero.jpg?v=2');
  assert.equal(heroImageInStyle('background-position: left;'), null);
  assert.equal(heroImageInStyle(undefined), null);
  assert.equal(
    heroInlineStyle("background-image: url('/img/kovshi-hero.jpg');"),
    "--hero-img:url('/img/kovshi-hero.jpg');--hero-img-sm:url('/img/kovshi-hero.jpg?w=828')",
  );
  assert.equal(
    heroInlineStyle("background-position: 30% 50%; background-image: url('/img/a.png?v=3');"),
    "background-position: 30% 50%;--hero-img:url('/img/a.png?v=3');--hero-img-sm:url('/img/a.png?v=3&w=828')",
  );
  assert.equal(heroInlineStyle('background-image: url(https://cdn.example.com/a.png)'), null);
});

test('фото обложки в CSS — последнее по каскаду; предзагрузка — те же адреса', () => {
  assert.equal(heroImageInCss(`.cat-hero__image{background:url('/img/a.png')} .cat-hero__image{background:url('/img/b.png?v=1')}`), '/img/b.png?v=1');
  assert.equal(heroImageInCss(`.x{background:url('/img/a.png')}`), null);
  // стили страницы приходят уже с дописанным правилом для телефонов — фото обложки всё равно исходное
  assert.equal(heroImageInCss(responsiveHeroCss(`.cat-hero__image{background:url('/img/b.png?v=1') center/cover}`)), '/img/b.png?v=1');
  assert.deepEqual(heroPreload('/img/b.png?v=1'), [
    { href: '/img/b.png?v=1&w=828', media: '(max-width: 767px)' },
    { href: '/img/b.png?v=1', media: '(min-width: 768px)' },
  ]);
});
