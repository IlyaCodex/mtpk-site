/**
 * HTML-атрибуты ↔ React-пропсы. Нужны для блоков «HTML как есть», иконок SVG
 * и атрибутов-«хвостов» (data-*, aria-*, loading…), которые хранятся в данных
 * блока словарём и выводятся без потерь.
 */

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
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
};

const BOOLEAN = new Set([
  'required', 'hidden', 'disabled', 'checked', 'selected', 'multiple', 'defer', 'async', 'open',
  'novalidate', 'autofocus', 'readonly', 'loop', 'muted', 'controls', 'autoplay', 'playsinline',
  'allowfullscreen', 'formnovalidate', 'reversed', 'nomodule', 'inert', 'itemscope',
]);

const NUMERIC = new Set(['tabIndex', 'rows', 'cols', 'colSpan', 'rowSpan', 'maxLength', 'minLength', 'size', 'span', 'start']);

const SVG_TAGS = new Set([
  'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'defs', 'linearGradient',
  'radialGradient', 'stop', 'use', 'symbol', 'clipPath', 'mask', 'text', 'tspan', 'pattern', 'filter',
]);

const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** style="a: b; c: d" → { a: 'b', c: 'd' } (с учётом скобок и кавычек). */
export function styleToObject(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  const flush = () => {
    const i = cur.indexOf(':');
    if (i > 0) {
      const prop = cur.slice(0, i).trim();
      const value = cur.slice(i + 1).trim();
      if (prop) {
        const key = prop.startsWith('--')
          ? prop
          : prop.startsWith('-ms-')
            ? camel(prop.slice(1))
            : prop.startsWith('-')
              ? camel(prop.slice(1)).replace(/^./, (c) => c.toUpperCase())
              : camel(prop.toLowerCase());
        out[key] = value;
      }
    }
    cur = '';
  };
  for (const ch of style) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) {
      flush();
      continue;
    }
    cur += ch;
  }
  flush();
  return out;
}

/** Атрибуты HTML → пропсы React. */
export function toProps(attrs: Record<string, string> | undefined, tag = ''): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (!attrs) return props;
  const svg = SVG_TAGS.has(tag);
  for (const [name, value] of Object.entries(attrs)) {
    const lower = name.toLowerCase();
    if (/^on[a-z]+$/.test(lower)) continue; // строковые обработчики в React не выводятся
    if (lower === 'style') {
      props.style = styleToObject(value);
      continue;
    }
    let key = RENAME[lower] ?? (lower.startsWith('data-') || lower.startsWith('aria-') ? lower : name);
    if (svg && key.includes('-') && !key.startsWith('data-') && !key.startsWith('aria-')) key = camel(key);
    if (tag === 'input' && key === 'value') key = 'defaultValue';
    if (tag === 'input' && key === 'checked') key = 'defaultChecked';
    if (BOOLEAN.has(lower)) {
      props[key] = true;
      continue;
    }
    props[key] = NUMERIC.has(key) && /^-?\d+$/.test(value) ? Number(value) : value;
  }
  return props;
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

/** Расшифровка сущностей в значении атрибута (React экранирует заново). */
export function decodeAttr(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** Разбор строки атрибутов открывающего тега. */
export function parseAttrString(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(ATTR_RE)) {
    const name = m[1];
    if (!name || name === '/') continue;
    out[name] = decodeAttr(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

export const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export interface ParsedElement {
  tag: string;
  attrs: Record<string, string>;
  inner: string;
}

/** Внешний HTML одного элемента → тег, атрибуты, внутренний HTML. */
export function parseElement(html: string): ParsedElement | null {
  const s = html.trim();
  const m = s.match(/^<([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/);
  if (!m) return null;
  // регистр сохраняем: у SVG есть теги вроде linearGradient
  const tag = m[1];
  const attrStr = m[2].replace(/\/\s*$/, '');
  const attrs = parseAttrString(attrStr);
  if (VOID_TAGS.has(tag.toLowerCase())) return { tag, attrs, inner: '' };
  const close = s.toLowerCase().lastIndexOf(`</${tag.toLowerCase()}`);
  const inner = close > m[0].length ? s.slice(m[0].length, close) : s.slice(m[0].length);
  return { tag, attrs, inner };
}
