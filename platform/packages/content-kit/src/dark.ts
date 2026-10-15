/**
 * Тёмная тема сайта без переписывания CSS вручную. В объявлениях цвета
 * «светлой поверхности» — светлые фоны, тёмный текст, светлые рамки —
 * заменяются переменными, у которых исходный цвет — значение по умолчанию:
 *
 *   background: #fff;   →  background: var(--dk-bg-ffffff, #fff);
 *   color: #18181b;     →  color: var(--dk-tx-18181b, #18181b);
 *
 * В светлой теме этих переменных нет: CSS работает как раньше, каскад и
 * специфичность не меняются. В конец CSS дописываются тёмные значения тех же
 * цветов — светлота перевёрнута, оттенок сохранён:
 *
 *   html[data-theme="dark"] { --dk-bg-ffffff: #12191d; … }
 *
 * Белый текст и тёмные фоны (подвал, герой на фото, тёмные секции) не
 * трогаются — они одинаковы в обеих темах. Островок, который должен
 * остаться светлым (логотипы партнёров на белом), возвращает свои цвета
 * переменными: `.logos { --dk-bg-ffffff: #fff }`.
 */

/** Цвета палитры из tokens.css (слой примитивов): var(--neutral-0) в фоне — такой же белый фон, как #fff. */
const TOKENS: Record<string, string> = {
  'neutral-0': '#ffffff', 'neutral-50': '#fafafa', 'neutral-100': '#f4f5f4', 'neutral-150': '#ecedec', 'neutral-200': '#e5e5e5',
  'neutral-300': '#d4d4d8', 'neutral-400': '#a1a1aa', 'neutral-500': '#71717a', 'neutral-600': '#52525b', 'neutral-700': '#3f3f46',
  'neutral-800': '#27272a', 'neutral-900': '#18181b', 'neutral-950': '#101f26', 'neutral-1000': '#000000',
  'teal-50': '#f0f5f8', 'teal-100': '#dde9ee', 'teal-200': '#bad2dc', 'teal-300': '#88b0bf', 'teal-400': '#5288a0', 'teal-500': '#2c6985',
  'teal-600': '#1f5e78', 'teal-700': '#1a4d62', 'teal-800': '#163e4f', 'teal-900': '#122f3d', 'teal-950': '#0a1c25',
  'green-50': '#f1f9ee', 'green-100': '#def0d7', 'green-200': '#bfe2b1', 'green-300': '#8fcc7b', 'green-400': '#6cbb54', 'green-500': '#4fab3a',
  'green-600': '#3c8e33', 'green-700': '#2f702a', 'green-800': '#285923', 'green-900': '#21491d', 'green-950': '#0f260d',
  'amber-500': '#d97706', 'amber-600': '#b45309', 'red-500': '#dc2626', 'red-600': '#b91c1c', 'blue-500': '#2563eb',
};

const NAMED: Record<string, string> = { white: '#ffffff', black: '#000000' };

type Role = 'bg' | 'tx' | 'ln';

