/**
 * alias-sitemap.mjs — postbuild.
 *
 * @astrojs/sitemap генерит только sitemap-index.xml + sitemap-N.xml.
 * Краулеры, SEO-аудиты и вебмастера ищут карту по КАНОНИЧЕСКОМУ адресу
 * /sitemap.xml — без него аудит репортит «sitemap не найден» (был 404).
 *
 * Что кладём в dist/sitemap.xml:
 *   - под-карта ОДНА  → её содержимое (полный <urlset> со всеми URL).
 *     Так /sitemap.xml сразу показывает все адреса — привычнее людям и софту,
 *     не нужен лишний переход по индексу.
 *   - под-карт НЕСКОЛЬКО → сам <sitemapindex> (полный список в один файл
 *     не влезает по лимиту 50k URL, индекс — единственный корректный вариант).
 *
 * Файл всегда пересоздаётся из свежей сборки, поэтому не протухает.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('./dist');
const INDEX = path.join(DIST, 'sitemap-index.xml');
const DST = path.join(DIST, 'sitemap.xml');

if (!fs.existsSync(INDEX)) {
  console.warn('[alias-sitemap] нет dist/sitemap-index.xml — пропускаю');
  process.exit(0);
}

const indexXml = fs.readFileSync(INDEX, 'utf-8');
// <loc>https://site/sitemap-0.xml</loc> → имена под-карт
const subs = [...indexXml.matchAll(/<loc>[^<]*?\/(sitemap-\d+\.xml)<\/loc>/g)].map((m) => m[1]);

let source = INDEX;
let kind = 'sitemapindex';

if (subs.length === 1) {
  const only = path.join(DIST, subs[0]);
  if (fs.existsSync(only)) {
    source = only;
    kind = 'urlset';
  }
}

fs.copyFileSync(source, DST);
const xml = fs.readFileSync(DST, 'utf-8');
const urls = (xml.match(/<loc>/g) || []).length;
console.log(
  `[alias-sitemap] dist/sitemap.xml ← ${path.basename(source)} (${kind}, ${urls} URL, ${fs.statSync(DST).size} B)`
);
