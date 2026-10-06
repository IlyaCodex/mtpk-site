import fs from 'node:fs';
import path from 'node:path';

/**
 * Критический CSS, который BaseLayout.astro встраивал прямо в <head>
 * (T-PERF-8/10/15): токены, @font-face основных весов, мобильные правки,
 * бейджи склада. Читается из public/ один раз при старте сервера.
 */
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const read = (rel: string) => fs.readFileSync(path.join(PUBLIC_DIR, rel), 'utf8');

export const FONTS_CRITICAL_CSS = read('fonts/fonts-critical.css');
export const TOKENS_CSS = read('tokens.css');
export const MOBILE_FIXES_CSS = read('css/mobile-fixes.css');
export const STOCK_CSS = read('css/stock.css');
