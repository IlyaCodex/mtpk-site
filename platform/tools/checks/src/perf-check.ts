/**
 * Вес и скорость страниц. По каждой странице — байты по типам (текст — после
 * gzip; картинки и шрифты — как есть), число запросов, LCP и «блокирующее
 * время» (сумма длинных задач сверх 50 мс) при эмуляции телефона:
 * процессор ×4, сеть ≈ Slow 4G. Сторонние скрипты (Метрика, коллтрекинг) не грузятся.
 * --save — запомнить цифры как эталон; обычный запуск показывает «эталон → сейчас».
 *
 *   npx tsx tools/checks/src/perf-check.ts [--save] [--only=/,/products/] [--site=http://127.0.0.1:3200]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright';
import { chromiumPath } from './browser.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.resolve(here, '../baseline/perf.json');
const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'] as const;
  }),
);
const SITE = args.get('site') ?? 'http://127.0.0.1:3200';
const PAGES = args.get('only')?.split(',') ?? [
  '/',
  '/products/',
  '/products/induktsionnye-plavilnye-pechi/',
  '/products/drobemetnoe-oborudovanie/kranovogo-tipa/',
  '/products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-376/',
  '/products/zapchasti/',
  '/uslugi/puskonaladka/',
  '/kontakty/',
];

type Kind = 'html' | 'js' | 'css' | 'font' | 'img' | 'other';
interface Metrics {
  bytes: Record<Kind, number>;
  requests: number;
  lcp: number;
  tbt: number;
}

const TEXT = /text\/|javascript|json|svg|xml/;

async function measure(browser: Browser, base: string, p: string): Promise<Metrics> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  const origin = new URL(base).origin;
  await page.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __tbt: number };
    w.__lcp = 0;
    w.__tbt = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__tbt += Math.max(0, e.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  });

  const bytes: Record<Kind, number> = { html: 0, js: 0, css: 0, font: 0, img: 0, other: 0 };
  let requests = 0;
  const pending: Promise<void>[] = [];
  page.on('response', (r) => {
    pending.push(
      (async () => {
        if (r.status() >= 300 && r.status() < 400) return;
        const type = r.request().resourceType();
        const ct = r.headers()['content-type'] ?? '';
        let body: Buffer;
        try {
          body = await r.body();
        } catch {
          return;
        }
        requests++;
        const size = TEXT.test(ct) ? zlib.gzipSync(body).length : body.length;
        const kind: Kind =
          type === 'document' ? 'html' : type === 'script' ? 'js' : type === 'stylesheet' ? 'css' : type === 'font' ? 'font' : type === 'image' ? 'img' : 'other';
        bytes[kind] += size;
      })(),
    );
  });
  await page.goto(`${base}${p}`, { waitUntil: 'load', timeout: 180_000 });
  await page.waitForTimeout(2500);
  await Promise.all(pending);
  const { lcp, tbt } = await page.evaluate(() => {
    const w = window as unknown as { __lcp: number; __tbt: number };
    return { lcp: w.__lcp, tbt: w.__tbt };
  });
  await context.close();
  return { bytes, requests, lcp: Math.round(lcp), tbt: Math.round(tbt) };
}

const kb = (n: number) => `${(n / 1024).toFixed(0)}`.padStart(5);
const row = (m: Metrics) =>
  `html ${kb(m.bytes.html)} · js ${kb(m.bytes.js)} · css ${kb(m.bytes.css)} · font ${kb(m.bytes.font)} · img ${kb(m.bytes.img)} КБ · ${String(m.requests).padStart(3)} запр. · LCP ${String(m.lcp).padStart(5)} мс · TBT ${String(m.tbt).padStart(4)} мс`;

const base: Record<string, Metrics> = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const saved: Record<string, Metrics> = { ...base };
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
try {
  for (const p of PAGES) {
    const m = await measure(browser, SITE, p);
    console.log(p);
    if (base[p] && !args.has('save')) console.log(`  эталон: ${row(base[p])}`);
    console.log(`  сейчас: ${row(m)}`);
    saved[p] = m;
  }
} finally {
  await browser.close();
}
if (args.has('save')) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(saved, null, 2));
  console.log(`эталон сохранён: ${BASELINE}`);
}
