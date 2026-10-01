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
const rows = files.map((f) => {
  const h = readFileSync(f, "utf8");
  return {
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
}
["title", "desc", "h1t"].forEach(dup);

console.log(errs.join("\n") || "OK");
console.log(`\n${errs.length} issues / ${rows.length} pages`);
process.exit(errs.length ? 1 : 0);
