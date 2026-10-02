// SEO-проверка собранного сайта: пробегает dist/**/index.html и печатает нарушения.
// Из ТЗ аудита от 01.10.2026 (seo-fixes-uralinduktor.pdf, раздел 6).
// Запуск: node scripts/seo-check.mjs [папка]   (по умолчанию astro/dist)
//
// Правила: description 70–170 знаков и непустой, title 30–70, ровно один H1,
// canonical на месте, в JSON-LD нет цены (цены на сайте не публикуются),
// title/description/H1 не повторяются. Страницы с noindex из проверки исключены.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] || "astro/dist";
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : f === "index.html" && files.push(p);
  }
})(ROOT);

const get = (h, re) => (h.match(re)?.[1] ?? "").replace(/\s+/g, " ").trim();
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// Таблица характеристик — размеченная классом спецификации (.spec-table,
// .tr-specs), с парами «имя/значение». НЕ считаем таблицей характеристик:
//  · модельные ряды — первая колонка «Модель» либо колонка на каждую модель
//    (шапка шире трёх столбцов): там строка описывает не один товар;
//  · таблицы-подсказки без класса («Параметр | Что сопоставить»).
function hasSpecTable(h) {
  for (const t of h.match(/<table[^>]*class="[^"]*(?:spec-table|tr-specs)[^"]*"[^>]*>[\s\S]*?<\/table>/g) || []) {
    const head = t.match(/<thead>([\s\S]*?)<\/thead>/);
    if (head) {
      const ths = head[1].match(/<th[^>]*>[\s\S]*?<\/th>/g) || [];
      if (ths.length > 3) continue;
      const first = (head[1].match(/<th[^>]*>([\s\S]*?)<\/th>/) || [])[1] || "";
      if (/^\s*(Модель|Наименование|Типоразмер|Исполнение)\s*$/i.test(text(first))) continue;
    }
    const pairs = (t.match(/<tr>\s*<t[hd][^>]*>[\s\S]*?<\/t[hd]>\s*<td[^>]*>[\s\S]*?<\/td>/g) || []).length;
    if (pairs >= 2) return true;
  }
  return false;
}

// Повтор слова подряд («предлагает предлагает»). Числа и единицы пропускаем:
// «10 10 мм» в характеристиках — не опечатка.
const DOUBLED = /\b([А-ЯЁа-яёA-Za-z]{3,})\s+\1\b/i;

const rows = files.map((f) => {
  const h = readFileSync(f, "utf8");
  const ld = (h.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || []).join("");
  const firstPara = text((h.match(/<main[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "");
  return {
    breadcrumb: /"BreadcrumbList"/.test(ld),
    product: /"@type"\s*:\s*"Product"/.test(ld),
    hasProps: /"additionalProperty"/.test(ld),
    specTable: hasSpecTable(h),
    firstPara,
    unversioned: [...new Set(
      (h.match(/(?:src|href)="(\/(?:js|css)\/[^"]+\.(?:js|css))"/g) || [])
        .map((s) => s.replace(/^(?:src|href)="/, "").replace(/"$/, ""))
        .filter((u) => !u.startsWith("/css/inline-extracted/"))
    )],
    url: f.slice(ROOT.length).replace(/index\.html$/, "").replace(/\\/g, "/") || "/",
    title: get(h, /<title[^>]*>([\s\S]*?)<\/title>/i),
    desc: get(h, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i),
    canon: get(h, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i),
    robots: get(h, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)/i),
    h1: (h.match(/<h1[\s>]/gi) || []).length,
    h1t: get(h, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ""),
    price: /"(offers|price|priceSpecification|lowPrice)"\s*:/.test(
      (h.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || []).join("")
    ),
  };
});

const idx = rows.filter((r) => !/noindex/.test(r.robots));
const errs = [];
const dup = (k) => {
  const m = {};
  idx.forEach((r) => r[k] && (m[r[k]] ??= []).push(r.url));
  Object.values(m)
    .filter((a) => a.length > 1)
    .forEach((a) => errs.push(`dup_${k}: ${a.join(" , ")}`));
};

for (const r of idx) {
  if (!r.desc) errs.push(`desc_missing: ${r.url}`);
  else if (r.desc.length > 170) errs.push(`desc_long(${r.desc.length}): ${r.url}`);
  else if (r.desc.length < 70) errs.push(`desc_short(${r.desc.length}): ${r.url}`);
  if (r.title.length > 70) errs.push(`title_long(${r.title.length}): ${r.url}`);
  if (r.title.length < 30) errs.push(`title_short(${r.title.length}): ${r.url}`);
  if (r.h1 !== 1) errs.push(`h1_count(${r.h1}): ${r.url}`);
  if (!r.canon) errs.push(`canonical_missing: ${r.url}`);
  if (r.price) errs.push(`jsonld_has_price: ${r.url}`); // цена только по запросу

  // --- проверки этапа 2 (задача R8) ---
  // 1. страница без хлебных крошек в разметке (кроме главной)
  if (r.url !== "/" && !r.breadcrumb) errs.push(`breadcrumb_missing: ${r.url}`);
  // 2. товар без характеристик, хотя таблица на странице есть
  if (r.product && !r.hasProps && r.specTable) errs.push(`product_no_props: ${r.url}`);
  // 3. бренд в конце title записан не как « | УралИндуктор»
  if (/(?:[—–|-]\s*«?Урал\s?Индуктор»?|Цены\s+УралИндуктор)\s*$/i.test(r.title)
      && !/ \| УралИндуктор$/.test(r.title)) {
    errs.push(`brand_suffix: ${r.url} — «${r.title.slice(-34)}»`);
  }
  // 4. повтор слова подряд в описании и первом абзаце
  for (const [where, s] of [["desc", r.desc], ["para", r.firstPara]]) {
    const m = s.match(DOUBLED);
    if (m) errs.push(`doubled_word_${where}(${m[1]}): ${r.url}`);
  }
  // 5. ссылка на /js/ или /css/ без ?v=. С 02.10.2026 nginx отдаёт их
  // с max-age=31536000, immutable — без версии в адресе правка файла
  // не дойдёт до вернувшегося посетителя целый год. Исключение —
  // /css/inline-extracted/: там версия в самом имени (content-hash).
  for (const ref of r.unversioned) errs.push(`asset_no_version: ${r.url} — ${ref}`);
}
["title", "desc", "h1t"].forEach(dup);

console.log(errs.join("\n") || "OK");
console.log(`\n${errs.length} issues / ${rows.length} pages`);
process.exit(errs.length ? 1 : 0);
