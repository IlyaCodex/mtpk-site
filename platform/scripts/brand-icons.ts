/**
 * Значок компании (favicon), логотип шапки сайта и логотипы админки — из готовых рисунков, одной командой:
 *   apps/web/public/favicon.svg (знак логотипа на белой плашке) →
 *     favicon.ico (16, 32, 48 — для браузеров и роботов Яндекса и Google),
 *     apple-touch-icon.png (180, на белом — iPhone и «Табло»), icon-192.png и icon-512.png
 *     (site.webmanifest), копия favicon.svg — админке;
 *   apps/web/public/brand/logo-header-clean.png и logo-footer-white.png → apps/admin/public/brand/
 *     logo.png (страница входа) и logo-white.png (меню админки) — уменьшенные копии.
 * Поменяли рисунок значка или логотип — запустить заново:
 *
 *   npx tsx scripts/brand-icons.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'apps/web/public');
const ADMIN = path.join(ROOT, 'apps/admin/public');
const svg = fs.readFileSync(path.join(WEB, 'favicon.svg'));

/** Значок size×size: рисунок отрисован крупнее и уменьшен — края ровные. */
const icon = (size: number, background?: string) => {
  const img = sharp(svg, { density: Math.ceil((72 * size * 4) / 480) }).resize(size, size);
  return background ? img.flatten({ background }) : img;
};

/**
 * Картинка ICO в классическом виде (BMP, 32 бита с прозрачностью): такой favicon.ico
 * понимают все браузеры и роботы поисковиков, не только новые.
 */
async function bmpEntry(size: number): Promise<Buffer> {
  const rgba = await icon(size).ensureAlpha().raw().toBuffer();
  const maskRow = Math.ceil(size / 32) * 4;
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); // размер заголовка
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // высота — картинка и маска
  header.writeUInt16LE(1, 12); // плоскостей
  header.writeUInt16LE(32, 14); // бит на точку
  header.writeUInt32LE(size * size * 4 + maskRow * size, 20);
  const pixels = Buffer.alloc(size * size * 4);
  const mask = Buffer.alloc(maskRow * size);
  for (let y = 0; y < size; y++) {
    const row = size - 1 - y; // строки — снизу вверх
    for (let x = 0; x < size; x++) {
      const from = (y * size + x) * 4;
      const to = (row * size + x) * 4;
      pixels[to] = rgba[from + 2]; // BGRA
      pixels[to + 1] = rgba[from + 1];
      pixels[to + 2] = rgba[from];
      pixels[to + 3] = rgba[from + 3];
      if (rgba[from + 3] < 128) mask[row * maskRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return Buffer.concat([header, pixels, mask]);
}

async function ico(sizes: number[]): Promise<Buffer> {
  const images = await Promise.all(sizes.map(bmpEntry));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2); // тип: значок
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((size, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size, at);
    head.writeUInt8(size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(images[i].length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += images[i].length;
  });
  return Buffer.concat([head, ...images]);
}

const written: string[] = [];
async function save(file: string, data: Buffer | Promise<Buffer>) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await data);
  written.push(`${path.relative(ROOT, file)} — ${(fs.statSync(file).size / 1024).toFixed(1)} КБ`);
}

await save(path.join(WEB, 'favicon.ico'), ico([16, 32, 48]));
await save(path.join(WEB, 'apple-touch-icon.png'), icon(180, '#ffffff').png({ compressionLevel: 9 }).toBuffer());
await save(path.join(WEB, 'icon-192.png'), icon(192).png({ compressionLevel: 9 }).toBuffer());
await save(path.join(WEB, 'icon-512.png'), icon(512).png({ compressionLevel: 9 }).toBuffer());
await save(path.join(ADMIN, 'favicon.svg'), svg);
// логотипы админки: вдвое крупнее, чем на экране (чётко на экранах с высокой плотностью)
const logo = (from: string, width: number) =>
  sharp(path.join(WEB, 'brand', from)).resize({ width }).png({ compressionLevel: 9, palette: true, quality: 95 }).toBuffer();
await save(path.join(ADMIN, 'brand/logo.png'), logo('logo-header-clean.png', 560));
await save(path.join(ADMIN, 'brand/logo-white.png'), logo('logo-footer-white.png', 400));
// шапка и мобильное меню сайта: на экране ~184×48 px — копия 400 px (чётко на экранах ×2 и ×3),
// а не исходник 1898 px; WebP-копию делает сборка сайта
await save(path.join(WEB, 'brand/logo-header.png'), logo('logo-header-clean.png', 400));
console.log(written.join('\n'));
