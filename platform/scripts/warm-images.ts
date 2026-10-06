/**
 * Прогрев уменьшенных копий картинок. Медиасервис создаёт копию (?w=…) при
 * первом запросе — первый посетитель ждёт перекодирования. Скрипт обходит
 * страницы сайта, собирает адреса из srcset (и копии фото галереи, которые
 * подставляет её модуль) и запрашивает их заранее. Запускать после импорта
 * страниц или выкладки.
 *
 *   npm run media:warm                         — все страницы, AVIF
 *   npm run media:warm -- --only=/products/    — выбранные страницы
 *   npm run media:warm -- --webp               — плюс WebP (браузеры без AVIF)
 *   npm run media:warm -- --dry-run            — только посчитать копии
 *   --site=http://127.0.0.1:3200 --content=http://127.0.0.1:4101
 */
import { responsive } from '@mtpk/ui/images';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'] as const;
  }),
);
const SITE = args.get('site') ?? 'http://127.0.0.1:3200';
const CONTENT = args.get('content') ?? 'http://127.0.0.1:4101';
const FORMATS = args.has('webp') ? ['image/avif,image/webp,*/*', 'image/webp,*/*'] : ['image/avif,image/webp,*/*'];

const decode = (s: string) => s.replace(/&amp;/g, '&');

/** Адреса копий на странице: srcset картинок, imagesrcset предзагрузки, кадры галереи (data-full). */
function variantUrls(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/gi)) {
    for (const part of decode(m[1]).split(',')) out.push(part.trim().split(/\s+/)[0]);
  }
  if (html.includes('phero__thumb')) {
    for (const m of html.matchAll(/\sdata-full="([^"]+)"/g)) {
      const hints = responsive(decode(m[1]), 'phero__main');
      if (hints) for (const part of hints.srcSet.split(',')) out.push(part.trim().split(/\s+/)[0]);
    }
  }
  return out.filter((u) => u.startsWith('/img/') && /[?&]w=\d+/.test(u));
}

/** Выполнить задачи не больше n одновременно. */
async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

const only = args.get('only')?.split(',');
const paths = only ?? ((await (await fetch(`${CONTENT}/v1/pages`)).json()) as { path: string; kind: string }[]).filter((p) => p.kind === 'page').map((p) => p.path);

const urls = new Set<string>();
await pool(paths, 4, async (p) => {
  const res = await fetch(`${SITE}${p}`);
  if (res.ok) for (const u of variantUrls(await res.text())) urls.add(u);
});
console.log(`страниц: ${paths.length}, копий: ${urls.size} × ${FORMATS.length} формат(а)`);
if (args.has('dry-run')) process.exit(0);

const jobs = [...urls].flatMap((u) => FORMATS.map((accept) => ({ u, accept })));
let done = 0;
let failed = 0;
const t0 = Date.now();
// медиасервис перекодирует не больше двух картинок одновременно — больше запросов не нужно
await pool(jobs, 2, async ({ u, accept }) => {
  const res = await fetch(`${SITE}${u}`, { headers: { accept } });
  await res.arrayBuffer();
  if (!res.ok) {
    failed++;
    console.warn(`${res.status} ${u}`);
  }
  if (++done % 200 === 0) console.log(`  ${done}/${jobs.length}`);
});
console.log(`готово за ${Math.round((Date.now() - t0) / 1000)} с: ${done - failed} копий, ошибок: ${failed}`);
