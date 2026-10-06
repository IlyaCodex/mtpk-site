/**
 * HTML → JSX. Конвертирует итоговый HTML Astro-сборки в исходник React-компонента
 * так, чтобы renderToStaticMarkup выдал ту же разметку: каждый текстовый узел
 * переносится строкой как есть (пробелы и переносы между тегами сохраняются —
 * от них зависит отрисовка inline-элементов), атрибуты переименовываются в
 * React-имена, style превращается в объект.
 */
import { parseFragment, serialize } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

const BOOLEAN = new Set([
  'required', 'hidden', 'disabled', 'checked', 'selected', 'multiple', 'defer', 'async', 'open',
  'novalidate', 'autofocus', 'readonly', 'loop', 'muted', 'controls', 'autoplay', 'playsinline',
  'allowfullscreen', 'formnovalidate', 'reversed', 'nomodule', 'inert', 'itemscope',
]);

const NUMERIC = new Set(['tabIndex', 'rows', 'cols', 'colSpan', 'rowSpan', 'maxLength', 'minLength', 'size', 'span', 'start']);

const RENAME: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  crossorigin: 'crossOrigin',
  fetchpriority: 'fetchPriority',
  srcset: 'srcSet',
  maxlength: 'maxLength',
  minlength: 'minLength',
  readonly: 'readOnly',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  enctype: 'encType',
  novalidate: 'noValidate',
  inputmode: 'inputMode',
  enterkeyhint: 'enterKeyHint',
  'accept-charset': 'acceptCharset',
  'http-equiv': 'httpEquiv',
  charset: 'charSet',
  datetime: 'dateTime',
  frameborder: 'frameBorder',
  allowfullscreen: 'allowFullScreen',
  referrerpolicy: 'referrerPolicy',
  spellcheck: 'spellCheck',
  contenteditable: 'contentEditable',
  itemprop: 'itemProp',
  itemscope: 'itemScope',
  itemtype: 'itemType',
  formnovalidate: 'formNoValidate',
  playsinline: 'playsInline',
  autoplay: 'autoPlay',
  usemap: 'useMap',
  nomodule: 'noModule',
  'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace',
  'xmlns:xlink': 'xmlnsXlink',
  'xml:lang': 'xmlLang',
};

/** Строка для JSX: экранирует неразрывные/невидимые пробелы, чтобы их было видно в коде. */
export function jsString(s: string): string {
  return JSON.stringify(s)
    .replace(/\u00A0/g, '\\u00A0')
    .replace(/\u2009/g, '\\u2009')
    .replace(/\u2060/g, '\\u2060')
    .replace(/\u200B/g, '\\u200B')
    .replace(/\u00AD/g, '\\u00AD')
    .replace(/\u2011/g, '\\u2011');
}

function camel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function cssPropToJs(prop: string): string {
  if (prop.startsWith('--')) return jsString(prop);
  if (prop.startsWith('-ms-')) return camel(prop.slice(1));
  if (prop.startsWith('-')) return camel(prop.slice(1)).replace(/^./, (c) => c.toUpperCase());
  return camel(prop);
}

/** style="a:b; c:d" → {{ a: "b", c: "d" }} (точки с запятой внутри url()/кавычек учитываются). */
export function styleToJsx(style: string): string {
  const decls: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (const ch of style) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) {
      decls.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  decls.push(cur);
  const parts = decls
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':');
      const prop = d.slice(0, i).trim().toLowerCase();
      const value = d.slice(i + 1).trim();
      return `${cssPropToJs(prop)}: ${jsString(value)}`;
    });
  return `{{ ${parts.join(', ')} }}`;
}

function attrName(name: string, inSvg: boolean): string {
  if (RENAME[name]) return RENAME[name];
  if (name.startsWith('data-') || name.startsWith('aria-')) return name;
  if (inSvg && name.includes('-')) return camel(name);
  return name;
}

export interface ConvertWarnings {
  inlineHandlers: string[];
}

export interface ConvertOptions {
  /** Переопределить атрибут: вернуть готовый JSX-атрибут (например className={cls('x')}). */
  attrHook?: (el: Element, name: string, value: string) => string | undefined;
  /** Вывести содержимое элемента сырым HTML (React не сверяет его при гидратации). */
  rawInner?: (el: Element) => boolean;
  /** Дополнительные JSX-атрибуты элемента (например suppressHydrationWarning). */
  extraAttrs?: (el: Element) => string | undefined;
}

let currentOptions: ConvertOptions = {};

