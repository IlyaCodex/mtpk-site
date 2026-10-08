/**
 * Сборка статики сайта (имена с хешем — кешируются навсегда):
 *  - клиентские модули (src/client/*.ts) → public/assets: минифицированные
 *    ES-модули, общий код — в отдельных чанках;
 *  - общие стили → public/assets: два файла по месту в каскаде — core.css
 *    (до стилей страницы) и core-end.css (после них). В коде страниц <style> нет;
 *  - шаблонные стили страниц (public/css/tpl) → public/assets/tpl с хешем.
 *    Цвета в CSS — с переменными тёмной темы (content-kit/src/dark.ts):
 *    светлая тема та же, у тёмной (html[data-theme=dark]) — свои значения;
 *  - старые скрипты страниц (src/legacy/*.ts) → public/js/<имя>.js: обычные
 *    скрипты (не модули), адреса прежние — на них ссылаются страницы.
 * manifest.json «имя → файл» читает сервер (src/lib/assets.ts).
 *
 *   tsx scripts/build-client.ts           — сборка (перед next build)
 *   tsx scripts/build-client.ts --watch   — разработка
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context, transform, type BuildOptions, type Plugin } from 'esbuild';
import { darkVars } from '@mtpk/content-kit/dark';
import { ASSET_VERSIONS } from '../src/lib/site.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets');
const watch = process.argv.includes('--watch');
const TARGET = ['es2020', 'chrome90', 'safari15', 'firefox90'];

/** Модули: общий (на каждой странице) и модули отдельных блоков. */
const ENTRIES: Record<string, string> = {
  site: 'src/client/site.ts',
  gallery: 'src/client/gallery.ts',
  lightbox: 'src/client/lightbox.ts',
  'spec-nav': 'src/client/spec-nav.ts',
  'catalog-filter': 'src/client/catalog-filter.ts',
  carousel: 'src/client/carousel.ts',
};

/**
 * Общие стили в порядке каскада. Между core и core-end страница подключает
 * свои: шаблонные (/css/tpl) и собственные (/css/inline-extracted).
 */
const CSS_BUNDLES: Record<string, string[]> = {
  core: [
    'public/fonts/fonts-critical.css',
    'public/fonts/fonts-extended.css',
    'public/tokens.css',
    'public/css/site.css',
    'public/css/praktikum-nav-v26.css',
    'public/css/audit-fixes-20261002.css',
  ],
  'core-end': [
    'public/css/mobile-fixes.css',
    'public/css/stock.css',
    'public/css/base-layout.css',
    'src/styles/components.css',
    'src/styles/widgets.css',
    'src/styles/theme-dark.css',
  ],
};
/** Правила самой тёмной темы — как есть: цвета в них уже тёмные, переменные --dk-… им не нужны. */
const AS_IS = new Set(['src/styles/theme-dark.css']);
/** Шаблонные стили страниц (на них ссылаются страницы: page.cssTemplates). */
const TPL_DIR = 'public/css/tpl';

/** Старые скрипты страниц: каждый — отдельный файл public/js/<имя>.js. */
const LEGACY_DIR = 'src/legacy';
const legacyEntries = () =>
  fs
    .readdirSync(path.join(ROOT, LEGACY_DIR))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .map((f) => `${LEGACY_DIR}/${f}`);

const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

async function writeCss(name: string, source: string): Promise<string> {
  const { code } = await transform(source, { loader: 'css', minify: !watch, legalComments: 'none' });
  const file = `${name}-${hash(code)}.css`;
  fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  fs.writeFileSync(path.join(OUT, file), code);
  return `/assets/${file}`;
}

async function buildCss(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const [name, files] of Object.entries(CSS_BUNDLES)) {
    const own = files.filter((f) => !AS_IS.has(f)).map(read).join('\n');
    const asIs = files.filter((f) => AS_IS.has(f)).map(read).join('\n');
    out[`${name}.css`] = await writeCss(name, `${darkVars(own)}\n${asIs}`);
  }
  for (const f of fs.readdirSync(path.join(ROOT, TPL_DIR)).filter((x) => x.endsWith('.css'))) {
    out[`tpl/${f}`] = await writeCss(`tpl/${f.slice(0, -4)}`, darkVars(read(`${TPL_DIR}/${f}`)));
  }
  return out;
}

const writeManifest: Plugin = {
  name: 'manifest',
  setup(b) {
    b.onStart(() => {
      fs.rmSync(OUT, { recursive: true, force: true });
    });
    b.onEnd(async (result) => {
      if (result.errors.length || !result.metafile) return;
      fs.mkdirSync(OUT, { recursive: true });
      const manifest: Record<string, string> = {};
      let bytes = 0;
      for (const [file, meta] of Object.entries(result.metafile.outputs)) {
        bytes += meta.bytes;
        if (!meta.entryPoint) continue;
        const name = Object.entries(ENTRIES).find(([, src]) => path.resolve(ROOT, src) === path.resolve(ROOT, meta.entryPoint!))?.[0];
        if (name) manifest[name] = `/${path.relative(path.join(ROOT, 'public'), path.resolve(ROOT, file)).split(path.sep).join('/')}`;
      }
      Object.assign(manifest, await buildCss());
      // версия /css/tpl/*.css — её берёт предпросмотр в админке (те же адреса, что у страниц)
      manifest['tpl-css-version'] = ASSET_VERSIONS.tplCss;
      fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(`статика сайта: модулей ${Object.keys(ENTRIES).length}, JS ${(bytes / 1024).toFixed(1)} КБ, стили ${Object.keys(CSS_BUNDLES).length} файла`);
    });
  },
};

const modules: BuildOptions = {
  absWorkingDir: ROOT,
  entryPoints: ENTRIES,
  outdir: OUT,
  entryNames: '[name]-[hash]',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: TARGET,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
  plugins: [writeManifest],
};

/** Обычные скрипты: каждый в своей области видимости (IIFE), типы стираются. */
const legacy: BuildOptions = {
  absWorkingDir: ROOT,
  entryPoints: legacyEntries(),
  outdir: 'public/js',
  bundle: false,
  format: 'iife',
  platform: 'browser',
  target: TARGET,
  minify: !watch,
  // кириллица как есть (как в прежних файлах), а не \uXXXX — файлы заметно меньше
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
  plugins: [
    {
      name: 'legacy-report',
      setup(b) {
        b.onEnd((result) => {
          if (!result.errors.length) console.log(`старые скрипты страниц: ${legacyEntries().length} файлов → public/js`);
        });
      },
    },
  ],
};

if (watch) {
  await Promise.all([(await context(modules)).watch(), (await context(legacy)).watch()]);
  // стили пересобираются вместе с модулями; правка только CSS — перезапуск сборщика
  console.log('статика сайта: слежу за изменениями…');
} else {
  await Promise.all([build(modules), build(legacy)]);
}
