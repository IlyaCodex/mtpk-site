/**
 * Браузер для проверок: Chromium из Playwright, одинаковые условия снимков —
 * без анимаций, внешние скрипты (Метрика, Битрикс) заблокированы, cookie-согласие
 * дано заранее, ленивые картинки догружены.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from 'playwright';

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;
export type Viewport = keyof typeof VIEWPORTS;

/** Chromium, скачанный Playwright (в %LOCALAPPDATA%\ms-playwright). */
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

/** Открыть страницу и дождаться, пока она «успокоится»: картинки, шрифты, ленивые блоки. */
export async function prepare(page: Page, url: string) {
  const origin = new URL(url).origin;
  // Согласие на cookie заранее: плашка не перекрывает страницу
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
    // формат картинки (AVIF/WebP/оригинал) не меняет вёрстку — просим всегда оригинал, чтобы снимки не зависели от кодека
    if (route.request().resourceType() === 'image') {
      const headers = { ...route.request().headers(), accept: 'image/png,image/jpeg,image/*;q=0.8' };
      if (u.searchParams.has('w')) {
        u.searchParams.delete('w');
        return route.continue({ url: u.toString(), headers });
      }
      return route.continue({ headers });
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

/** Снимок страницы во всю длину. */
export async function shot(browser: Browser, url: string, viewport: Viewport): Promise<Buffer> {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[viewport], deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await prepare(page, url);
    // CHECKS_HIDE=<селектор> — спрятать новое (например, кнопку, которой нет в эталоне), чтобы сверить остальное
    if (process.env.CHECKS_HIDE) await page.addStyleTag({ content: `${process.env.CHECKS_HIDE}{display:none!important}` });
    return await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
  } finally {
    await ctx.close();
  }
}

/** Имя файла снимка: '/products/a/' + desktop → 'products_a.desktop'. */
export const shotName = (p: string, viewport: Viewport) => `${p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}.${viewport}`;
