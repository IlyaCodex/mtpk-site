/**
 * Тёмная тема на страницах сайта: страница открывается с выбранной тёмной темой (как у посетителя,
 * нажавшего переключатель), и в ней ищутся:
 *  - светлые блоки с текстом (фон светлее серого, от 120×100 px) — тёмная тема их не перекрасила;
 *  - текст, плохо читаемый на своём фоне (контраст ниже 3:1; фон-фото и градиенты не оцениваются);
 *  - страницы, где тема не включилась сама (нет скрипта темы в <head>).
 * Учитывается только то, чего нет в светлой теме на том же месте: это поломки тёмной темы, а не замысел.
 * По умолчанию — до 3 страниц каждого раздела из sitemap (все типы страниц), --all — все адреса.
 *
 *   npx tsx tools/checks/src/dark-check.ts [--site=http://127.0.0.1:3200] [--only=/a/,/b/] [--all] [--json=путь]
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { chromiumPath } from './browser.ts';

const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=') as [string, string]));
const SITE = (args.get('site') ?? 'http://127.0.0.1:3200').replace(/\/$/, '');

async function sitemapPaths(): Promise<string[]> {
  const index = await (await fetch(`${SITE}/sitemap-index.xml`)).text();
  const parts = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const out: string[] = [];
  for (const p of parts) out.push(...[...(await (await fetch(`${SITE}${p}`)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
  return out;
}

/** До n адресов на раздел (первые два сегмента пути) — представители всех шаблонов. */
function sample(paths: string[], n = 3): string[] {
  const groups = new Map<string, string[]>();
  for (const p of paths) {
    const key = p.split('/').slice(0, 3).join('/');
    const g = groups.get(key) ?? [];
    if (g.length < n) groups.set(key, [...g, p]);
  }
  return [...groups.values()].flat();
}

type Found = { kind: 'surface' | 'contrast'; sel: string; detail: string };

// выполняется в браузере; строкой — чтобы сборщик не обернул функции служебным __name
const AUDIT = `(() => {
  const parse = (s) => { const m = /rgba?\\(([^)]+)\\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[\\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const ch = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const SKIP = new Set(['IMG', 'PICTURE', 'SVG', 'VIDEO', 'CANVAS', 'IFRAME', 'SOURCE', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'PATH', 'G', 'USE']);
  const sel = (e) => { const c = [...e.classList].filter((x) => !/^(is-|js-)/.test(x)).slice(0, 2); return e.tagName.toLowerCase() + (c.length ? '.' + c.join('.') : e.id ? '#' + e.id : ''); };
  const where = (e) => { const s = e.closest('section, header, footer, aside, nav, main > div'); return s && s !== e ? sel(s) + ' ' : ''; };
  const visible = (e, cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && e.getClientRects().length > 0;
  const page = parse(getComputedStyle(document.body).backgroundColor);
  const canvas = page && page.a >= 0.5 ? page : parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a >= 0.5) return c;
    }
    return canvas;
  };
  const out = [];
  const light = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (SKIP.has(e.tagName.toUpperCase()) || e.closest('svg, .search-modal, .cookie-consent, [hidden]')) continue;
    const cs = getComputedStyle(e);
    if (!visible(e, cs)) continue;
    const r = e.getBoundingClientRect();
    // светлый блок с текстом
    const bg = parse(cs.backgroundColor);
    const text = (e.innerText || '').trim();
    if (bg && bg.a >= 0.5 && lum(bg) > 0.45 && r.width >= 120 && r.height >= 100 && text.length > 0 && !light.some((x) => x.contains(e))) {
      light.push(e);
      out.push({ kind: 'surface', sel: where(e) + sel(e), detail: cs.backgroundColor + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' «' + text.slice(0, 40).replace(/\\s+/g, ' ') + '»' });
    }
    // текст на своём фоне
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own || r.width < 4 || r.height < 4) continue;
    const fg = parse(cs.color);
    const back = bgOf(e);
    if (!fg || !back || fg.a < 0.4) continue;
    const k = ratio(lum(fg), lum(back));
    if (k < 3) out.push({ kind: 'contrast', sel: where(e) + sel(e), detail: k.toFixed(2) + ': ' + cs.color + ' на ' + 'rgb(' + back.r + ', ' + back.g + ', ' + back.b + ') «' + e.innerText.trim().slice(0, 40).replace(/\\s+/g, ' ') + '»' });
  }
  return out;
})()`;

const all = await sitemapPaths();
const paths = args.get('only')?.split(',') ?? (args.has('all') ? all : sample(all));
console.log(`страниц: ${paths.length}${args.has('all') ? ' (все из sitemap)' : args.has('only') ? '' : ' (до 3 на раздел)'}`);
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(`try { localStorage.setItem('ui_theme', 'dark'); localStorage.setItem('ui_cookie_consent', '1|v2026.1|2026-01-01T00:00:00.000Z') } catch (e) {}`);
await ctx.route('**/*', (r) => {
  const u = new URL(r.request().url());
  // картинки и видео для проверки цветов не нужны — страница не ждёт медленную загрузку
  if (u.origin !== SITE || ['image', 'media'].includes(r.request().resourceType())) return r.abort();
  return r.continue();
});
const report: Record<string, Found[]> = {};
const noInit: string[] = [];
let i = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    const page = await ctx.newPage();
    while (i < paths.length) {
      const p = paths[i++];
      try {
        await page.goto(`${SITE}${p}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForFunction(() => [...document.querySelectorAll('link[rel="stylesheet"]')].every((l) => (l as HTMLLinkElement).sheet), null, { timeout: 20_000 }).catch(() => {});
        if (!(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'))) {
          noInit.push(p);
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        }
        await page.waitForTimeout(250);
        const dark = (await page.evaluate(AUDIT)) as Found[];
        // то же место в светлой теме — замысел оформления (например, белый текст на зелёной кнопке), не поломка тёмной
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
        const light = new Set(((await page.evaluate(AUDIT)) as Found[]).map((f) => `${f.kind} ${f.sel}`));
        const found = dark.filter((f) => !light.has(`${f.kind} ${f.sel}`));
        if (found.length) report[p] = found;
      } catch (err) {
        report[p] = [{ kind: 'surface', sel: '(страница)', detail: `не открылась: ${(err as Error).message.split('\n')[0]}` }];
      }
    }
    await page.close();
  }),
);
await browser.close();

// итог: по селекторам (одна причина обычно на многих страницах)
const bySel = new Map<string, { kind: string; pages: string[]; detail: string }>();
for (const [p, list] of Object.entries(report))
  for (const f of list) {
    const key = `${f.kind} ${f.sel}`;
    const e = bySel.get(key) ?? { kind: f.kind, pages: [], detail: f.detail };
    if (!e.pages.includes(p)) e.pages.push(p);
    bySel.set(key, e);
  }
const rows = [...bySel].sort((a, b) => b[1].pages.length - a[1].pages.length);
console.log(`\nтема не включилась сама: ${noInit.length ? `${noInit.length} стр., например ${noInit.slice(0, 3).join(', ')}` : 'нет'}`);
console.log(`страниц с замечаниями: ${Object.keys(report).length} из ${paths.length}; разных мест: ${rows.length}`);
for (const [key, e] of rows.slice(0, Number(args.get('top') ?? 60)))
  console.log(`  ${e.kind === 'surface' ? 'светлый блок' : 'контраст   '} ${key.slice(e.kind.length + 1)} — ${e.pages.length} стр. (${e.pages[0]}) ${e.detail}`);
if (args.get('json')) fs.writeFileSync(args.get('json')!, JSON.stringify({ noInit, report }, null, 1));
