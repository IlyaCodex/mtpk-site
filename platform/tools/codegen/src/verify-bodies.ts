/**
 * Сверка: тело каждой страницы, развёрнутое новым кодом (шорткоды → React-блоки),
 * должно совпасть с содержимым <main> итоговой Astro-сборки. Сравнение по DOM:
 * обе строки разбираются parse5 и сериализуются заново (сущности, кавычки,
 * булевы атрибуты приводятся к одному виду).
 * Запуск: npx tsx tools/codegen/src/verify-bodies.ts
 */
import { parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { renderPageBody } from '@mtpk/blocks/render';
import { distHtml, mainInner, rawPages } from './legacy-dist.ts';

type Node = DefaultTreeAdapterMap['node'];

/** Каноничная форма DOM: атрибуты по алфавиту, style без лишних пробелов и «;». */
function normalize(nodes: Node[]) {
  for (const n of nodes) {
    if (!('attrs' in n)) continue;
    const el = n as DefaultTreeAdapterMap['element'];
    for (const a of el.attrs) {
      if (a.name === 'style') {
        a.value = a.value
          .split(';')
          .map((d) => d.trim())
          .filter(Boolean)
          .map((d) => d.replace(/\s*:\s*/, ':'))
          .join(';');
      }
    }
    el.attrs.sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
    normalize(el.childNodes as Node[]);
    if (el.tagName === 'template') normalize((el as unknown as { content: { childNodes: Node[] } }).content.childNodes);
  }
}

function canon(html: string): string {
  const frag = parseFragment(html);
  normalize(frag.childNodes as Node[]);
  return serialize(frag).replace(/\s+/g, ' ').trim();
}

let ok = 0;
const bad: { path: string; at: number; ours: string; theirs: string }[] = [];
for (const page of rawPages()) {
  let dist: string;
  try {
    dist = mainInner(distHtml(page.path));
  } catch {
    bad.push({ path: page.path, at: -1, ours: '', theirs: 'нет в dist' });
    continue;
  }
  // Служебный span Pagefind: BaseLayout ставил его в начало <main>, а у части
  // страниц такой же span попал в сам исходник. Для сверки убираем со всех сторон.
  const dropPf = (s: string) => s.replace(/<span data-pagefind-meta[^>]*><\/span>/g, '');
  const a = canon(dropPf(renderPageBody(page.body)));
  const b = canon(dropPf(dist));
  if (a === b) {
    ok++;
    continue;
  }
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  bad.push({ path: page.path, at: i, ours: a.slice(Math.max(0, i - 80), i + 120), theirs: b.slice(Math.max(0, i - 80), i + 120) });
}
console.log(`совпало: ${ok} из ${ok + bad.length}`);
for (const d of bad.slice(0, 8)) {
  console.log(`\n✗ ${d.path} (позиция ${d.at})\n  новое: …${d.ours}…\n  astro: …${d.theirs}…`);
}
if (bad.length) process.exitCode = 1;
