#!/usr/bin/env node
/**
 * Сборка сервисов и инструментов в бандлы для продакшна (esbuild):
 * код монорепо (@mtpk/*, TypeScript/TSX) вшивается в бандл, сторонние пакеты
 * остаются внешними — в Docker-образе их ставит `npm ci --omit=dev`.
 *
 *   node scripts/build-services.mjs            — всё
 *   node scripts/build-services.mjs content    — выборочно
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = {
  content: { dir: 'services/content', entries: ['src/index.ts'] },
  media: { dir: 'services/media', entries: ['src/index.ts'] },
  search: { dir: 'services/search', entries: ['src/index.ts'] },
  leads: { dir: 'services/leads', entries: ['src/index.ts', 'src/worker.ts'] },
  importer: { dir: 'tools/importer', entries: ['src/index.ts'] },
};

/** Пакеты монорепо — в бандл; всё остальное (node_modules) — внешнее. */
const externalizeDeps = {
  name: 'externalize-deps',
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith('@mtpk/')) return undefined;
      if (args.path.startsWith('node:')) return { path: args.path, external: true };
      return { path: args.path, external: true };
    });
  },
};

const only = process.argv.slice(2);
for (const [name, t] of Object.entries(TARGETS)) {
  if (only.length && !only.includes(name)) continue;
  const outdir = path.join(ROOT, t.dir, 'dist');
  fs.rmSync(outdir, { recursive: true, force: true });
  await build({
    absWorkingDir: path.join(ROOT, t.dir),
    entryPoints: t.entries,
    outdir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    sourcemap: true,
    jsx: 'automatic',
    logLevel: 'warning',
    plugins: [externalizeDeps],
    // CommonJS-зависимости внутри ESM-бандла иногда зовут require/__dirname
    banner: {
      js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
    },
  });
  console.log(`✓ ${name} → ${path.relative(ROOT, outdir)}`);
}
