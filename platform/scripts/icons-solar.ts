/**
 * Набор иконок для выбора в админке (окно «Иконка и цвет»): контурные иконки
 * Solar (480 Design, CC BY 4.0 — те же, что в коллекциях Solar на svgrepo.com).
 * Берёт авторский пакет @iconify-json/solar с jsDelivr, оставляет контурные
 * (linear), округляет координаты до сотых (на вид не влияет, файл меньше) и
 * пишет apps/admin/public/icons/solar-linear.json: { имя: содержимое <svg> }.
 *
 *   npx tsx scripts/icons-solar.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'apps/admin/public/icons/solar-linear.json');
const SOURCE = 'https://cdn.jsdelivr.net/npm/@iconify-json/solar@1/icons.json';

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`${SOURCE}: ${res.status}`);
const set = (await res.json()) as { icons: Record<string, { body: string }> };
/** Числа с тремя и больше знаками после точки — до сотых. */
const round = (body: string) => body.replace(/(\d+\.\d{3,})/g, (n) => String(Math.round(Number(n) * 100) / 100));
const icons: Record<string, string> = {};
for (const [name, { body }] of Object.entries(set.icons).sort(([a], [b]) => a.localeCompare(b))) {
  if (name.endsWith('-linear')) icons[name.slice(0, -'-linear'.length)] = round(body);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(icons));
console.log(`иконок: ${Object.keys(icons).length}, ${(fs.statSync(OUT).size / 1024).toFixed(0)} КБ → ${path.relative(ROOT, OUT)}`);
