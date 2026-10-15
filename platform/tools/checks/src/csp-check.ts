/**
 * CSP боевого шлюза (infra/gateway/security-headers.conf) на локальной копии сайта «как на домене»:
 * https://uralinduktor.ru в браузере обслуживает локальный сайт, к страницам добавляются заголовки
 * шлюза. Заход как с Директа (yandex/cpc), согласие на cookie, прокрутка к карте проектов.
 * Проверяется: счётчики Метрики и Top.Mail.Ru, коллтрекинг Mango (загрузчик работает только на
 * https://uralinduktor.ru), Яндекс.Карты, нарушения CSP. Скрипт виджета Mango и карты — настоящие;
 * запросы подмены номеров, Метрики, Top.Mail.Ru и Битрикс24 перехватываются без выхода в интернет
 * (CSP браузер проверяет раньше) — статистика не засоряется. Перед выкладкой и после правки CSP:
 *
 *   npx tsx tools/checks/src/csp-check.ts [--base=http://127.0.0.1:3200]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumPath } from './browser.ts';

const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=') as [string, string]));
const LOCAL = (args.get('base') ?? 'http://127.0.0.1:3200').replace(/\/$/, '');
const conf = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../infra/gateway/security-headers.conf'), 'utf8');
const headers: Record<string, string> = {};
for (const m of conf.matchAll(/^add_header\s+(\S+)\s+"([^"]+)"/gm)) headers[m[1].toLowerCase()] = m[2];

// по-настоящему: виджет Mango и Яндекс.Карты; остальные сторонние запросы — перехват
const REAL = new Set(['widgets.mango-office.ru', 'api-maps.yandex.ru', 'core-renderer-tiles.maps.yandex.net', 'yastatic.net']);
// загрузчик Mango (в нём zod) при старте проверяет, разрешён ли eval, — отказ безвреден
const KNOWN = (v: string) => v.startsWith('script-src ← eval') && v.includes('/js/mango-uibusiness-tracking-');

const allowed = new Map<string, number>();
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await context.addInitScript(() => {
  const w = window as unknown as { __csp: string[] };
  w.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.violatedDirective} ← ${e.blockedURI.slice(0, 100)} (${e.sourceFile})`));
});
await context.route('**/*', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  if (url.hostname === 'uralinduktor.ru') {
    const res = await route.fetch({ url: `${LOCAL}${url.pathname}${url.search}`, maxRedirects: 0 }).catch(() => null);
    if (!res) return route.abort();
    return route.fulfill({ response: res, headers: { ...res.headers(), ...(req.resourceType() === 'document' ? headers : {}) } });
  }
  allowed.set(url.hostname, (allowed.get(url.hostname) ?? 0) + 1);
  if (REAL.has(url.hostname)) return route.continue();
  const js = req.resourceType() === 'script';
  return route.fulfill({ status: js ? 200 : 204, contentType: js ? 'application/javascript' : 'text/plain', body: js ? '/* перехвачено проверкой */' : '' });
});

const page = await context.newPage();
let problems = 0;
for (const p of ['/?utm_source=yandex&utm_medium=cpc&utm_campaign=csp_check', '/kontakty/', '/products/']) {
  await page.goto(`https://uralinduktor.ru${p}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (await page.locator('#cookie-accept').isVisible().catch(() => false)) await page.click('#cookie-accept');
  const map = page.locator('#projects-map');
  if (await map.count()) await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(9000);
  const state = await page.evaluate(() => {
    const w = window as unknown as { ym?: { a?: unknown[][] }; _tmr?: { type?: string }[]; ymaps?: unknown; __csp: string[] };
    return {
      ym: (w.ym?.a ?? []).filter((a) => a[1] === 'init').map((a) => a[0]),
      tmr: (w._tmr ?? []).some((t) => t.type === 'pageView'),
      mango: document.documentElement.getAttribute('data-ui-mango-status'),
      map: document.querySelector('#projects-map') ? typeof w.ymaps : null,
      csp: [...new Set(w.__csp)],
    };
  });
  const bad = state.csp.filter((v) => !KNOWN(v));
  problems += bad.length + (state.mango === 'vendor-loaded' ? 0 : 1) + (state.ym.length ? 0 : 1);
  console.log(
    `${bad.length || state.mango !== 'vendor-loaded' ? '✗' : '✓'} ${p.split('?')[0]} — Метрика: ${state.ym.join(', ') || 'нет'}; Top.Mail.Ru: ${state.tmr ? 'да' : 'нет'}; ` +
      `Mango: ${state.mango}${state.map ? `; карта: ${state.map === 'object' ? 'да' : 'нет'}` : ''}; нарушений CSP: ${bad.length}`,
  );
  for (const v of bad) console.log(`    ${v}`);
}
console.log(`сторонние адреса, которые CSP пропустил: ${[...allowed].map(([h, n]) => `${h} (${n})`).join(', ')}`);
await browser.close();
console.log(problems ? `\nпроблем: ${problems}` : '\nCSP шлюза не мешает счётчикам, коллтрекингу и карте');
process.exit(problems ? 1 : 0);
