/**
 * Отчёт о переводе страниц в блоки: сколько секций стали типизированными
 * блоками, сколько остались «HTML как есть» и почему.
 * Запуск: npx tsx tools/importer/src/blocks-report.ts [--only=section.phero] [--path=/products/…/]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRawPages } from '@mtpk/content-kit';
import { htmlToBlocks, newReport } from './blocks/to-blocks.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = path.resolve(here, '../../../../astro/src/raw-pages');
const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=') as [string, string]));

const report = newReport();
const t0 = Date.now();
let pages = 0;
for (const p of readRawPages(raw)) {
  if (args.get('path') && p.path !== args.get('path')) continue;
  htmlToBlocks(p.body, p.path, report);
  pages++;
}
const typed = Object.values(report.typed).reduce((a, b) => a + b, 0);
const fallback = Object.values(report.fallback).reduce((a, b) => a + b, 0);
console.log(`страниц: ${pages}, секций: ${typed + fallback}; типизировано: ${typed} (${((100 * typed) / (typed + fallback)).toFixed(1)}%), HTML: ${fallback}; ${((Date.now() - t0) / 1000).toFixed(1)} с`);
console.log('\nтипизировано:', report.typed);
const only = args.get('only');
const keys = Object.keys(report.typed).concat(Object.keys(report.reasons));
for (const k of [...new Set(keys)]) {
  if (only && k !== only) continue;
  if (!report.reasons[k]) continue;
  console.log(`\n✗ ${k}: не распознано ${report.fallback[k]} из ${(report.typed[k] ?? 0) + report.fallback[k]}`);
  for (const r of report.reasons[k]) console.log(`   · ${r.slice(0, 400)}`);
}
