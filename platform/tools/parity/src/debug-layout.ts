// Сравнить геометрию элементов в старой и новой версиях:
// MSYS_NO_PATHCONV=1 npx tsx tools/parity/src/debug-layout.ts /products/ "селектор" [ширина]
import { chromium } from 'playwright';
import { chromiumPath } from './visual-check.ts';
import { serveDist } from './static-server.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [p = '/', selector = 'main', width = '390'] = process.argv.slice(2);
const here = path.dirname(fileURLToPath(import.meta.url));
const server = await serveDist(path.resolve(here, '../../../../astro/dist'), 4400);
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
for (const base of ['http://127.0.0.1:4400', 'http://127.0.0.1:3200']) {
  const page = await browser.newPage({ viewport: { width: Number(width), height: 844 } });
  await page.route('**/*', (r) => (new URL(r.request().url()).origin !== base ? r.abort() : r.continue()));
  await page.goto(`${base}${p}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const info = await page.$$eval(selector, (els) =>
    els.slice(0, 12).map((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return `${e.tagName.toLowerCase()}.${(e.className || '').toString().slice(0, 40)} y=${r.y.toFixed(1)} h=${r.height.toFixed(2)} font=${cs.fontFamily.slice(0, 20)} ${cs.fontSize}/${cs.lineHeight} w${cs.fontWeight}`;
    }),
  );
  console.log(base, '\n  ' + info.join('\n  '));
  await page.close();
}
await browser.close();
server.close();