/** Какие свойства во что превращаются: фон, текст (и рисунок иконок), рамки. */
function roleOf(prop: string): Role | null {
  if (prop.startsWith('--')) return null;
  if (prop === 'background' || prop === 'background-color' || prop === 'background-image') return 'bg';
  if (prop === 'color' || prop === 'fill' || prop === 'stroke' || prop === 'caret-color' || prop === '-webkit-text-fill-color' || prop.startsWith('text-decoration')) return 'tx';
  if (prop.startsWith('border') || prop.startsWith('outline') || prop === 'column-rule' || prop === 'column-rule-color') return 'ln';
  return null;
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseHex(hex: string): Rgba | null {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
}

function parseRgb(fn: string): Rgba | null {
  const parts = fn
    .slice(fn.indexOf('(') + 1, -1)
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const ch = (s: string) => (s.endsWith('%') ? (Number.parseFloat(s) * 255) / 100 : Number.parseFloat(s));
  const a = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? Number.parseFloat(parts[3]) / 100 : Number.parseFloat(parts[3]);
  const c = { r: ch(parts[0]), g: ch(parts[1]), b: ch(parts[2]), a };
  return [c.r, c.g, c.b, c.a].some((x) => Number.isNaN(x)) ? null : c;
}

// ── OKLab: светлота как её видит глаз ─────────────────────────────────────
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const gam = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};
function oklch({ r, g, b }: Rgba): { L: number; C: number; h: number } {
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}
function fromOklch(L: number, C: number, h: number): [number, number, number] {
  const A = C * Math.cos((h * Math.PI) / 180);
  const B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Нейтральные (серые, белые) — тёмным значениям даём фирменный холодный подтон. */
const NEUTRAL_C = 0.02;
const TINT_H = 225;

/**
 * Тёмное значение цвета для своей роли или null — цвет в тёмной теме не меняется:
 *  - bg: светлый фон → тёмный (белый — фон страницы);
 *  - tx: тёмный текст → светлый, цветной — светлее того же оттенка;
 *  - ln: светлая рамка → тёмная, но заметная.
 */
export function darkColor(role: Role, c: Rgba): Rgba | null {
  const { L, C, h } = oklch(c);
  const neutral = C < NEUTRAL_C;
  let next: [number, number, number];
  if (role === 'bg') {
    if (L <= 0.82 || c.a < 0.5) return null;
    next = [0.205 + (1 - L) * 0.6, neutral ? 0.012 : Math.min(C * 0.6, 0.06), neutral ? TINT_H : h];
  } else if (role === 'ln') {
    if (L <= 0.75 || c.a < 0.3) return null;
    next = [0.33 + (1 - L) * 0.45, neutral ? 0.012 : C * 0.5, neutral ? TINT_H : h];
  } else {
    if (L >= 0.62 || c.a < 0.5) return null;
    // самый тёмный текст — не чисто белый, а мягкий светлый (как основной текст темы)
    next = [Math.min(0.92, 1 - L * 0.6), neutral ? 0.01 : Math.min(C * 0.85, 0.12), neutral ? TINT_H : h];
  }
  const [r, g, b] = fromOklch(...next);
  return { r, g, b, a: c.a };
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const keyOf = (c: Rgba) => `${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${c.a < 1 ? hex2(c.a * 255) : ''}`;
const cssOf = (c: Rgba) => (c.a < 1 ? `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.round(c.a * 1000) / 1000})` : `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`);

/** Конец скобки, начатой на позиции open (с учётом строк и вложенных скобок). */
function closeParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'") {
      i = skipString(s, i);
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')' && --depth === 0) return i;
  }
  return s.length - 1;
}
function skipString(s: string, i: number): number {
  const q = s[i];
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '\\') j++;
    else if (s[j] === q) return j;
  }
  return s.length - 1;
}

/** Первая запятая var(--имя, …) на верхнем уровне скобок — начало запасного значения. */
function topComma(fn: string): number {
  let depth = 0;
  for (let i = 0; i < fn.length; i++) {
    const ch = fn[i];
    if (ch === '"' || ch === "'") i = skipString(fn, i);
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 1) return i;
  }
  return -1;
}

/** Двоеточие объявления — первое вне комментариев (в комментарии перед свойством может быть своё). */
function colonOf(chunk: string): number {
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === '/' && chunk[i + 1] === '*') {
      const end = chunk.indexOf('*/', i + 2);
      if (end < 0) return -1;
      i = end + 1;
    } else if (chunk[i] === ':') return i;
  }
  return -1;
}

/** Свои переменные стилей с цветом: где заданы (по порядку в CSS) и в каких ролях используются. */
type OwnVars = { defs: { name: string; selector: string; color: Rgba }[]; names: Set<string>; used: Map<string, Set<Role>> };

/** Значение — ровно один цвет (#hex, rgb()/rgba(), white/black), иначе null. */
function colorLiteral(value: string): Rgba | null {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return parseHex(v);
  if (/^rgba?\([^()]*\)$/i.test(v)) return parseRgb(v);
  const named = NAMED[v.toLowerCase()];
  return named ? parseHex(named) : null;
}

/**
 * Свои переменные стилей с цветом (`--ink: #1c3038`) — шаблоны страниц и статьи Практикума задают
 * ими цвета текста и подложек. Учитываются заданные в правилах верхнего уровня; переменная, которая
 * где-то задана не цветом или внутри @media, остаётся как есть — её тёмное значение не угадать.
 */
