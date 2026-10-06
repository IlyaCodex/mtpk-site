#!/usr/bin/env node
/**
 * Сборка клиентских модулей сайта (src/client/*.ts) в public/assets/:
 * минифицированные ES-модули с хешем в имени (кешируются навсегда) и
 * manifest.json «модуль → файл», по которому страница подключает только
 * нужные ей модули. Общий код выносится в отдельные чанки.
 *
 *   node scripts/build-client.mjs           — сборка (перед next build)
 *   node scripts/build-client.mjs --watch   — разработка
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';

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

const writeManifest = {
  name: 'manifest',
  setup(b) {
    b.onStart(() => {
      fs.rmSync(OUT, { recursive: true, force: true });
    });
    b.onEnd((result) => {
      if (result.errors.length || !result.metafile) return;
      const manifest = {};
      let bytes = 0;
      for (const [file, meta] of Object.entries(result.metafile.outputs)) {
        bytes += meta.bytes;
        if (!meta.entryPoint) continue;
        const name = Object.entries(ENTRIES).find(([, src]) => path.resolve(ROOT, src) === path.resolve(ROOT, meta.entryPoint))?.[0];
        if (name) manifest[name] = `/${path.relative(path.join(ROOT, 'public'), path.resolve(ROOT, file)).split(path.sep).join('/')}`;
      }
      fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(`клиентские модули: ${Object.keys(manifest).length}, всего ${(bytes / 1024).toFixed(1)} КБ (до сжатия)`);
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
  console.log('клиентские модули: слежу за изменениями…');
} else {
  await build(options);
}
