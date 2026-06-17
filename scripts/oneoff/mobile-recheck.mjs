#!/usr/bin/env node
/**
 * Точечная перепроверка мобильных хвостов (В-5).
 * Берёт URL из docs/mobile-audit.csv (63 проблемных), открывает каждый
 * в 375px на собранном astro/dist и меряет:
 *   - doc.scrollWidth - clientWidth (общий горизонтальный overflow)
 *   - худший элемент, чей правый край вылезает за clientWidth (right > cw)
 * Печатает таблицу и пишет docs/mobile-recheck.csv. Скриншоты — опц. (--shots).
 *
 *   cd astro && npm run build
 *   node scripts/oneoff/mobile-recheck.mjs [--shots <dir>]
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'astro', 'dist');
const CSV = join(ROOT, 'docs', 'mobile-audit.csv');
const OUT = join(ROOT, 'docs', 'mobile-recheck.csv');
const WIDTH = 375;
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;

if (!existsSync(DIST)) { console.error('Нет astro/dist — собери: cd astro && npm run build'); process.exit(1); }

let chromium;
try { ({ chromium } = await import(join(ROOT, 'astro', 'node_modules', 'playwright', 'index.mjs'))); }
catch { ({ chromium } = await import('playwright')); }

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(DIST, p);
  try { if (statSync(file).isDirectory()) file = join(file, 'index.html'); }
  catch { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(4499, r));

const urls = readFileSync(CSV, 'utf-8').trim().split('\n').slice(1)
  .map(l => l.split(';')[0]).filter(Boolean);

if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 812 } });
const page = await ctx.newPage();

const rows = [['url', 'scroll_overflow_px', 'worst_right_px', 'culprit']];
let stillBad = 0;
for (const url of urls) {
  try {
    await page.goto(`http://localhost:4499${url}`, { waitUntil: 'load', timeout: 20000 });
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const cw = doc.clientWidth;
      const scrollOver = doc.scrollWidth - cw;
      // худший правый край за вьюпортом (учитывает clip — ищем реальную геометрию)
      let worst = null, worstR = 0;
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right > cw + 1 && rect.right > worstR) { worstR = rect.right; worst = el; }
      }
      const tag = worst ? `${worst.tagName.toLowerCase()}${worst.className && typeof worst.className === 'string' ? '.' + worst.className.split(' ')[0] : ''}` : '';
      return { scrollOver, worstR: Math.round(worstR), cw, tag };
    });
    const bad = r.scrollOver > 1 || r.worstR > r.cw + 1;
    if (bad) stillBad++;
    rows.push([url, r.scrollOver, r.worstR, r.tag]);
    console.log(`${bad ? 'BAD ' : 'ok  '} scroll=${String(r.scrollOver).padStart(4)} right=${String(r.worstR).padStart(4)}/${r.cw}  ${r.tag.padEnd(22)} ${url}`);
    if (SHOTS && bad) {
      const name = url.replace(/[\/]+/g, '_').replace(/^_|_$/g, '') || 'home';
      await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });
    }
  } catch (e) {
    rows.push([url, 'ERR', 'ERR', String(e).slice(0, 60)]);
    console.log(`ERR ${url}: ${String(e).slice(0, 60)}`);
  }
}
writeFileSync(OUT, rows.map(r => r.join(';')).join('\n'));
console.log(`\nОсталось проблемных: ${stillBad} из ${urls.length}. Отчёт: ${OUT}`);
await browser.close();
server.close();
