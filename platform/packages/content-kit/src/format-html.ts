import { parseFragment, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];

/**
 * Блочные элементы (блочные по умолчанию): с новой строки и с отступом по
 * вложенности. Пробелы между ними на вид страницы не влияют. Строчные
 * (<a>, <span>, <img>, <svg>, <button>, <input>…) остаются в строке как были.
 */
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'caption', 'colgroup', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
  'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);
/** Внутрь не заходим: переносы и пробелы значимы (или это код, или SVG). */
const OPAQUE = new Set(['pre', 'textarea', 'script', 'style', 'svg', 'template', 'noscript']);
const SHORT = 100;

const isElement = (n: ChildNode): n is Element => 'tagName' in n;
const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/"/g, '&quot;');

function hasBlock(el: Element): boolean {
  if (OPAQUE.has(el.tagName)) return false;
  return el.childNodes.some((c) => isElement(c) && (BLOCK.has(c.tagName) || hasBlock(c)));
}

function format(nodes: ChildNode[], depth: number, out: string[]) {
  const pad = '  '.repeat(depth);
  // соседние строчные узлы — одной строкой, между ними ничего не добавляем
  let run = '';
  const flush = () => {
    const line = run.trim();
    if (line) out.push(pad + line);
    run = '';
  };
  for (const n of nodes) {
    if (!isElement(n)) {
      if (n.nodeName === '#text') run += escapeText((n as DefaultTreeAdapterMap['textNode']).value).replace(/\s+/g, ' ');
      else if (n.nodeName === '#comment') run += `<!--${(n as DefaultTreeAdapterMap['commentNode']).data}-->`;
      continue;
    }
    if (!BLOCK.has(n.tagName) && !hasBlock(n)) {
      run += serializeOuter(n);
      continue;
    }
    flush();
    const html = serializeOuter(n);
    if (!hasBlock(n) || (html.length <= SHORT && !html.includes('\n'))) {
      out.push(pad + html);
      continue;
    }
    const attrs = n.attrs.map((a) => ` ${a.name}="${escapeAttr(a.value)}"`).join('');
    out.push(`${pad}<${n.tagName}${attrs}>`);
    format(n.childNodes, depth + 1, out);
    out.push(`${pad}</${n.tagName}>`);
  }
  flush();
}

/**
 * HTML с отступами для правки кодом (разметка, которую вывел блок с полями):
 * блочные элементы — каждый с новой строки, строчное содержимое — одной
 * строкой, как было. Пробелы добавляются только между блочными элементами.
 */
export function formatHtml(html: string): string {
  const out: string[] = [];
  format(parseFragment(html).childNodes, 0, out);
  return out.join('\n');
}
