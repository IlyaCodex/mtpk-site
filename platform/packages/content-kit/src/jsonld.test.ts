import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNewsArticleSchema, buildPageJsonLd, buildProductSchema } from './jsonld.ts';

const NEWS = `<section><h1 class="legal-hero__title">МТПК УралИндуктор отметили Юбилей!</h1>
<p>Новости · 03.06.2024</p><img src="/img/news/yubilej.png" alt="" srcset="/img/news/yubilej.png?w=480 480w"></section>`;

test('новость: NewsArticle с заголовком, фото, датами и компанией как автором', () => {
  const json = buildPageJsonLd(NEWS, {
    path: '/news/yubilej/',
    title: 'Юбилей',
    description: 'Отметили юбилей',
    publishedAt: '2024-06-03T07:00:00.000Z',
    modifiedAt: '2026-10-02T10:00:00.000Z',
  }).map((s) => JSON.parse(s));
  const news = json.find((x) => x['@type'] === 'NewsArticle');
  assert.ok(news, 'есть NewsArticle');
  assert.equal(news.headline, 'МТПК УралИндуктор отметили Юбилей!');
  assert.deepEqual(news.image, ['https://uralinduktor.ru/img/news/yubilej.png']);
  assert.equal(news.datePublished, '2024-06-03T07:00:00.000Z');
  assert.equal(news.dateModified, '2026-10-02T10:00:00.000Z');
  assert.deepEqual(news.author, { '@id': 'https://uralinduktor.ru/#organization' });
  assert.equal(news.mainEntityOfPage, 'https://uralinduktor.ru/news/yubilej/');
});

test('список новостей и другие разделы — без NewsArticle', () => {
  for (const path of ['/news/', '/kontakty/', '/news/a/b/']) {
    const types = buildPageJsonLd(NEWS, { path, title: 't', description: null }).map((s) => JSON.parse(s)['@type']);
    assert.ok(!types.includes('NewsArticle'), path);
  }
});

test('дата правки не раньше публикации; длинный заголовок — до 110 знаков', () => {
  const long = `<h1>${'Очень длинный заголовок новости '.repeat(6)}</h1>`;
  const news = JSON.parse(buildNewsArticleSchema(long, null, 'https://uralinduktor.ru/news/x/', { published: '2025-05-15', modified: '2025-01-01' })!);
  assert.equal(news.dateModified, '2025-05-15');
  assert.ok(news.headline.length <= 110);
  assert.ok(news.headline.endsWith('…'));
});

test('товар: image — только свои фото; без фото поле не заполняется (общая картинка сайта — не товар)', () => {
  const url = 'https://uralinduktor.ru/products/zapchasti/drobemetnoe/bolty/';
  const withPhoto = JSON.parse(buildProductSchema('<div class="product-overview"><h1>Болты</h1><div class="product-photo" data-zoom="/img/zp/bolty.png?v=2"></div></div>', null, url)!);
  assert.deepEqual(withPhoto.image, ['https://uralinduktor.ru/img/zp/bolty.png']);
  const noPhoto = JSON.parse(buildProductSchema('<div class="product-overview"><h1>Каретка тельфера</h1></div>', null, url)!);
  assert.equal(noPhoto['@type'], 'Product');
  assert.equal(noPhoto.image, undefined);
});