function ownColorVars(css: string): OwnVars {
  const defs: OwnVars['defs'] = [];
  const skip = new Set<string>();
  const stack: string[] = [];
  let start = 0;
  const decl = (end: number) => {
    const chunk = css.slice(start, end);
    const colon = colonOf(chunk);
    if (colon < 0 || !stack.length) return;
    const prop = chunk.slice(0, colon).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!/^--[\w-]+$/.test(prop) || /^--dkv?-/.test(prop)) return;
    const name = prop.slice(2);
    const color = colorLiteral(chunk.slice(colon + 1).replace(/\/\*[\s\S]*?\*\//g, ''));
    if (!color || stack.length !== 1 || stack[0].startsWith('@')) skip.add(name);
    else defs.push({ name, selector: stack[0], color });
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(css, i);
      continue;
    }
    if (ch === '(') {
      i = closeParen(css, i);
      continue;
    }
    if (ch === '{') {
      stack.push(css.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, '').trim());
      start = i + 1;
    } else if (ch === ';' || ch === '}') {
      decl(i);
      start = i + 1;
      if (ch === '}') stack.pop();
    }
  }
  const kept = defs.filter((d) => !skip.has(d.name));
  return { defs: kept, names: new Set(kept.map((d) => d.name)), used: new Map() };
}

/** Части селектора через запятую верхнего уровня (запятые в :is(…) и [..] не делят). */
function selectorParts(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(selector.slice(from, i));
      from = i + 1;
    }
  }
  return [...parts, selector.slice(from)].map((p) => p.trim()).filter(Boolean);
}

