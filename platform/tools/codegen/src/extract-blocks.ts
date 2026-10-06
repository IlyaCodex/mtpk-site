/**
 * Генерирует React-компоненты блоков (<!--C:leadgen--> и др.) из итогового
 * HTML Astro-сборки. Запуск: npm run blocks -w @mtpk/codegen
 * Результат — packages/blocks/src/generated/*.tsx (+ отчёт об одинаковости
 * экземпляров блока на разных страницах). Параметры (гарантия, якорь)
 * расставляются вручную в packages/blocks/src/blocks/*.tsx.
 */
import fs from 'node:fs';
import path from 'node:path';
import { htmlToJsx } from './html-to-jsx.ts';
import { PLATFORM, rawPages, renderedBlocks } from './legacy-dist.ts';

const OUT = path.join(PLATFORM, 'packages', 'blocks', 'src', 'generated');
fs.mkdirSync(OUT, { recursive: true });

const pascal = (s: string) => s.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');

// Все варианты каждого блока по всем страницам: должны совпадать.
const variants = new Map<string, Map<string, string[]>>();
let pagesScanned = 0;
for (const page of rawPages()) {
  if (!page.body.includes('<!--C:')) continue;
  let blocks;
  try {
    blocks = renderedBlocks(page);
  } catch (err) {
    console.warn('пропуск:', (err as Error).message);
    continue;
  }
  pagesScanned++;
  for (const b of blocks) {
    const m = variants.get(b.name) ?? new Map<string, string[]>();
    const list = m.get(b.html) ?? [];
    list.push(page.path);
    m.set(b.html, list);
    variants.set(b.name, m);
  }
}

console.log(`страниц с блоками: ${pagesScanned}`);
for (const [name, m] of [...variants.entries()].sort()) {
  const sorted = [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log(`  ${name}: вариантов ${m.size} — ${sorted.map(([, p]) => p.length).join(' / ')}`);
  sorted.forEach(([html, pages], i) => {
    const comp = pascal(name) + (i ? `V${i + 1}` : '');
    const { jsx, warnings } = htmlToJsx(html, '    ');
    if (warnings.inlineHandlers.length) console.warn(`  ⚠ ${comp}: inline-обработчики`, warnings.inlineHandlers);
    const src = `// СГЕНЕРИРОВАНО tools/codegen (extract-blocks) из astro/dist — эталон для ${name}.
// Пример страницы: ${pages[0]} (всего страниц с этим вариантом: ${pages.length}).
export function ${comp}() {
  return (
    <>
${jsx}
    </>
  );
}
`;
    fs.writeFileSync(path.join(OUT, `${comp}.tsx`), src);
  });
}
