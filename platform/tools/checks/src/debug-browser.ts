// Отладка страницы в браузере: ошибки консоли, гидратация, форматы картинок.
// MSYS_NO_PATHCONV=1 npx tsx tools/checks/src/debug-browser.ts /путь/ [base]
import { chromium } from 'playwright';
import { chromiumPath } from './browser.ts';

const p = process.argv[2] ?? '/';
const base = process.argv[3] ?? 'http://127.0.0.1:3200';
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const formats = new Map<string, number>();
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) console.log(`[console.${m.type()}] ${m.text().slice(0, 4000)}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message.slice(0, 600)}`));
page.on('response', (r) => {
  if (r.request().resourceType() !== 'image') return;
  const ct = r.headers()['content-type'] ?? '?';
  formats.set(ct, (formats.get(ct) ?? 0) + 1);
});
await page.route('**/*', (route) => {
  if (new URL(route.request().url()).origin !== new URL(base).origin) return route.abort();
  if (process.env.NO_WEBP && route.request().resourceType() === 'image') {
    return route.continue({ headers: { ...route.request().headers(), accept: 'image/png,image/jpeg,image/*;q=0.8' } });
  }
  return route.continue();
});
await page.goto(`${base}${p}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log('картинки по типам:', Object.fromEntries(formats));
await browser.close();
