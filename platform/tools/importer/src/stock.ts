import fs from 'node:fs';
import { stockItems, type Db } from '@mtpk/db';

const KNOWN = new Set(['url', 'qty', 'shipping', 'note', 'title', 'image', 'specs']);

/** data/stock.config.json → content.stock_items (порядок позиций сохраняется). */
export async function importStock(db: Db, configFile: string, opts: { dryRun?: boolean } = {}) {
  if (!fs.existsSync(configFile)) return { total: 0, missing: true };
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8')) as { items?: Record<string, unknown>[] };
  const items = Array.isArray(config.items) ? config.items : [];
  if (opts.dryRun) return { total: items.length, missing: false };
  await db.transaction(async (tx) => {
    await tx.delete(stockItems);
    if (!items.length) return;
    await tx.insert(stockItems).values(
      items.map((it, i) => {
        const extra: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(it)) if (!KNOWN.has(k)) extra[k] = v;
        return {
          position: i,
          url: String(it.url ?? ''),
          qty: typeof it.qty === 'number' ? it.qty : null,
          shipping: typeof it.shipping === 'string' ? it.shipping : null,
          note: typeof it.note === 'string' ? it.note : null,
          title: typeof it.title === 'string' ? it.title : null,
          image: typeof it.image === 'string' ? it.image : null,
          specs: Array.isArray(it.specs) ? (it.specs as [string, string][]) : null,
          extra,
        };
      }),
    );
  });
  return { total: items.length, missing: false };
}
