/**
 * Попиксельная сверка: скриншоты страниц старой (Astro) и новой (Next.js)
 * версий в одинаковых условиях — десктоп и мобильный, без анимаций, внешние
 * скрипты (Метрика, Битрикс) заблокированы, ленивые картинки догружены.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface VisualResult {
  path: string;
  viewport: string;
  oldHeight: number;
  newHeight: number;
  diffPixels: number;
  diffRatio: number;
  diffImage?: string;
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export function chromiumPath(): string | undefined {
  const base = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    for (const sub of ['chrome-win64', 'chrome-win']) {
      const exe = path.join(base, d, sub, 'chrome.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return undefined;
}

async function prepare(page: Page, origin: string, url: string) {
  // Согласие на cookie заранее: плашка не перекрывает страницу в обеих версиях
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ui_cookie_consent', '1|v2026.1|2026-01-01T00:00:00.000Z');
    } catch {
      /* ignore */
    }
  });
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== origin) return route.abort();
    // новая версия отдаёт WebP по Accept — для честного сравнения просим оригинал, как у статики
    if (route.request().resourceType() === 'image') {
      return route.continue({ headers: { ...route.request().headers(), accept: 'image/png,image/jpeg,image/*;q=0.8' } });
    }
    return route.continue();
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  // догрузить ленивые картинки: прокрутка вниз и обратно
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  // ленивые картинки должны успеть не только загрузиться, но и декодироваться
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

async function shot(browser: Browser, base: string, p: string, viewport: { width: number; height: number }): Promise<Buffer> {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await prepare(page, new URL(base).origin, `${base}${p}`);
    return await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
  } finally {
    await ctx.close();
  }
}

export async function checkVisual(opts: {
  oldBase: string;
  newBase: string;
  paths: string[];
  outDir: string;
  viewports?: (keyof typeof VIEWPORTS)[];
  onResult?: (r: VisualResult) => void;
}): Promise<VisualResult[]> {
  fs.mkdirSync(opts.outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
  const results: VisualResult[] = [];
  try {
    for (const p of opts.paths) {
      for (const vp of opts.viewports ?? (['desktop', 'mobile'] as const)) {
        const [a, b] = await Promise.all([shot(browser, opts.oldBase, p, VIEWPORTS[vp]), shot(browser, opts.newBase, p, VIEWPORTS[vp])]);
        const A = PNG.sync.read(a);
        const B = PNG.sync.read(b);
        const width = Math.min(A.width, B.width);
        const height = Math.min(A.height, B.height);
        const crop = (img: PNG) => {
          const out = new PNG({ width, height });
          PNG.bitblt(img, out, 0, 0, width, height, 0, 0);
          return out;
        };
        const diff = new PNG({ width, height });
        const diffPixels = pixelmatch(crop(A).data, crop(B).data, diff.data, width, height, { threshold: 0.1 });
        // разница в высоте страницы — тоже расхождение (каждая «лишняя» строка пикселей)
        const extra = Math.abs(A.height - B.height) * width;
        const r: VisualResult = {
          path: p,
          viewport: vp,
          oldHeight: A.height,
          newHeight: B.height,
          diffPixels: diffPixels + extra,
          diffRatio: (diffPixels + extra) / (Math.max(A.height, B.height) * width),
        };
        if (r.diffPixels > 0) {
          const name = `${p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}.${vp}`;
          fs.writeFileSync(path.join(opts.outDir, `${name}.old.png`), a);
          fs.writeFileSync(path.join(opts.outDir, `${name}.new.png`), b);
          fs.writeFileSync(path.join(opts.outDir, `${name}.diff.png`), PNG.sync.write(diff));
          r.diffImage = `${name}.diff.png`;
        }
        results.push(r);
        opts.onResult?.(r);
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}
