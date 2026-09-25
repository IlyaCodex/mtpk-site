#!/usr/bin/env node
/**
 * build-stock.mjs — резолвер «Наличие на складе».
 *
 * Читает astro/data/stock.config.json (только URL'ы + опц. qty/shipping/note),
 * для каждого URL вытаскивает из соответствующей страницы товара:
 *   - title    — из <h1 class="phero__title"> либо из meta.json
 *   - category — из breadcrumb (первая ссылка в /products/<cat>/)
 *   - image    — первое <img> в body.html (главное фото товара)
 *   - slug     — URL без «/products/» и trailing slash (нужен для stock-badges.js)
 *
 * Пишет результат в astro/public/data/stock.json. Этот файл потребляют:
 *   - public/js/stock-badges.js — бейдж «В наличии» на карточках в каталоге
 *   - public/js/stock-list.js    — листинг карточек на /nalichie/
 *
 * Запуск:   node scripts/build-stock.mjs        (тихо)
 *           node scripts/build-stock.mjs --verbose
 *           npm run stock                       (через alias)
 *           npm run build                       (auto через prebuild)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT       = path.resolve(path.dirname(__filename), '..');
const CONFIG     = path.join(ROOT, 'data',   'stock.config.json');
const OUT        = path.join(ROOT, 'public', 'data', 'stock.json');
const RAW_PAGES  = path.join(ROOT, 'src',    'raw-pages');

const VERBOSE = process.argv.includes('--verbose');
const log     = (...a) => VERBOSE && console.log('[stock]', ...a);
const warn    = (...a) =>           console.warn('[stock] ⚠', ...a);

/* ── helpers ────────────────────────────────────────────────────────── */

// «/products/foo/bar/uid-376e/» → «foo/bar/uid-376e»
const urlToSlug = (url) =>
  String(url).replace(/^\/+|\/+$/g, '').replace(/^products\//, '');

// «/products/foo/bar/uid-376e/» → «src/raw-pages/products/foo/bar/uid-376e»
const urlToRawDir = (url) =>
  path.join(RAW_PAGES, String(url).replace(/^\/+|\/+$/g, ''));

// HTML-декодер минимальный: &nbsp; → пробел, &amp; → &, прочие &xxx; — оставляем
const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/gi, '');

// первый <img src="...">; пропускаем data: и пустые
function firstImage(html) {
  const re = /<img[^>]+src="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1].split('?')[0].split('#')[0];
    if (src && !src.startsWith('data:')) return src;
  }
  return null;
}

// Главное фото товара — приоритет:
//   1) <img class="phero__main"> / <img class="phero__hero">
//   2) <img class="case-feature__main"> (если страница использует case-feature)
//   3) первое <img>
function pickImage(html) {
  const m = html.match(/<img[^>]+class="(?:phero__(?:main|hero)|case-feature__main)"[^>]+src="([^"]+)"/i)
         || html.match(/<img[^>]+src="([^"]+)"[^>]+class="(?:phero__(?:main|hero)|case-feature__main)"/i);
  if (m) return m[1].split('?')[0];
  return firstImage(html);
}

// <h1 class="phero__title">…</h1> → строка (без тегов внутри типа <em>, <br>)
function pickTitle(html, metaTitle) {
  const m = html.match(/<h1[^>]*class="[^"]*phero__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
         || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) {
    // теги заменяем пробелом: <br> и <span> внутри h1 иначе склеивают слова
    const t = decode(m[1].replace(/<[^>]+>/g, ' ')).trim().replace(/\s+/g, ' ');
    if (t.length > 3) return t;
  }
  if (metaTitle) return metaTitle.split('—')[0].split('·')[0].trim();
  return '';
}

// Категория = текст первой ссылки в breadcrumb вида /products/<cat>/
function pickCategory(html) {
  const re = /<a[^>]+href="\/products\/([^"\/]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = decode(m[2].replace(/<[^>]+>/g, '')).trim().replace(/\s+/g, ' ');
    if (text && text.toLowerCase() !== 'каталог оборудования') return text;
  }
  return '';
}