function attrsToJsx(el: Element, inSvg: boolean, warnings: ConvertWarnings): string {
  const out: string[] = [];
  for (const a of el.attrs) {
    const full = a.prefix ? `${a.prefix}:${a.name}` : a.name;
    const hooked = currentOptions.attrHook?.(el, full, a.value);
    if (hooked !== undefined) {
      out.push(hooked);
      continue;
    }
    if (/^on[a-z]+$/.test(full)) {
      warnings.inlineHandlers.push(`<${el.tagName} ${full}="${a.value}">`);
      continue;
    }
    if (full === 'style') {
      out.push(`style=${styleToJsx(a.value)}`);
      continue;
    }
    let name = attrName(full, inSvg);
    if (el.tagName === 'input' && name === 'value') name = 'defaultValue';
    if (el.tagName === 'input' && name === 'checked') name = 'defaultChecked';
    if (BOOLEAN.has(full) && (a.value === '' || a.value.toLowerCase() === full)) {
      out.push(name);
      continue;
    }
    // числовые атрибуты в React-типах — числа: tabIndex={-1}
    if (NUMERIC.has(name) && /^-?\d+$/.test(a.value)) {
      out.push(`${name}={${a.value}}`);
      continue;
    }
    const plain = /^[^"&{}<>\u00A0]*$/.test(a.value);
    out.push(plain ? `${name}="${a.value}"` : `${name}={${jsString(a.value)}}`);
  }
  const extra = currentOptions.extraAttrs?.(el);
  if (extra) out.push(extra);
  return out.length ? ` ${out.join(' ')}` : '';
}

function textToJsx(text: string): string {
  // Простой текст без пробелов по краям и спецсимволов — как есть, остальное строкой.
  if (/^[^{}<>\n\r\t\u00A0\u2009\u2060\u200B\u00AD&]+$/.test(text) && text === text.trim() && !/ {2}/.test(text)) {
    return text;
  }
  return `{${jsString(text)}}`;
}

function convertNodes(nodes: Node[], indent: string, inSvg: boolean, warnings: ConvertWarnings): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.nodeName === '#text') {
      const value = (node as DefaultTreeAdapterMap['textNode']).value;
      if (value) out.push(indent + textToJsx(value));
      continue;
    }
    if (node.nodeName === '#comment' || !('tagName' in node)) continue;
    const el = node as Element;
    const tag = el.tagName;
    const svg = inSvg || tag === 'svg';
    const attrs = attrsToJsx(el, svg, warnings);
    if (tag === 'script' || tag === 'style') {
      const raw = el.childNodes.map((c) => (c as DefaultTreeAdapterMap['textNode']).value ?? '').join('');
      out.push(`${indent}<${tag}${attrs} dangerouslySetInnerHTML={{ __html: ${jsString(raw)} }} />`);
      continue;
    }
    if (currentOptions.rawInner?.(el)) {
      const inner = serialize(el);
      out.push(`${indent}<${tag}${attrs} dangerouslySetInnerHTML={{ __html: ${jsString(inner)} }} />`);
      continue;
    }
    if (tag === 'textarea') {
      const raw = el.childNodes.map((c) => (c as DefaultTreeAdapterMap['textNode']).value ?? '').join('');
      out.push(`${indent}<textarea${attrs}${raw ? ` defaultValue={${jsString(raw)}}` : ''} />`);
      continue;
    }
    const children = tag === 'template'
      ? (el as unknown as { content: { childNodes: Node[] } }).content.childNodes
      : el.childNodes;
    if (VOID.has(tag) || children.length === 0) {
      out.push(`${indent}<${tag}${attrs} />`);
      continue;
    }
    const inner = convertNodes(children, `${indent}  `, svg, warnings);
    out.push(`${indent}<${tag}${attrs}>`, ...inner, `${indent}</${tag}>`);
  }
  return out;
}

/** HTML-фрагмент → строки JSX (без обёртки). */
export function htmlToJsx(
  html: string,
  indent = '    ',
  options: ConvertOptions = {},
): { jsx: string; warnings: ConvertWarnings } {
  const warnings: ConvertWarnings = { inlineHandlers: [] };
  const frag = parseFragment(html);
  currentOptions = options;
  try {
    const lines = convertNodes(frag.childNodes as Node[], indent, false, warnings);
    return { jsx: lines.join('\n'), warnings };
  } finally {
    currentOptions = {};
  }
}

export type { Element as HtmlElement };

/** Верхнеуровневые элементы фрагмента с их HTML (для разрезания соседних блоков). */
export function topLevelElements(html: string): { tag: string; className: string; start: number; end: number }[] {
  const frag = parseFragment(html, { sourceCodeLocationInfo: true });
  const out: { tag: string; className: string; start: number; end: number }[] = [];
  for (const node of frag.childNodes as Node[]) {
    if (!('tagName' in node)) continue;
    const el = node as Element;
    const loc = el.sourceCodeLocation;
    if (!loc) continue;
    out.push({
      tag: el.tagName,
      className: el.attrs.find((a) => a.name === 'class')?.value ?? '',
      start: loc.startOffset,
      end: loc.endOffset,
    });
  }
  return out;
}
