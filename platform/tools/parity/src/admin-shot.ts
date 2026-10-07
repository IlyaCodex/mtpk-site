/**
 * Скриншоты страниц админки для проверки вёрстки: вход и снимок каждого
 * адреса (экран 1600×1000, по желанию — во всю длину). «Адрес@Текст» —
 * перед снимком нажать кнопку с этим текстом (вкладку редактора и т. п.).
 * Ошибки консоли и ответы 5xx печатаются. Пароль — из ADMIN_SMOKE_PASSWORD.
 *
 *   ADMIN_SMOKE_EMAIL=… ADMIN_SMOKE_PASSWORD=… npx tsx tools/parity/src/admin-shot.ts <каталог> /catalog "/pages/65@Характеристики" [--full]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { chromiumPath } from './visual-check.ts';

const base = process.env.ADMIN_BASE ?? 'http://127.0.0.1:3300';
const args = process.argv.slice(2);
const full = args.includes('--full');
const [outDir, ...paths] = args.filter((a) => a !== '--full');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const problems: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`[console] ${page.url()} ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${page.url()} ${e.message.slice(0, 300)}`));
page.on('response', (r) => {
  if (r.status() >= 500) problems.push(`[${r.status()}] ${r.url()}`);
});

await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
await page.fill('input[name=email]', process.env.ADMIN_SMOKE_EMAIL ?? '');
await page.fill('input[name=password]', process.env.ADMIN_SMOKE_PASSWORD ?? '');
await page.click('button[type=submit]');
await page.waitForURL(`${base}/`, { timeout: 60_000 });

for (const [i, target] of paths.entries()) {
  const t0 = Date.now();
  const [p, click] = target.split('@');
  await page.goto(`${base}${p}`, { waitUntil: 'networkidle', timeout: 120_000 });
  if (click) await page.getByRole('button', { name: click }).first().click();
  await page.waitForTimeout(click ? 2500 : 800);
  const name = `${String(i + 1).padStart(2, '0')}-${target.replace(/^\//, '').replace(/[^a-zA-Zа-яА-Я0-9-]+/g, '_').slice(0, 60) || 'dashboard'}.png`;
  await page.screenshot({ path: path.join(outDir, name), fullPage: full });
  console.log(`${name}  ${Date.now() - t0} мс  ${await page.title()}`);
}

await browser.close();
console.log(problems.length ? `\nпроблемы:\n${problems.join('\n')}` : '\nошибок нет');
