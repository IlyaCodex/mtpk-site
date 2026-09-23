#!/usr/bin/env node
/**
 * build-compare-index.mjs — индекс характеристик для сравнения товаров.
 *
 * Проходит по страницам товара (`section.phero` + таблица `section.spec`),
 * вынимает характеристики и складывает их по разделам каталога в
 * public/data/compare-index.json. Файл грузит только /sravnenie/.
 *
 * Зачем сборка, а не ручной конфиг: характеристики уже лежат в таблицах
 * страниц товара — второй их список неизбежно разошёлся бы с первым.
 *
 * Сопоставимость. Сравнение имеет смысл там, где у моделей раздела строки
 * таблицы называются одинаково. У серийных моделей (печи, дробемёты,
 * чиллеры, ковши, нагреватели) так и есть. У проектных комплексов
 * (ЛВМ, ЛГМ, ХТС, пескоструй) каждая позиция описана по-своему: например,
 * в ЛВМ на 28 страниц приходится 126 разных названий строк. Такие разделы
 * скрипт отсеивает сам — по доле общих параметров.
 *
 * Запуск:  node scripts/build-compare-index.mjs --report   (что получилось)
 *          node scripts/build-compare-index.mjs            (тихо, в prebuild)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT      = path.resolve(path.dirname(__filename), '..');
const RAW_PAGES = path.join(ROOT, 'src', 'raw-pages', 'products');
const OUT       = path.join(ROOT, 'public', 'data', 'compare-index.json');
// Лёгкий спутник индекса: только адреса разделов, где сравнение включено.
// Его грузит compare.js на каждой странице каталога, чтобы понять, ставить
// ли кнопку. Полный индекс (сотни КБ) для этого тащить нельзя.
const OUT_SECTIONS = path.join(ROOT, 'public', 'data', 'compare-sections.json');

const REPORT = process.argv.includes('--report');

/* ── пороги сопоставимости ──────────────────────────────────────────── */
const MIN_ITEMS   = 3;    // меньше трёх моделей — сравнивать не с чем
const MIN_PARAMS  = 5;    // меньше пяти общих строк — таблица пустая
const SHARE       = 0.5;  // параметр общий, если есть у половины моделей

/* Разделы, где сравнение выключено принудительно (проверено вручную). */
const DENY = new Set([]);

/* Синонимы названий строк: разные страницы одного раздела называют один
   и тот же параметр по-разному. Ключ — нормализованное написание,
   значение — как показывать. Пополняется по отчёту (--report). */
const SYNONYMS = new Map(Object.entries({
  'напряжение и частота питающей сети': 'Напряжение и частота сети, В/Гц',
  'напряжение питания, в / гц':         'Напряжение и частота сети, В/Гц',
  'питающая сеть и частота':            'Напряжение и частота сети, В/Гц',
  'напряжение сети, в':                 'Напряжение и частота сети, В/Гц',
}));

/* ── разбор HTML ────────────────────────────────────────────────────── */
const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&times;/g, '×')
  .replace(/&[a-z#0-9]+;/gi, '');

const text = (html) => decode(String(html).replace(/<[^>]+>/g, ' '))
  // неразрывный пробел — в обычный, а нулевой ширины (в «м³/⁠ч»)
  // просто выкидываем, иначе в значении появляется лишний пробел
  .replace(/ /g, ' ').replace(/[⁠​­]/g, '')
  .replace(/\s+/g, ' ').trim();

/** Ключ для сопоставления названий строк: регистр, ё и хвостовое двоеточие. */
const key = (label) => label.toLowerCase().replace(/ё/g, 'е').replace(/[:\s]+$/, '').trim();

/** Все файлы body.html под /products. */
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === 'body.html') acc.push(full);
  }
  return acc;
}

/** URL страницы из пути к файлу. */
const fileToUrl = (file) =>
  '/' + path.relative(path.join(ROOT, 'src', 'raw-pages'), path.dirname(file))
    .split(path.sep).join('/') + '/';

/** Крошки: [{href, text}] — из них берём раздел и короткое имя модели. */
function crumbs(html) {
  const nav = html.match(/<nav[^>]*class="breadcrumb[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!nav) return { links: [], current: '' };
  const links = [...nav[1].matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: text(m[2]) }));
  const cur = nav[1].match(/<span[^>]*class="breadcrumb__current"[^>]*>([\s\S]*?)<\/span>/i);
  return { links, current: cur ? text(cur[1]) : '' };
}

