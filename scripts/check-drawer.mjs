#!/usr/bin/env node
/**
 * check-drawer.mjs — проверка мобильного меню на всех вариантах страниц.
 *
 * Зачем: разметка меню одна на весь сайт (Drawer.astro), поэтому ломает его
 * не страница, а её собственный CSS. Проверять «побольше страниц наугад»
 * бесполезно — нужно по представителю на каждый уникальный набор стилей.
 * Так нашлись обе поломки 05.10.2026: в разделе «Практикум» лежала инлайн-копия
 * mobile-fixes.css из старой сборки (белый текст кнопок на белых карточках —
 * подписи «Каталог» и «Услуги» исчезали) и, после первой попытки починки,
 * скрытый гамбургер из-за неверного порядка подключения CSS.
 *
 * Проверяет не «есть ли элемент в DOM», а видно ли его: размер подписи,
 * контраст с подложкой карточки, размер иконки, высоту строки, логотип,
 * горизонтальный вылет, видимость кнопки-гамбургера.
 *
 * Запуск (сначала npm run build и раздача dist на 8765):
 *     node scripts/check-drawer.mjs                 # 390 px
 *     node scripts/check-drawer.mjs 320 360 768     # свои ширины
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'astro', 'dist');
const BASE = process.env.DRAWER_BASE || 'http://127.0.0.1:8765';
const require = createRequire(path.join(ROOT, 'astro', 'package.json'));
const { chromium } = require('playwright');

const widths = process.argv.slice(2).map(Number).filter(Boolean);
if (!widths.length) widths.push(390);

/** По одному адресу на каждый уникальный набор подключённых стилей. */
function representatives() {
  const groups = new Map();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (['_astro', '_pagefind', 'img', 'css', 'js', 'fonts', 'brand', 'data', 'og'].includes(e.name)) continue;
      walk(path.join(dir, e.name));
    }
    const file = path.join(dir, 'index.html');
    if (!fs.existsSync(file)) return;
    const html = fs.readFileSync(file, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    const css = [...head.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)]
      .map((m) => m[1].replace(/\?v=[^"]*/, '')).sort().join('|');
    const inline = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
      .map((m) => (m[1].includes('.nav-drawer__panel') ? 'mobile-fixes' : 'прочее')).sort().join('|');
    const key = css + '##' + inline;
    const url = ('/' + path.relative(DIST, dir).replace(/\\/g, '/') + '/').replace('//', '/');
    if (!groups.has(key)) groups.set(key, url);
  };
  walk(DIST);
  return [...groups.values()].sort();
}

const urls = representatives();
const browser = await chromium.launch();
let failed = 0;

for (const width of widths) {
  const page = await (await browser.newContext({ viewport: { width, height: 844 } })).newPage();
  const bad = [];
  for (const url of urls) {
    try {
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(120);
      const blocked = await page.evaluate(() => {
        const el = document.querySelector('[data-nav-toggle]');
        if (!el) return 'кнопки меню нет в разметке';
        const cs = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        if (cs.display === 'none') return 'кнопка меню скрыта (display:none)';
        if (cs.visibility === 'hidden' || cs.opacity === '0') return 'кнопка меню невидима';
        if (b.width < 20 || b.height < 20) return `кнопка меню ${Math.round(b.width)}×${Math.round(b.height)}`;
        el.click();
        return null;
      });
      if (blocked) { bad.push(`${url}: ${blocked}`); continue; }
      await page.waitForTimeout(200);
      const probs = await page.evaluate(() => {
        const d = document.querySelector('.nav-drawer');
        if (!d) return ['нет .nav-drawer'];
        const rgb = (s) => (s.match(/\d+/g) || []).map(Number).slice(0, 3);
        const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
        const out = [];
        const items = [...d.querySelectorAll('.nav-drawer__item')];
        if (items.length !== 8) out.push(`карточек ${items.length}, ждём 8`);
        for (const it of items) {
          const row = it.querySelector('.nav-drawer__link, .nav-drawer__acc');
          const t = it.querySelector('.nav-drawer__text');
          if (!t) { out.push('пункт без подписи'); continue; }
          const name = t.textContent.trim();
          const tb = t.getBoundingClientRect();
          if (tb.width < 10 || tb.height < 8) out.push(`«${name}»: подпись ${Math.round(tb.width)}×${Math.round(tb.height)}`);
          const c = contrast(rgb(getComputedStyle(t).color), rgb(getComputedStyle(it).backgroundColor));
          if (c < 3) out.push(`«${name}»: контраст подписи ${c.toFixed(1)}:1`);
          const ic = it.querySelector('.nav-drawer__icon svg');
          if (!ic) out.push(`«${name}»: нет иконки`);
          else if (ic.getBoundingClientRect().width < 10) out.push(`«${name}»: иконка схлопнулась`);
          if (row && row.getBoundingClientRect().height < 40) out.push(`«${name}»: высота строки ${Math.round(row.getBoundingClientRect().height)}`);
        }
        if (d.querySelectorAll('.nav-drawer__acc-chev').length !== 2) out.push('шевронов не 2');
        const logo = d.querySelector('.nav-drawer__brand img');
        if (!logo) out.push('нет логотипа в шапке меню');
        else if (!logo.complete || logo.naturalWidth === 0) out.push('логотип не загрузился');
        else if (logo.getBoundingClientRect().height < 20) out.push('логотип схлопнулся');
        if (d.scrollWidth - d.clientWidth > 0) out.push(`гориз. вылет ${d.scrollWidth - d.clientWidth}px`);
        if (rgb(getComputedStyle(d).backgroundColor)[0] < 200) out.push('тёмная подложка меню');
        return out;
      });
      if (probs.length) bad.push(`${url}:\n     - ` + probs.join('\n     - '));
    } catch (e) {
      bad.push(`${url}: ошибка — ${e.message.split('\n')[0]}`);
    }
  }
  console.log(`${width}px: наборов стилей ${urls.length}, с замечаниями ${bad.length}`);
  bad.forEach((x) => console.log('  ' + x));
  failed += bad.length;
  await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