// Достаём готовую <article class="pcard">…</article> из РОДИТЕЛЬСКОЙ
// подкатегории. Идея: на странице товара /products/A/B/C/D/ подкатегория
// /products/A/B/C/ — это лучший источник «как карточка реально выглядит в
// каталоге»: с тех.специями, бейджем категории, кнопками. Тогда /nalichie/
// показывает 1-в-1 то же самое, что человек видит в подразделе.
//
// Возвращает {html, source} или null.
function extractCatalogCard(productUrl) {
  // /products/A/B/C/D/ → parent path = A/B/C
  const parts = productUrl.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length < 3) return null; // нужен хотя бы /products/<cat>/<sub>/<product>/
  const parentParts = parts.slice(0, -1);
  const parentBody = path.join(RAW_PAGES, ...parentParts, 'body.html');
  if (!fs.existsSync(parentBody)) return null;
  const parentHtml = fs.readFileSync(parentBody, 'utf-8');

  // Найдём <article class="pcard…">…</article>, у которой внутри есть
  // ссылка на наш товар. Карточки в подкатегориях ссылаются на товар
  // по-разному: абсолютным URL (`/products/A/B/C/D/`) ИЛИ относительным
  // (`D/` — резолвится от URL подкатегории). Матчим оба варианта, иначе
  // у разделов с относительными ссылками (напр. ковши) карточка не
  // подхватывается и /nalichie/ теряет тех.характеристики.
  const needle  = productUrl.replace(/\/$/, '');
  const lastSeg = parentParts.length ? parts[parts.length - 1] : '';
  // Простой стейт-машина: проходим все article-блоки.
  let i = 0;
  while (i < parentHtml.length) {
    const open = parentHtml.indexOf('<article class="pcard', i);
    if (open < 0) return null;
    const close = parentHtml.indexOf('</article>', open);
    if (close < 0) return null;
    const block = parentHtml.slice(open, close + '</article>'.length);
    // совпадает ли href ровно с productUrl (со слэшем или без)?
    const absMatch = block.includes(`href="${productUrl}"`) || block.includes(`href="${needle}"`) || block.includes(`href="${needle}/"`);
    const relMatch = lastSeg && (block.includes(`href="${lastSeg}/"`) || block.includes(`href="${lastSeg}"`));
    if (absMatch || relMatch) {
      return { html: block, source: path.relative(ROOT, parentBody) };
    }
    i = close + '</article>'.length;
  }
  return null;
}

/* ── main ───────────────────────────────────────────────────────────── */
function main() {
  if (!fs.existsSync(CONFIG)) {
    warn(`нет ${path.relative(ROOT, CONFIG)} — пишу пустой stock.json`);
    fs.writeFileSync(OUT, JSON.stringify({ _generated_from: path.relative(ROOT, CONFIG), items: [] }, null, 2));
    return;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
  } catch (e) {
    warn(`ошибка JSON в ${CONFIG}: ${e.message}`);
    process.exit(1);
  }
  const inputs = Array.isArray(config.items) ? config.items : [];
  log(`конфиг: ${inputs.length} позиций`);

  const resolved = [];
  for (const it of inputs) {
    const url = String(it.url || '').trim();
    if (!url) { warn('item без url, пропускаю:', it); continue; }
    if (!url.startsWith('/products/')) { warn('url не /products/...:', url, '— пропускаю'); continue; }

    const dir  = urlToRawDir(url);
    const bp   = path.join(dir, 'body.html');
    const mp   = path.join(dir, 'meta.json');
    if (!fs.existsSync(bp)) {
      warn(`не нашёл ${path.relative(ROOT, bp)} — пропускаю ${url}`);
      continue;
    }
    const html = fs.readFileSync(bp, 'utf-8');
    let meta = {};
    try { if (fs.existsSync(mp)) meta = JSON.parse(fs.readFileSync(mp, 'utf-8')); } catch { /* ignore */ }

    const title    = pickTitle(html, meta.title || '');
    const category = pickCategory(html);
    const image    = pickImage(html);
    const slug     = urlToSlug(url);
    const card     = extractCatalogCard(url); // готовый HTML карточки из подкатегории

    const out = {
      slug,
      url,
      title,
      category,
      image: image || null,
    };
    if (card)                out.cardHtml = card.html;     // если нашли — рендерим этим
    if (it.qty      != null) out.qty      = it.qty;
    if (it.shipping)         out.shipping = it.shipping;
    if (it.note)             out.note     = it.note;
    if (Array.isArray(it.specs) && it.specs.length) out.specs = it.specs
    // image в конфиге — когда первое фото страницы не каталожное
    if (typeof it.image === 'string' && it.image) out.image = it.image;
    resolved.push(out);

    log(`✓ ${slug} → ${title}${card ? ' [+catalog card]' : ''}`);
  }

  const payload = {
    _generated:      'autogen — не редактируй вручную. Источник: data/stock.config.json',
    _generated_from: path.relative(ROOT, CONFIG),
    _count:          resolved.length,
    items:           resolved,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`[stock] записано ${resolved.length} позиций → ${path.relative(ROOT, OUT)}`);
}

main();
