import fs from 'node:fs';
import { redirects, sql, eq, type Db } from '@mtpk/db';

/**
 * Разбор карты nginx (server/redirects-legacy.map):
 *   map $uri $legacy_redirect { default ""; /old/  /new/; … }
 * Каждая строка «ключ значение;» — точное совпадение $uri.
 */
export function parseNginxMap(text: string): { from: string; to: string }[] {
  const body = text.slice(text.indexOf('{') + 1, text.lastIndexOf('}'));
  const out: { from: string; to: string }[] = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line || !line.endsWith(';')) continue;
    const [from, to] = line.slice(0, -1).trim().split(/\s+/);
    if (!from || !to || from === 'default' || from.startsWith('~')) continue;
    out.push({ from: from.replace(/^"|"$/g, ''), to: to.replace(/^"|"$/g, '') });
  }
  return out;
}

export async function importRedirects(db: Db, mapFile: string, opts: { dryRun?: boolean } = {}) {
  if (!fs.existsSync(mapFile)) return { total: 0, written: 0, removed: 0, missing: true };
  const rows = parseNginxMap(fs.readFileSync(mapFile, 'utf-8'));
  if (opts.dryRun) return { total: rows.length, written: 0, removed: 0, missing: false };
  let removed = 0;
  await db.transaction(async (tx) => {
    // Легаси-карта — целиком из файла; ручные редиректы (source=manual) не трогаем.
    const res = await tx.delete(redirects).where(eq(redirects.source, 'legacy-map'));
    removed = res.rowCount ?? 0;
    for (let i = 0; i < rows.length; i += 500) {
      await tx
        .insert(redirects)
        .values(rows.slice(i, i + 500).map((r) => ({ fromPath: r.from, toPath: r.to, code: 301, source: 'legacy-map' })))
        .onConflictDoUpdate({
          target: redirects.fromPath,
          set: { toPath: sql`excluded.to_path`, updatedAt: sql`now()` },
        });
    }
  });
  return { total: rows.length, written: rows.length, removed, missing: false };
}
