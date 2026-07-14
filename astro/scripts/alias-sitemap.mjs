/**
 * alias-sitemap.mjs — postbuild.
 *
 * @astrojs/sitemap генерит только sitemap-index.xml + sitemap-N.xml.
 * Краулеры, SEO-аудиты и вебмастера ищут карту по КАНОНИЧЕСКОМУ адресу
 * /sitemap.xml — без него аудит репортит «sitemap не найден» (был 404).
 *
 * Копируем сгенерированный индекс в dist/sitemap.xml, чтобы /sitemap.xml
 * отдавал актуальный sitemapindex (внутри — абсолютные ссылки на sitemap-N.xml).
 * Копия, а не ручной файл: остаётся в синхроне при любом числе под-карт.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('./dist');
const SRC = path.join(DIST, 'sitemap-index.xml');
const DST = path.join(DIST, 'sitemap.xml');

if (!fs.existsSync(SRC)) {
  console.warn('[alias-sitemap] нет dist/sitemap-index.xml — пропускаю');
  process.exit(0);
}

fs.copyFileSync(SRC, DST);
const size = fs.statSync(DST).size;
console.log(`[alias-sitemap] dist/sitemap.xml ← sitemap-index.xml (${size} B)`);
