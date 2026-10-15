import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageOgImage } from './seo';
import { SITE } from './site';

test('превью товара — первое фото из разметки Product (разметка страницы — строки JSON)', () => {
  const ld = [JSON.stringify({ '@type': 'Product', image: [`${SITE}/img/products/uid-376.png`, `${SITE}/img/products/uid-376-2.png`] })];
  assert.equal(pageOgImage(ld, '/img/hero/drob.jpg'), `${SITE}/img/products/uid-376.png`);
  assert.equal(pageOgImage(['{битый json', ...ld], null), `${SITE}/img/products/uid-376.png`);
});

test('новость в @graph — её фото; общая картинка в разметке не считается своей', () => {
  assert.equal(pageOgImage([{ '@graph': [{ '@type': 'NewsArticle', image: `${SITE}/img/news/a.jpg` }] }], null), `${SITE}/img/news/a.jpg`);
  assert.equal(pageOgImage([{ '@type': 'Product', image: [`${SITE}/og/default.jpg`] }], null), null);
});

test('без фото в разметке — обложка страницы, без обложки — общая картинка', () => {
  assert.equal(pageOgImage([{ '@type': 'BreadcrumbList' }], '/img/hero/pechi.jpg?v=2'), `${SITE}/img/hero/pechi.jpg?v=2`);
  assert.equal(pageOgImage([], null), null);
});
