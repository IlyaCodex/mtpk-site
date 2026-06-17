#!/usr/bin/env node
/**
 * prune-inline-extracted.mjs — чистильщик осиротевших inline-CSS блобов.
 *
 * Экстрактор в src/pages/[...slug].astro (T-PERF-4) пишет большие inline-блоки
 * стилей в public/css/inline-extracted/inline-<md5>.css по принципу
 * write-if-missing и НИКОГДА не удаляет старые. Каждая правка инлайн-стиля
 * меняет хэш → плодит новый файл, а прежний осиротевает: висит в git и едет
 * на прод, ничем не ссылаемый.
 *
 * Этот скрипт после сборки вычисляет реально используемый набор (хэши,
 * упомянутые в HTML-файлах dist) и удаляет всё нессылаемое из ОБЕИХ копий:
 *   - public/css/inline-extracted/ — чтобы git-дерево не пухло;
 *   - dist/css/inline-extracted/   — чтобы /ship не возил мусор на прод.
 *
 * Запуск:   node scripts/prune-inline-extracted.mjs   (через postbuild)
 * Идемпотентен: если орфанов нет — ничего не делает.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC_IE = path.join(ROOT, 'public/css/inline-extracted');
const DIST_IE = path.join(DIST, 'css/inline-extracted');
const verbose = process.argv.includes('--verbose');

if (!fs.existsSync(DIST)) {
  console.error('prune-inline-extracted: dist/ не найден — сначала `npm run build`.');
  process.exit(1);
}

// 1. Собираем имена inline-<hash>.css, реально подключённые в собранном HTML.
const referenced = new Set();
const RE = /\/css\/inline-extracted\/(inline-[a-f0-9]+\.css)/g;
function walkHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full);
    else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf-8');
      let m;
      while ((m = RE.exec(html)) !== null) referenced.add(m[1]);
    }
  }
}
walkHtml(DIST);

// 2. Удаляем нессылаемые .css из public/ и dist/.
let removed = 0;
for (const dir of [PUBLIC_IE, DIST_IE]) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.css')) continue;
    if (referenced.has(name)) continue;
    fs.unlinkSync(path.join(dir, name));
    removed++;
    if (verbose) console.log(`  rm ${path.relative(ROOT, path.join(dir, name))}`);
  }
}

console.log(
  `prune-inline-extracted: live=${referenced.size}, удалено осиротевших файлов=${removed}.`
);
