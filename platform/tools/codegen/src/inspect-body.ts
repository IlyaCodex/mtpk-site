// Верхнеуровневая структура <body> итоговой страницы: npx tsx tools/codegen/src/inspect-body.ts /путь/
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { distHtml } from './legacy-dist.ts';

type Element = DefaultTreeAdapterMap['element'];
const target = process.argv[2] ?? '/kontakty/';
const doc = parse(distHtml(target), { sourceCodeLocationInfo: true });
const html = doc.childNodes.find((n) => 'tagName' in n && n.tagName === 'html') as Element;
const body = html.childNodes.find((n) => 'tagName' in n && n.tagName === 'body') as Element;
for (const n of body.childNodes) {
  if (!('tagName' in n)) continue;
  const el = n as Element;
  const attrs = el.attrs.map((a) => `${a.name}="${a.value.slice(0, 50)}"`).join(' ');
  const loc = el.sourceCodeLocation!;
  console.log(`<${el.tagName} ${attrs}>  [${loc.endOffset - loc.startOffset} байт]`);
}
