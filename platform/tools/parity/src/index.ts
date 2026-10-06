/**
 * Сверка новой платформы со старой Astro-сборкой.
 *
 *   npm run parity                    — HTML-сверка всех страниц (нужен запущенный npm run dev)
 *   npm run parity -- --visual        — плюс скриншоты выборки страниц (десктоп + мобильный)
 *   npm run parity -- --visual --only=/,/kontakty/
 *
 * Старый сайт берётся из astro/dist (поднимается локальный статический сервер),
 * новый — с http://127.0.0.1:3200. Отчёт: tools/parity/report/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkHtml } from './html-check.ts';
import { checkVisual } from './visual-check.ts';
import { serveDist } from './static-server.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const DIST = path.resolve(ROOT, '../astro/dist');
const REPORT = path.resolve(here, '../report');
const NEW_BASE = process.env.PARITY_NEW_BASE ?? 'http://127.0.0.1:3200';
const CONTENT = process.env.CONTENT_URL ?? 'http://127.0.0.1:4101';

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'] as const;
}));

/** Представители всех типов страниц (docs/page-types) — для скриншотов. */
const VISUAL_SAMPLE = [
  '/', // T01 главная
  '/products/', // T02 корень каталога
  '/products/induktsionnye-plavilnye-pechi/', // T03a раздел
  '/products/oborudovanie-lvm/', // T03b технологический раздел
  '/products/drobemetnoe-oborudovanie/kranovogo-tipa/', // T04 категория с фильтром
  '/products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-376/', // T05 товар (галерея, ТТХ)
  '/products/sistemy-ohlazhdeniya/chillery/uich-005/', // T05 товар (гарантия 12 мес)
  '/products/zapchasti/', // запчасти: хаб
  '/products/zapchasti/drobemetnoe/uid-376/', // запчасти: позиция
  '/uslugi/puskonaladka/', // T06 услуга
  '/proekty/', // T08 проекты
  '/proekty/perm/', // T07 кейс
  '/nalichie/', // T09 наличие (рендер на клиенте)
  '/proizvodstvo/', // T10
  '/o-company/', // T11
  '/policy/', // T12
  '/news/', // T15
  '/kontakty/',
  '/sravnenie/',
];

const t0 = Date.now();
fs.mkdirSync(REPORT, { recursive: true });

// 1. HTML всех страниц (--skip-html — только скриншоты)
const skipHtml = args.get('skip-html') === 'true';
const pages = (await (await fetch(`${CONTENT}/v1/pages`)).json()) as { path: string; kind: string }[];
const only = args.get('only')?.split(',');
const htmlPaths = skipHtml ? [] : (only ?? pages.filter((p) => p.kind === 'page').map((p) => p.path)).filter((p) =>
  fs.existsSync(path.join(DIST, ...p.split('/').filter(Boolean), 'index.html')),
);
if (!skipHtml) console.log(`HTML-сверка: ${htmlPaths.length} страниц…`);
const html = await checkHtml({
  distDir: DIST,
  newBase: NEW_BASE,
  paths: htmlPaths,
  onProgress: (d, t) => {
    if (d % 100 === 0 || d === t) process.stdout.write(`  ${d}/${t}\r`);
  },
});
console.log(`\nрасхождений: ${html.diffs.length}`, html.byField);
for (const d of html.diffs.slice(0, Number(args.get('show') ?? 12))) {
  console.log(`\n✗ ${d.path} [${d.field}]\n  было: ${d.old}\n  стало: ${d.new}`);
}
fs.writeFileSync(path.join(REPORT, 'html.json'), JSON.stringify(html, null, 2));

// 2. Скриншоты
if (args.get('visual') === 'true') {
  const server = await serveDist(DIST, 4400);
  const visualPaths = only ?? VISUAL_SAMPLE;
  console.log(`\nВизуальная сверка: ${visualPaths.length} страниц × 2 экрана…`);
  const results = await checkVisual({
    oldBase: 'http://127.0.0.1:4400',
    newBase: NEW_BASE,
    paths: visualPaths,
    outDir: path.join(REPORT, 'visual'),
    onResult: (r) =>
      console.log(
        `  ${r.diffPixels === 0 ? '✓' : r.diffRatio < 0.001 ? '≈' : '✗'} ${r.viewport.padEnd(7)} ${r.path}  ` +
          `${(r.diffRatio * 100).toFixed(3)}% (${r.diffPixels} px), высота ${r.oldHeight}→${r.newHeight}`,
      ),
  });
  server.close();
  fs.writeFileSync(path.join(REPORT, 'visual.json'), JSON.stringify(results, null, 2));
  const identical = results.filter((r) => r.diffPixels === 0).length;
  console.log(`\nпиксель-в-пиксель: ${identical} из ${results.length}`);
}
console.log(`\nготово за ${((Date.now() - t0) / 1000).toFixed(0)} с, отчёт: ${REPORT}`);
