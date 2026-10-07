import { scriptHash } from '@mtpk/content-kit/scripts';
import { walkBlocks, type Block } from '@mtpk/content-model';
import { ServiceRefusal } from '@mtpk/shared';
import { transform, type TransformFailure } from 'esbuild';
import type { Db } from './db.ts';

/**
 * Блоки «Скрипт»: TypeScript/JavaScript → JS для браузера. Код оборачивается
 * в свою область видимости (переменные двух скриптов не пересекаются) и
 * сжимается. Сайт подключает результат файлом /js/page/<хеш>.js.
 */
export async function compileScript(source: string): Promise<string> {
  const { code } = await transform(source, {
    loader: 'ts',
    format: 'iife',
    target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
    minify: true,
    legalComments: 'none',
  });
  return code;
}

/** Ошибка сборки → понятное сообщение для редактора: строка, столбец, что не так. */
function compileError(err: unknown): string {
  const first = (err as Partial<TransformFailure>).errors?.[0];
  if (!first) return `Ошибка в скрипте: ${err instanceof Error ? err.message : String(err)}`;
  const at = first.location ? `строка ${first.location.line}, столбец ${first.location.column + 1}: ` : '';
  return `Ошибка в скрипте — ${at}${first.text}`;
}

async function record(source: string) {
  const js = await compileScript(source);
  return { hash: scriptHash(source), source, js, bytes: Buffer.byteLength(js) };
}

/**
 * Скрипты из блоков (страницы или шаблона категории) — собрать и записать до
 * сохранения: ошибка в коде — отказ с сообщением, страница не меняется.
 */
export async function storeScripts(db: Db, blocks: Block[]): Promise<void> {
  const rows = [];
  for (const b of walkBlocks(blocks)) {
    if (b.type !== 'script' || !b.code.trim()) continue;
    try {
      rows.push(await record(b.code));
    } catch (err) {
      throw new ServiceRefusal(400, 'script_error', compileError(err));
    }
  }
  if (rows.length) await db.scriptBlock.createMany({ data: rows, skipDuplicates: true });
}

/**
 * JS по хешу исходника. Нет в таблице (блок записан в обход админки) — ищем
 * исходник в страницах и шаблонах категорий и собираем.
 */
export async function scriptJs(db: Db, hash: string): Promise<string | null> {
  const hit = await db.scriptBlock.findUnique({ where: { hash }, select: { js: true } });
  if (hit) return hit.js;
  const [pages, categories] = await Promise.all([
    db.$queryRaw<{ blocks: unknown }[]>`SELECT blocks FROM content.pages WHERE blocks::text LIKE '%"script"%'`,
    db.category.findMany({ select: { productBlocks: true } }),
  ]);
  for (const blocks of [...pages.map((p) => p.blocks), ...categories.map((c) => c.productBlocks)]) {
    for (const b of walkBlocks((blocks ?? []) as Block[])) {
      if (b.type !== 'script' || scriptHash(b.code) !== hash) continue;
      try {
        const row = await record(b.code);
        await db.scriptBlock.createMany({ data: [row], skipDuplicates: true });
        return row.js;
      } catch {
        return null;
      }
    }
  }
  return null;
}
