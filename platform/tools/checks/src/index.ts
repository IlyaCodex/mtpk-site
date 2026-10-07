/**
 * Проверка сайта против эталона — «не поехало ли что-то» после правки.
 *
 *   npm run checks -- --save              — сохранить эталон: HTML всех страниц и данные
 *   npm run checks -- --save --visual     — плюс эталонные снимки выборки страниц
 *   npm run checks                        — сверить сайт с эталоном (HTML и данные)
 *   npm run checks -- --visual            — плюс попиксельная сверка снимков
 *   --only=/,/kontakty/                   — только эти страницы
 *
 * Сайт — http://127.0.0.1:3200 (CHECKS_SITE), контент-сервис — CONTENT_URL.
 * Эталон — tools/checks/baseline/, отчёт — tools/checks/report/ (в git не попадают).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { compareSnapshots, takeSnapshot, type Snapshot } from './snapshot.ts';
import { compareShots, saveShots } from './visual-check.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.resolve(here, '../baseline');
const REPORT = path.resolve(here, '../report');
const SITE = process.env.CHECKS_SITE ?? 'http://127.0.0.1:3200';
const CONTENT = process.env.CONTENT_URL ?? 'http://127.0.0.1:4101';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'] as const;
  }),
);
const only = args.get('only')?.split(',');
const visual = args.has('visual');

/** Представители всех типов страниц — для снимков. */
const VISUAL_SAMPLE = [
  '/', // главная
  '/products/', // корень каталога
  '/products/induktsionnye-plavilnye-pechi/', // категория
  '/products/oborudovanie-lvm/', // категория-линейка
  '/products/drobemetnoe-oborudovanie/kranovogo-tipa/', // подкатегория с фильтром
  '/products/induktsionnye-plavilnye-pechi/po-stali/', // подкатегория: фильтр, «В наличии»
  '/products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-376/', // товар: галерея, характеристики
  '/products/sistemy-ohlazhdeniya/chillery/uich-005/', // товар: гарантия 12 месяцев
  '/products/zapchasti/', // запчасти: витрина
  '/products/zapchasti/drobemetnoe/uid-376/', // запчасти: позиция
  '/uslugi/puskonaladka/', // услуга
  '/proekty/', // проекты
  '/proekty/perm/', // кейс
  '/nalichie/', // наличие (рендер на клиенте)
  '/proizvodstvo/',
  '/o-company/',
  '/policy/',
  '/news/',
  '/kontakty/',
  '/sravnenie/',
  '/praktikum/', // Практикум: оглавление
  '/praktikum/litie-po-lgm/', // Практикум: статья
];

const t0 = Date.now();
// эталон HTML сжат: ~1000 страниц занимают ~10 МБ вместо ~80
const snapshotFile = path.join(BASELINE, 'site.json.gz');
const readSnapshot = (): Snapshot => JSON.parse(zlib.gunzipSync(fs.readFileSync(snapshotFile)).toString('utf8'));
const writeSnapshot = (snap: Snapshot) => fs.writeFileSync(snapshotFile, zlib.gzipSync(JSON.stringify(snap)));
const shotsDir = path.join(BASELINE, 'shots');
const progress = (d: number, t: number) => {
  if (d % 100 === 0 || d === t) process.stdout.write(`  ${d}/${t}\r`);
};

if (args.has('save')) {
  fs.mkdirSync(BASELINE, { recursive: true });
  console.log('Эталон: HTML страниц и данные…');
  const snap = await takeSnapshot({ site: SITE, content: CONTENT, only, onProgress: progress });
  // эталон по выборке дополняет общий, а не затирает его
  const prev: Snapshot | null = only && fs.existsSync(snapshotFile) ? readSnapshot() : null;
  const merged = prev ? { ...prev, pages: { ...prev.pages, ...snap.pages } } : snap;
  writeSnapshot(merged);
  console.log(`\nсохранено адресов: ${Object.keys(snap.pages).length}`);
  if (visual) {
    const paths = only ?? VISUAL_SAMPLE;
    console.log(`Эталонные снимки: ${paths.length} страниц × 2 экрана…`);
    await saveShots({ site: SITE, paths, dir: shotsDir, onShot: (n) => console.log(`  ${n}`) });
  }
} else {
  if (!fs.existsSync(snapshotFile)) {
    console.error('Эталона нет — сначала: npm run checks -- --save');
    process.exit(1);
  }
  fs.mkdirSync(REPORT, { recursive: true });
  const base = readSnapshot();
  console.log(`Сверка с эталоном от ${base.takenAt}…`);
  const now = await takeSnapshot({ site: SITE, content: CONTENT, only, onProgress: progress });
  const r = compareSnapshots(base, now);
  console.log(`\nстраниц совпало: ${r.same} из ${r.same + r.diffs.length}`);
  for (const d of r.diffs.slice(0, Number(args.get('show') ?? 12))) console.log(`\n✗ ${d.path}\n  было:  ${d.was}\n  стало: ${d.now}`);
  if (r.added.length) console.log(`\nновые адреса (нет в эталоне): ${r.added.length} — ${r.added.slice(0, 5).join(' ')}`);
  if (r.missing.length) console.log(`пропавшие адреса: ${r.missing.length} — ${r.missing.slice(0, 5).join(' ')}`);
  if (!only) console.log(`данные: ${r.data.length ? `изменились — ${r.data.join(', ')}` : 'без изменений'}`);
  fs.writeFileSync(path.join(REPORT, 'html.json'), JSON.stringify(r, null, 2));

  if (visual) {
    const paths = only ?? VISUAL_SAMPLE;
    console.log(`\nСнимки: ${paths.length} страниц × 2 экрана…`);
    const results = await compareShots({
      site: SITE,
      paths,
      baseDir: shotsDir,
      outDir: path.join(REPORT, 'visual'),
      onResult: (v) =>
        console.log(
          `  ${v.diffPixels === 0 ? '✓' : v.diffRatio < 0.001 ? '≈' : '✗'} ${v.viewport.padEnd(7)} ${v.path}  ` +
            `${(v.diffRatio * 100).toFixed(3)}% (${v.diffPixels} px), высота ${v.baseHeight}→${v.newHeight}`,
        ),
    });
    fs.writeFileSync(path.join(REPORT, 'visual.json'), JSON.stringify(results, null, 2));
    console.log(`\nпиксель-в-пиксель: ${results.filter((v) => v.diffPixels === 0).length} из ${results.length}`);
  }
}
console.log(`\nготово за ${((Date.now() - t0) / 1000).toFixed(0)} с`);
