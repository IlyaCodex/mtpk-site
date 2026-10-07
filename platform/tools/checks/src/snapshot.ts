/**
 * Эталон сайта и сверка с ним: HTML всех страниц и документов (как их отдаёт
 * сайт посетителю) и данные для клиентских модулей — склад, сравнение,
 * редиректы, настройки. Сохраняется перед правкой, после правки сайт
 * сравнивается с ним: видно каждую страницу, где изменилась разметка.
 */
import { canonHtml, firstDifference } from '@mtpk/content-kit/canon';

export interface Snapshot {
  takenAt: string;
  site: string;
  /** адрес → «код ответа» + HTML */
  pages: Record<string, string>;
  data: Record<string, unknown>;
}

const DATA = {
  stock: '/v1/data/stock.json',
  compareIndex: '/v1/data/compare-index.json',
  compareSections: '/v1/data/compare-sections.json',
  redirects: '/v1/redirects',
  settings: '/v1/settings',
};

/** То, что меняется от сборки к сборке без изменения страницы: служебные данные Next и хеши файлов. */
function stable(html: string): string {
  return html
    .replace(/<script id="__NEXT_DATA__"[\s\S]*?<\/script>/, '')
    .replace(/\/_next\/static\/[^"' )]+/g, '/_next/static/*')
    .replace(/(\/assets\/[a-z0-9-]+?)-[0-9a-f]{8,}\.(js|css)/g, '$1-*.$2')
    .replace(/<meta name="next-head-count"[^>]*>/, '');
}

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

/** Снимок сайта: все опубликованные адреса (или выбранные) и данные. */
export async function takeSnapshot(opts: { site: string; content: string; only?: string[]; onProgress?: (done: number, total: number) => void }): Promise<Snapshot> {
  const paths = opts.only ?? ((await (await fetch(`${opts.content}/v1/pages`)).json()) as { path: string }[]).map((p) => p.path);
  const pages: Record<string, string> = {};
  let done = 0;
  await pool(paths, 6, async (p) => {
    const res = await fetch(`${opts.site}${p}`, { redirect: 'manual' });
    pages[p] = `${res.status}\n${stable(await res.text())}`;
    opts.onProgress?.(++done, paths.length);
  });
  const data: Record<string, unknown> = {};
  if (!opts.only) for (const [k, u] of Object.entries(DATA)) data[k] = await (await fetch(`${opts.content}${u}`)).json();
  return { takenAt: new Date().toISOString(), site: opts.site, pages, data };
}

export interface SnapshotDiff {
  path: string;
  was: string;
  now: string;
}

/** Сверка с эталоном: страницы (в канонической форме HTML) и данные. */
export function compareSnapshots(base: Snapshot, now: Snapshot): { same: number; diffs: SnapshotDiff[]; missing: string[]; added: string[]; data: string[] } {
  const diffs: SnapshotDiff[] = [];
  const missing: string[] = [];
  let same = 0;
  for (const p of Object.keys(now.pages).sort()) {
    if (!(p in base.pages)) continue;
    const d = firstDifference(canonHtml(base.pages[p]), canonHtml(now.pages[p]), 90);
    if (d) diffs.push({ path: p, was: d.a, now: d.b });
    else same++;
  }
  for (const p of Object.keys(base.pages)) if (!(p in now.pages) && Object.keys(now.data).length) missing.push(p);
  const added = Object.keys(now.pages).filter((p) => !(p in base.pages));
  const data = Object.keys(now.data).filter((k) => JSON.stringify(base.data[k]) !== JSON.stringify(now.data[k]));
  return { same, diffs, missing, added, data };
}
