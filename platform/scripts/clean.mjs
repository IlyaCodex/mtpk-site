#!/usr/bin/env node
/**
 * Удаляет сборочные артефакты и кеши монорепо (диск C у разработчика один):
 * .next сайта и админки, dist сервисов и инструментов, отчёты сверки.
 * Исходники, node_modules и данные Docker не трогает.
 *
 *   npm run clean
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const targets = [];
for (const group of ['apps', 'services', 'packages', 'tools']) {
  const dir = path.join(root, group);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    for (const sub of ['.next', 'dist', '.turbo', 'report']) {
      const p = path.join(dir, name, sub);
      if (fs.existsSync(p)) targets.push(p);
    }
  }
}

let freed = 0;
const size = (p) => {
  const st = fs.lstatSync(p);
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((s, n) => s + size(path.join(p, n)), 0);
};
for (const p of targets) {
  freed += size(p);
  fs.rmSync(p, { recursive: true, force: true });
  console.log(`удалено: ${path.relative(root, p)}`);
}
console.log(`освобождено: ${(freed / 1024 / 1024).toFixed(1)} МБ`);
