import fs from 'node:fs';
import type { Db } from '@mtpk/db';

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
  await db.$transaction(
    async (tx) => {
      // Легаси-карта — целиком из файла; ручные редиректы (source=manual) не удаляем,
      // но адрес назначения у совпавших с картой берём из карты.
      removed = (await tx.redirect.deleteMany({ where: { source: 'legacy-map' } })).count;
      const manual = new Set(
        (await tx.redirect.findMany({ where: { fromPath: { in: rows.map((r) => r.from) } }, select: { fromPath: true } })).map((r) => r.fromPath),
      );
      await tx.redirect.createMany({
        data: rows.filter((r) => !manual.has(r.from)).map((r) => ({ fromPath: r.from, toPath: r.to, code: 301, source: 'legacy-map' })),
        skipDuplicates: true,
      });
      for (const r of rows) if (manual.has(r.from)) await tx.redirect.update({ where: { fromPath: r.from }, data: { toPath: r.to } });
    },
    { timeout: 120_000 },
  );
  return { total: rows.length, written: rows.length, removed, missing: false };
}
