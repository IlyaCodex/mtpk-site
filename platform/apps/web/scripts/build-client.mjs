#!/usr/bin/env node
/**
 * Сборка статики сайта в public/assets/ (имена с хешем — кешируются навсегда):
 *  - клиентские модули (src/client/*.ts): минифицированные ES-модули, общий
 *    код — в отдельных чанках;
 *  - общие стили: два файла по месту в каскаде — core.css (до стилей
 *    страницы) и core-end.css (после них). В коде страниц <style> нет.
 * manifest.json «имя → файл» читает сервер (src/lib/assets.ts).
 *
 *   node scripts/build-client.mjs           — сборка (перед next build)
 *   node scripts/build-client.mjs --watch   — разработка
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context, transform } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets');
const watch = process.argv.includes('--watch');

/** Модули: общий (на каждой странице) и модули отдельных блоков. */
const ENTRIES = {
  site: 'src/client/site.ts',
  gallery: 'src/client/gallery.ts',
  lightbox: 'src/client/lightbox.ts',
  'spec-nav': 'src/client/spec-nav.ts',
  'catalog-filter': 'src/client/catalog-filter.ts',
};

/**
 * Общие стили в порядке каскада. Между core и core-end страница подключает
 * свои: шаблонные (/css/tpl) и собственные (/css/inline-extracted).
 */
const CSS_BUNDLES = {
  core: [
    'public/fonts/fonts-critical.css',
    'public/fonts/fonts-extended.css',
    'public/tokens.css',
    'public/css/site.css',
    'public/css/praktikum-nav-v26.css',
    'public/css/audit-fixes-20261002.css',
  ],
  'core-end': ['public/css/mobile-fixes.css', 'public/css/stock.css', 'public/css/base-layout.css', 'src/styles/components.css'],
};

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

async function buildCss() {
  const out = {};
  for (const [name, files] of Object.entries(CSS_BUNDLES)) {
    const source = files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const { code } = await transform(source, { loader: 'css', minify: !watch, legalComments: 'none' });
    const file = `${name}-${hash(code)}.css`;
    fs.writeFileSync(path.join(OUT, file), code);
    out[`${name}.css`] = `/assets/${file}`;
  }
  return out;
}

const writeManifest = {
  name: 'manifest',
  setup(b) {
    b.onStart(() => {
      fs.rmSync(OUT, { recursive: true, force: true });
    });
    b.onEnd(async (result) => {
      if (result.errors.length || !result.metafile) return;
      fs.mkdirSync(OUT, { recursive: true });
      const manifest = {};
      let bytes = 0;
      for (const [file, meta] of Object.entries(result.metafile.outputs)) {
        bytes += meta.bytes;
        if (!meta.entryPoint) continue;
        const name = Object.entries(ENTRIES).find(([, src]) => path.resolve(ROOT, src) === path.resolve(ROOT, meta.entryPoint))?.[0];
        if (name) manifest[name] = `/${path.relative(path.join(ROOT, 'public'), path.resolve(ROOT, file)).split(path.sep).join('/')}`;
      }
      Object.assign(manifest, await buildCss());
      fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(`статика сайта: модулей ${Object.keys(ENTRIES).length}, JS ${(bytes / 1024).toFixed(1)} КБ, стили ${Object.keys(CSS_BUNDLES).length} файла`);
    });
  },
};

const options = {
  absWorkingDir: ROOT,
  entryPoints: ENTRIES,
  outdir: OUT,
  entryNames: '[name]-[hash]',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
  plugins: [writeManifest],
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  // стили пересобираются вместе с модулями; правка только CSS — перезапуск сборщика
  console.log('статика сайта: слежу за изменениями…');
} else {
  await build(options);
}
