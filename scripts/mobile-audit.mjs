#!/usr/bin/env node
/**
 * Мобильный аудит верстки: открывает каждую страницу собранного сайта
 * (astro/dist) в ширине 375px и ищет горизонтальный скролл — главный
 * признак «поехавшей» мобильной верстки. Для проблемных страниц находит
 * конкретный элемент-виновник (который шире экрана) и делает скриншот.
 *
 * Запуск из корня проекта (нужен собранный dist: cd astro && npm run build):
 *   node scripts/mobile-audit.mjs            # все 517 страниц, ~10-15 мин
 *   node scripts/mobile-audit.mjs --limit 30 # быстрая проба на 30 страницах
 *
 * Результат:
 *   docs/mobile-audit.csv        — таблица: url; overflow_px; виновник
 *   /tmp/mobile-shots/*.png      — скриншоты проблемных страниц (375px)
 *
 * Требует playwright (как shot.sh): npx playwright install chromium
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'astro', 'dist');
const OUT_CSV = join(ROOT, 'docs', 'mobile-audit.csv');
const SHOTS = '/tmp/mobile-shots';
const WIDTH = 375;
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i > -1 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();

if (!existsSync(DIST)) {
  console.error('Нет astro/dist — сначала собери сайт: cd astro && npm run build');
  process.exit(1);
}

// Динамический импорт playwright из astro/node_modules или глобально
let chromium;
try {
  ({ chromium } = await import(join(ROOT, 'astro', 'node_modules', 'playwright', 'index.mjs')));
} catch {
  try { ({ chromium } = await import('playwright')); }
  catch {
    console.error('Не найден playwright. Установи: cd astro && npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }
}

// --- простой статический сервер для dist ---
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(DIST, p);
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch { res.writeHead(404); res.end(); return; }
  try {
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(4499, r));

// --- список страниц = все index.html в dist ---
const pages = execSync(`find "${DIST}" -name index.html`, { encoding: 'utf-8' })
  .trim().split('\n')
  .map(f => f.slice(DIST.length).replace(/index\.html$/, ''))
  .sort()
  .slice(0, LIMIT);
console.log(`Страниц к проверке: ${pages.length} (ширина ${WIDTH}px)`);

mkdirSync(SHOTS, { recursive: true });
mkdirSync(dirname(OUT_CSV), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 812 } });
const page = await ctx.newPage();
const rows = [['url', 'overflow_px', 'culprit']];
let bad = 0;

for (const [i, url] of pages.entries()) {
  try {
    await page.goto(`http://localhost:4499${url}`, { waitUntil: 'load', timeout: 20000 });
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      if (overflow <= 1) return { overflow: 0, culprit: '' };
      // ищем самый широкий элемент, вылезающий за экран
      let worst = null, worstW = 0;
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > doc.clientWidth + 1 && rect.width > worstW) {
          worstW = rect.width; worst = el;
        }
      }
      const tag = worst ? `${worst.tagName.toLowerCase()}${worst.className ? '.' + String(worst.className).split(' ')[0] : ''} (${Math.round(worstW)}px)` : '?';
      return { overflow, culprit: tag };
    });
    if (r.overflow > 1) {
      bad++;
      rows.push([url, r.overflow, r.culprit]);
      const name = url.replace(/[\/]+/g, '_').replace(/^_|_$/g, '') || 'home';
      await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });
    }
  } catch (e) {
    rows.push([url, 'ERROR', String(e).slice(0, 80)]);
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${pages.length} (проблемных: ${bad})`);
}

writeFileSync(OUT_CSV, rows.map(r => r.join(';')).join('\n'));
console.log(`\nГотово. Проблемных страниц: ${bad} из ${pages.length}`);
console.log(`Отчёт: ${OUT_CSV}`);
console.log(`Скриншоты: ${SHOTS}/`);

await browser.close();
server.close();
