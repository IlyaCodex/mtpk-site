import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeArticleLd } from './article-ld';

const doc = (ld: object) => `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body></body></html>`;
const read = (html: string) => JSON.parse(/<script[^>]*>([\s\S]*?)<\/script>/.exec(html)![1]);
const page = { publishedAt: '2026-10-02T10:00:00.000Z', modifiedAt: null, lastmodAt: '2026-10-13T10:00:00.000Z' };

test('статье без автора и дат — компания и даты страницы', () => {
  const out = read(completeArticleLd(doc({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Article', headline: 'Аспирация' }] }), page));
  const article = out['@graph'][0];
  assert.equal(article.datePublished, '2026-10-02T10:00:00.000Z');
  assert.equal(article.dateModified, '2026-10-13T10:00:00.000Z');
  assert.equal(article.author.name, 'УралИндуктор');
  assert.equal(article.publisher['@type'], 'Organization');
});

test('дата правки из документа приоритетнее; публикация не позже правки', () => {
  const out = read(completeArticleLd(doc({ '@type': 'Article', headline: 'Дефекты', dateModified: '2026-10-01', author: { '@type': 'Organization', name: 'X' } }), page));
  assert.equal(out.dateModified, '2026-10-01');
  assert.equal(out.datePublished, '2026-10-01');
  assert.equal(out.author.name, 'X', 'свой автор не трогается');
});

test('другая разметка и битый JSON — без изменений', () => {
  const crumbs = doc({ '@type': 'BreadcrumbList', itemListElement: [] });
  assert.equal(completeArticleLd(crumbs, page), crumbs);
  const broken = '<script type="application/ld+json">{oops</script>';
  assert.equal(completeArticleLd(broken, page), broken);
});
