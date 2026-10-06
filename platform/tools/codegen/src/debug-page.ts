// Отладка сверки одной страницы: npx tsx tools/codegen/src/debug-page.ts /путь/
import { renderPageBody } from '@mtpk/blocks/render';
import { distHtml, mainInner, rawPages } from './legacy-dist.ts';

const target = process.argv[2] ?? '/';
const p = rawPages().find((x) => x.path === target);
if (!p) throw new Error(`нет страницы ${target}`);
const d = mainInner(distHtml(p.path));
console.log('DIST:', JSON.stringify(d.slice(0, 400)));
console.log('OURS:', JSON.stringify(renderPageBody(p.body).slice(0, 400)));
