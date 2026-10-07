/**
 * Дымовая проверка админки в браузере: вход, все разделы, ошибки консоли,
 * скриншоты. Пароль — из ADMIN_SMOKE_PASSWORD (в репозиторий не пишется).
 *
 *   ADMIN_SMOKE_EMAIL=… ADMIN_SMOKE_PASSWORD=… npx tsx tools/checks/src/admin-smoke.ts [каталог-скриншотов]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { chromiumPath } from './browser.ts';

const base = process.env.ADMIN_BASE ?? 'http://127.0.0.1:3300';
const email = process.env.ADMIN_SMOKE_EMAIL ?? '';
const password = process.env.ADMIN_SMOKE_PASSWORD ?? '';
const outDir = process.argv[2] ?? path.resolve('tools/checks/report/admin');
fs.mkdirSync(outDir, { recursive: true });

const PAGES = ['/', '/catalog', '/pages', '/settings', '/media', '/redirects', '/stock', '/leads', '/users', '/audit'];

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const problems: string[] = [];
page.on('console', (m) => {
  // предпросмотр в песочнице без скриптов — так задумано, не ошибка
  if (m.type() === 'error' && !m.text().includes('about:srcdoc')) problems.push(`[console] ${page.url()} ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${page.url()} ${e.message.slice(0, 300)}`));
page.on('response', (r) => {
  if (r.status() >= 500) problems.push(`[${r.status()}] ${r.url()}`);
});

await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
await page.fill('input[name=email]', email);
await page.fill('input[name=password]', password);
await page.click('button[type=submit]');
await page.waitForURL(`${base}/`, { timeout: 60_000 });

for (const p of PAGES) {
  const t0 = Date.now();
  await page.goto(`${base}${p}`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(500);
  const file = path.join(outDir, `${p === '/' ? 'dashboard' : p.slice(1).replace(/\//g, '_')}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`${p.padEnd(12)} ${Date.now() - t0} мс  ${await page.title()}`);
}

// карточка товара: первый товар подкатегории каталога, вкладка «Описание и характеристики»
await page.goto(`${base}/catalog?c=drobemetnoe-oborudovanie&s=kranovogo-tipa`, { waitUntil: 'networkidle' });
const first = page.locator('table a[href^="/catalog/products/"]').first();
if (await first.count()) {
  await first.click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /^Описание и характеристики/ }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, 'editor.png') });
  console.log(`редактор: ${page.url()}`);
}

await browser.close();
console.log(problems.length ? `\nпроблемы:\n${problems.join('\n')}` : '\nошибок нет');