/** Тот же селектор в тёмной теме: :root и html — сам <html data-theme="dark">, остальное — внутри него. */
function darkScope(selector: string): string {
  const DARK = 'html[data-theme="dark"]';
  return selectorParts(selector)
    .map((p) => {
      if (/^(?::root|html)$/i.test(p)) return DARK;
      if (/^:root(?=[\s.#[:>~+])/i.test(p)) return DARK + p.slice(5);
      if (/^html(?=[\s.#[:>~+])/i.test(p)) return DARK + p.slice(4);
      return `${DARK} ${p}`;
    })
    .join(',');
}

/**
 * Тёмные значения своих переменных — по одному на роль (фон, текст, рамка): одна и та же
 * --ink бывает и цветом текста (в тёмной теме — светлым), и тёмной подложкой (остаётся).
 * Правила повторяют, где переменная задана, — поэтому и переопределения в .блоке работают.
 */
function ownVarRules(own: OwnVars): string {
  const rules: string[] = [];
  for (const d of own.defs) {
    const roles = own.used.get(d.name);
    if (!roles) continue;
    const decls = [...roles].map((role) => {
      const dark = darkColor(role, d.color);
      // «initial» — тёмного значения нет: работает сама переменная (а не значение снаружи блока)
      return `--dkv-${role}-${d.name}:${dark ? cssOf(dark) : 'initial'}`;
    });
    rules.push(`${darkScope(d.selector)}{${decls.join(';')}}`);
  }
  return rules.length ? `${rules.join('\n')}\n` : '';
}

/** Значение свойства: цвета роли role → переменные; url() и строки — как есть. */
function transformValue(value: string, role: Role, defs: Map<string, string>, own?: OwnVars): string {
  let out = '';
  for (let i = 0; i < value.length; ) {
    const ch = value[i];
    const rest = value.slice(i, i + 5).toLowerCase();
    if (ch === '"' || ch === "'") {
      const end = skipString(value, i);
      out += value.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (rest.startsWith('url(') || rest.startsWith('var(')) {
      const end = closeParen(value, i + 3);
      const whole = value.slice(i, end + 1);
      const name = /^var\(\s*--([\w-]+)/i.exec(whole)?.[1];
      const color = name && TOKENS[name] ? parseHex(TOKENS[name]) : null;
      if (color) out += replaced(whole, color, role, defs);
      else if (name && own?.names.has(name)) {
        // своя переменная с цветом: тёмное значение — для этой роли (ownVarRules)
        own.used.set(name, (own.used.get(name) ?? new Set<Role>()).add(role));
        out += `var(--dkv-${role}-${name}, ${whole})`;
      } else if (name && !/^dkv?-/.test(name) && whole.includes(',')) {
        // var(--нет-такой, #f6f8f9): работает запасной цвет — его и переделываем
        const comma = topComma(whole);
        out += comma > 0 ? whole.slice(0, comma + 1) + transformValue(whole.slice(comma + 1, -1), role, defs, own) + ')' : whole;
      } else out += whole;
      i = end + 1;
      continue;
    }
    if (ch === '#') {
      const m = /^#[0-9a-f]{3,8}(?![\w-])/i.exec(value.slice(i));
      const color = m ? parseHex(m[0]) : null;
      if (m && color) {
        out += replaced(m[0], color, role, defs);
        i += m[0].length;
        continue;
      }
    }
    if (rest.startsWith('rgb')) {
      const open = value.indexOf('(', i);
      if (open > 0 && /^rgba?$/i.test(value.slice(i, open))) {
        const end = closeParen(value, open);
        const whole = value.slice(i, end + 1);
        const color = parseRgb(whole);
        out += color ? replaced(whole, color, role, defs) : whole;
        i = end + 1;
        continue;
      }
    }
    if (/[a-z]/i.test(ch) && (i === 0 || !/[\w-]/.test(value[i - 1]))) {
      const word = /^[a-z][\w-]*/i.exec(value.slice(i))![0];
      const named = NAMED[word.toLowerCase()];
      out += named ? replaced(word, parseHex(named)!, role, defs) : word;
      i += word.length;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function replaced(original: string, color: Rgba, role: Role, defs: Map<string, string>): string {
  const dark = darkColor(role, color);
  if (!dark) return original;
  const name = `--dk-${role}-${keyOf(color)}`;
  defs.set(name, cssOf(dark));
  return `var(${name}, ${original})`;
}

/**
 * CSS → тот же CSS с переменными тёмной темы (см. описание файла) и их
 * значениями в конце. Повторный вызов ничего не меняет: var(--dk-…) не трогается.
 *
 * ownVars — и свои переменные стилей с цветом (`--ink: #1c3038` … `color: var(--ink)`): так
 * написаны шаблоны страниц и статьи Практикума. Общим стилям сайта не нужно — его токены
 * в тёмной теме задаёт theme-dark.css.
 */
export function darkVars(css: string, opts: { ownVars?: boolean } = {}): string {
  const defs = new Map<string, string>();
  const own = opts.ownVars ? ownColorVars(css) : undefined;
  let out = '';
  let start = 0;
  let depth = 0;
  // объявление — от «{» или «;» до «;» или «}» вне скобок, строк и комментариев
  const flush = (end: number) => {
    const chunk = css.slice(start, end);
    const colon = colonOf(chunk);
    const prop = colon > 0 ? chunk.slice(0, colon).replace(/\/\*[\s\S]*?\*\//g, '').trim().toLowerCase() : '';
    const role = depth > 0 && /^-?-?[a-z][\w-]*$/.test(prop) ? roleOf(prop) : null;
    out += role ? chunk.slice(0, colon + 1) + transformValue(chunk.slice(colon + 1), role, defs, own) : chunk;
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(css, i);
      continue;
    }
    if (ch === '(') {
      i = closeParen(css, i);
      continue;
    }
    if (ch === '{') {
      // перед «{» — селектор или @-правило, не объявление
      out += css.slice(start, i + 1);
      start = i + 1;
      depth++;
    } else if (ch === ';' || ch === '}') {
      flush(i);
      out += ch;
      start = i + 1;
      if (ch === '}') depth = Math.max(0, depth - 1);
    }
  }
  flush(css.length);
  const ownRules = own ? ownVarRules(own) : '';
  if (!defs.size && !ownRules) return out;
  const vars = [...defs].map(([k, v]) => `${k}:${v}`).join(';');
  return `${out}\n${defs.size ? `html[data-theme="dark"]{${vars}}\n` : ''}${ownRules}`;
}
