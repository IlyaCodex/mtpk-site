/**
 * Попиксельная сверка с эталонными снимками: десктоп и мобильный, во всю
 * длину страницы. Эталон снимается перед правкой (--save), после правки
 * новые снимки сравниваются с ним; отличия — картинками в отчёте.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromiumPath, shot, shotName, type Viewport } from './browser.ts';

export interface VisualResult {
  path: string;
  viewport: Viewport;
  baseHeight: number;
  newHeight: number;
  diffPixels: number;
  diffRatio: number;
  diffImage?: string;
}

/** Сохранить эталонные снимки страниц. */
export async function saveShots(opts: { site: string; paths: string[]; dir: string; viewports?: Viewport[]; onShot?: (name: string) => void }): Promise<void> {
  fs.mkdirSync(opts.dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
  try {
    for (const p of opts.paths) {
      for (const vp of opts.viewports ?? (['desktop', 'mobile'] as const)) {
        const name = shotName(p, vp);
        fs.writeFileSync(path.join(opts.dir, `${name}.png`), await shot(browser, `${opts.site}${p}`, vp));
        opts.onShot?.(name);
      }
    }
  } finally {
    await browser.close();
  }
}

/** Сравнить страницы с эталонными снимками; отличия — в outDir (эталон, сейчас, разница). */
export async function compareShots(opts: {
  site: string;
  paths: string[];
  baseDir: string;
  outDir: string;
  viewports?: Viewport[];
  onResult?: (r: VisualResult) => void;
}): Promise<VisualResult[]> {
  fs.mkdirSync(opts.outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
  const results: VisualResult[] = [];
  try {
    for (const p of opts.paths) {
      for (const vp of opts.viewports ?? (['desktop', 'mobile'] as const)) {
        const name = shotName(p, vp);
        const basePath = path.join(opts.baseDir, `${name}.png`);
        if (!fs.existsSync(basePath)) {
          console.warn(`  нет эталона ${name} — сохраните: npm run checks -- --save --visual`);
          continue;
        }
        const a = fs.readFileSync(basePath);
        const b = await shot(browser, `${opts.site}${p}`, vp);
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
        // разница в высоте страницы — тоже отличие (каждая «лишняя» строка пикселей)
        const extra = Math.abs(A.height - B.height) * width;
        const r: VisualResult = {
          path: p,
          viewport: vp,
          baseHeight: A.height,
          newHeight: B.height,
          diffPixels: diffPixels + extra,
          diffRatio: (diffPixels + extra) / (Math.max(A.height, B.height) * width),
        };
        if (r.diffPixels > 0) {
          fs.writeFileSync(path.join(opts.outDir, `${name}.base.png`), a);
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
