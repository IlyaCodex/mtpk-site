/**
 * Свой CSS и скрипт HTML-секции (блок html: поля css, script, sid). Корень
 * секции получает атрибут data-s="<sid>":
 *  - CSS привязывается к нему: селекторы — внутри секции, «&» — сама секция,
 *    :root/html/body — тоже сама секция; @media, @supports, @container, @layer
 *    разбираются внутри, @keyframes и @font-face остаются как есть;
 *  - скрипт выполняется с переменной section — элементом секции.
 * На сайте CSS и скрипт — файлами (как блоки «Стили» и «Скрипт»), в
 * предпросмотре CSS вставляется сразу, чтобы правки были видны до сохранения.
 */

/** Метка секции: латиница и цифры (безопасна в атрибуте, селекторе и коде). */
export const SECTION_ID = /^[a-z0-9]{4,16}$/;

export const sectionSelector = (sid: string) => `[data-s="${sid}"]`;

/** Индекс символа stop на верхнем уровне (вне строк, комментариев и скобок) начиная с from; нет — длина строки. */
function findTop(src: string, from: number, stops: string): number {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 1;
    } else if (c === '"' || c === "'") {
      i = skipString(src, i);
    } else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && stops.includes(c)) return i;
  }
  return src.length;
}

function skipString(src: string, at: number): number {
  const q = src[at];
  for (let i = at + 1; i < src.length; i++) {
    if (src[i] === '\\') i++;
    else if (src[i] === q) return i;
  }
  return src.length;
}

/** Закрывающая «}» для «{» в позиции open. */
function matchBrace(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 1;
    } else if (c === '"' || c === "'") i = skipString(src, i);
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return src.length;
}

/** Список селекторов «a, b» → с привязкой к секции. */
function scopeSelectors(list: string, scope: string): string {
  const parts: string[] = [];
  let start = 0;
  for (;;) {
    const comma = findTop(list, start, ',');
    parts.push(list.slice(start, comma));
    if (comma >= list.length) break;
    start = comma + 1;
  }
  return parts
    .map((part) => {
      const lead = part.match(/^\s*/)![0];
      const tail = part.match(/\s*$/)![0];
      const sel = part.trim();
      if (!sel) return part;
      const scoped = sel.includes('&') ? sel.replaceAll('&', scope) : /^(:root|html|body)\b/.test(sel) ? sel.replace(/^(:root|html|body)\b/, scope) : `${scope} ${sel}`;
      return lead + scoped + tail;
    })
    .join(',');
}

/** Внутри этих правил — снова правила со селекторами. */
const GROUPING = new Set(['media', 'supports', 'container', 'layer', 'document', 'scope']);

/** CSS с привязкой всех правил к селектору scope. */
export function scopeCss(css: string, scope: string): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const space = /^(?:\s+|\/\*[\s\S]*?(?:\*\/|$))/.exec(css.slice(i));
    if (space) {
      out += space[0];
      i += space[0].length;
      continue;
    }
    if (css[i] === '@') {
      const end = findTop(css, i, '{;');
      if (end >= css.length || css[end] === ';') {
        out += css.slice(i, end + 1);
        i = end + 1;
        continue;
      }
      const close = matchBrace(css, end);
      const name = /^@([\w-]+)/.exec(css.slice(i, end))?.[1].toLowerCase() ?? '';
      const body = css.slice(end + 1, close);
      out += `${css.slice(i, end)}{${GROUPING.has(name) ? scopeCss(body, scope) : body}}`;
      i = close + 1;
      continue;
    }
    const brace = findTop(css, i, '{');
    if (brace >= css.length) {
      out += css.slice(i);
      break;
    }
    const close = matchBrace(css, brace);
    out += `${scopeSelectors(css.slice(i, brace), scope)}{${css.slice(brace + 1, close)}}`;
    i = close + 1;
  }
  return out;
}

/** Строк обёртки перед кодом секции (номера строк в ошибках — по коду в редакторе). */
export const SECTION_SCRIPT_LINES = 2;

/** Скрипт секции → код для сборки: section — элемент секции, return допустим. */
export function sectionScript(code: string, sid: string): string {
  return `const section = document.querySelector<HTMLElement>('${sectionSelector(sid)}');\nif (section) ((section: HTMLElement) => {\n${code}\n})(section);\n`;
}

/** Атрибут data-s в первый открывающий тег HTML секции. */
export function withSectionAttr(html: string, sid: string): string {
  return html.replace(/<([a-zA-Z][\w-]*)(?=[\s>/])/, (tag) => `${tag} data-s="${sid}"`);
}

/** Свои CSS и скрипт секции, готовые к выводу; нет метки или пусто — null. */
export function sectionParts(block: { css?: string; script?: string; sid?: string }): { sid: string; css: string; script: string } | null {
  const sid = block.sid && SECTION_ID.test(block.sid) ? block.sid : null;
  const css = block.css?.trim() ?? '';
  const script = block.script?.trim() ?? '';
  if (!sid || (!css && !script)) return null;
  return { sid, css: css ? scopeCss(css, sectionSelector(sid)) : '', script: script ? sectionScript(script, sid) : '' };
}