/** Главное фото товара. */
function pickImage(html) {
  const m = html.match(/<img[^>]+class="[^"]*phero__(?:main|hero)[^"]*"[^>]+src="([^"]+)"/i)
         || html.match(/<button[^>]*class="[^"]*phero__main[^"]*"[\s\S]{0,400}?<img[^>]+src="([^"]+)"/i)
         || html.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : '';
}

/** Пары «параметр → значение» из таблицы характеристик. */
function specs(html) {
  const sec = html.match(/<section[^>]*class="[^"]*\bspec\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  if (!sec) return [];
  const out = [];
  for (const row of sec[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => text(c[1]));
    if (cells.length !== 2) continue;          // трёхколоночные таблицы — не характеристики
    const [label, value] = cells;
    if (!label || !value) continue;
    if (/^(параметр|характеристика|показатель)$/i.test(label)) continue;  // строка-шапка
    out.push([label, value]);
  }
  return out;
}

/* ── сбор ───────────────────────────────────────────────────────────── */
const sections = new Map();   // url раздела -> {title, parent, items:[]}
let scanned = 0;

for (const file of walk(RAW_PAGES)) {
  const html = fs.readFileSync(file, 'utf-8');
  if (!/class="phero"/.test(html)) continue;
  const rows = specs(html);
  if (!rows.length) continue;
  scanned++;

  const url = fileToUrl(file);
  const { links, current } = crumbs(html);
  const cat = links.filter((l) => /^\/products\/.+\//.test(l.href));
  const section = cat.length ? cat[cat.length - 1] : null;
  if (!section) continue;

  const item = {
    url,
    name: current || text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1]),
    title: text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1]),
    image: pickImage(html).split('#')[0],
    specs: {},
  };
  for (const [label, value] of rows) {
    const display = SYNONYMS.get(key(label)) || label;
    if (!(display in item.specs)) item.specs[display] = value;
  }

  if (!sections.has(section.href)) {
    sections.set(section.href, {
      title: section.text,
      parent: cat.length > 1 ? cat[cat.length - 2].text : '',
      items: [],
    });
  }
  sections.get(section.href).items.push(item);
}

/* ── отбор разделов и порядок параметров ────────────────────────────── */
const result = { generated: new Date().toISOString().slice(0, 10), sections: {} };
const skipped = [];

for (const [url, sec] of [...sections.entries()].sort()) {
  const freq = new Map();
  for (const it of sec.items) {
    for (const label of Object.keys(it.specs)) {
      freq.set(label, (freq.get(label) || 0) + 1);
    }
  }
  // общие параметры — те, что есть у большинства моделей раздела
  const common = [...freq.entries()]
    .filter(([, n]) => n >= Math.ceil(sec.items.length * SHARE))
    .sort((a, b) => b[1] - a[1]);

  const ok = !DENY.has(url) && sec.items.length >= MIN_ITEMS && common.length >= MIN_PARAMS;
  if (!ok) {
    skipped.push({ url, items: sec.items.length, common: common.length, labels: freq.size });
    continue;
  }
  // порядок строк таблицы: сначала общие (по частоте), потом остальные
  const rest = [...freq.entries()].filter(([l]) => !common.some(([c]) => c === l))
    .sort((a, b) => b[1] - a[1]);
  result.sections[url] = {
    title: sec.title,
    parent: sec.parent,
    params: [...common.map(([l]) => l), ...rest.map(([l]) => l)],
    common: common.length,
    items: sec.items.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result), 'utf-8');
fs.writeFileSync(OUT_SECTIONS, JSON.stringify(Object.keys(result.sections)), 'utf-8');

const items = Object.values(result.sections).reduce((n, s) => n + s.items.length, 0);
const size = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`[compare] разделов: ${Object.keys(result.sections).length}, позиций: ${items}, `
          + `страниц просмотрено: ${scanned}, файл: ${size} КБ`);

if (REPORT) {
  console.log('\nСРАВНЕНИЕ ВКЛЮЧЕНО:');
  for (const [url, s] of Object.entries(result.sections)) {
    console.log(`  ${String(s.items.length).padStart(3)} поз. · общих строк ${String(s.common).padStart(2)} · ${s.title} — ${url}`);
  }
  console.log('\nОТСЕЯНО (нечего сравнивать):');
  for (const s of skipped.sort((a, b) => b.items - a.items)) {
    console.log(`  ${String(s.items).padStart(3)} поз. · общих строк ${String(s.common).padStart(2)} из ${String(s.labels).padStart(3)} разных · ${s.url}`);
  }
}
