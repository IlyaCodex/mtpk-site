/**
 * Сверка переноса с Astro-сборкой: стоки и индекс сравнения, посчитанные
 * новым кодом по тем же исходникам, должны совпасть с файлами, которые
 * лежат в astro/public/data (их пишет prebuild старой сборки).
 * Если Astro-проекта рядом нет (CI, прод) — тест пропускается.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRawPages } from './raw-source.ts';
import { resolveStock, type StockConfigItem } from './stock.ts';
import { buildCompareIndex } from './compare.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const astro = path.resolve(here, '../../../../astro');
const hasAstro = fs.existsSync(path.join(astro, 'src/raw-pages'));

const pages = hasAstro ? readRawPages(path.join(astro, 'src/raw-pages')) : [];
const byPath = new Map(pages.map((p) => [p.path, p]));
const lookup = (p: string) => {
  const page = byPath.get(p);
  return page ? { body: page.body, title: page.meta.title ?? '' } : null;
};

test('stock.json совпадает со сборкой Astro', { skip: !hasAstro }, () => {
  const config = JSON.parse(fs.readFileSync(path.join(astro, 'data/stock.config.json'), 'utf-8'));
  const expected = JSON.parse(fs.readFileSync(path.join(astro, 'public/data/stock.json'), 'utf-8'));
  const { items } = resolveStock(config.items as StockConfigItem[], lookup);
  assert.deepEqual(items, expected.items);
});

test('compare-index.json совпадает со сборкой Astro', { skip: !hasAstro }, () => {
  const expected = JSON.parse(fs.readFileSync(path.join(astro, 'public/data/compare-index.json'), 'utf-8'));
  const expectedSections = JSON.parse(fs.readFileSync(path.join(astro, 'public/data/compare-sections.json'), 'utf-8'));
  const { index, sections } = buildCompareIndex(
    pages.map((p) => ({ path: p.path, body: p.body })),
    new Date(`${expected.generated}T12:00:00Z`),
  );
  assert.deepEqual(sections, expectedSections);
  assert.deepEqual(index, expected);
});
