/**
 * SVG-иконки в содержимом страниц: иконка из библиотеки, свой код (например,
 * со svgrepo.com), цвет. Цвет — style="color:…" у <svg>: иконки нарисованы
 * через currentColor и берут его. В HTML-секциях этот style при сохранении
 * остаётся на месте (content-kit/inline-styles), поэтому его можно снова
 * прочитать и поменять.
 */

/** Иконка из набора (содержимое <svg>, поле 24×24) → целый <svg>. */
export const svgFromBody = (body: string) => `<svg viewBox="0 0 24 24" fill="none">${body}</svg>`;

/** Значения fill/stroke, которые не цвет. */
const NO_COLOR = /^(none|currentcolor|transparent|inherit)$|^url\(/i;
const PAINT = ['fill', 'stroke', 'stop-color'] as const;

/** Разобрать SVG строкой; не SVG — null. */
function parseSvg(code: string): SVGSVGElement | null {
  if (!code.includes('<svg')) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = code.trim();
  const svg = tpl.content.querySelector('svg');
  return svg instanceof SVGSVGElement ? svg : null;
}

/** Объявления style="" как пары; prop — в нижнем регистре. */
function decls(style: string | null): [prop: string, value: string][] {
  return (style ?? '')
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d.includes(':'))
    .map((d) => [d.slice(0, d.indexOf(':')).trim().toLowerCase(), d.slice(d.indexOf(':') + 1).trim()]);
}
const joinDecls = (list: [string, string][]) => list.map(([p, v]) => `${p}:${v}`).join(';');

/** Цвет CSS → #rrggbb (так его понимает поле выбора цвета); не цвет — null. */
export function toHex(color: string): string | null {
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${[...c.slice(1)].map((x) => x + x).join('')}`.toLowerCase();
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#010203';
  ctx.fillStyle = c;
  const out = String(ctx.fillStyle);
  return out === '#010203' && c.toLowerCase() !== '#010203' ? null : /^#[0-9a-f]{6}$/i.test(out) ? out : null;
}

/** Цвета, которыми иконка нарисована явно (не currentColor). */
function paintColors(svg: SVGSVGElement): Set<string> {
  const colors = new Set<string>();
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const prop of PAINT) {
      const a = el.getAttribute(prop)?.trim();
      if (a && !NO_COLOR.test(a)) colors.add(toHex(a) ?? a.toLowerCase());
    }
    for (const [prop, v] of decls(el.getAttribute('style'))) {
      if ((PAINT as readonly string[]).includes(prop) && !NO_COLOR.test(v)) colors.add(toHex(v) ?? v.toLowerCase());
    }
  }
  return colors;
}

/** Иконка одного цвета → нарисована currentColor (её можно перекрашивать). Многоцветную не трогаем. */
function paintable(svg: SVGSVGElement): void {
  const colors = paintColors(svg);
  if (colors.size > 1) return;
  if (colors.size === 0) {
    // без fill браузер красит фигуры чёрным — пусть красит цветом иконки
    if (!svg.hasAttribute('fill')) svg.setAttribute('fill', 'currentColor');
    return;
  }
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const prop of PAINT) {
      const a = el.getAttribute(prop)?.trim();
      if (a && !NO_COLOR.test(a)) el.setAttribute(prop, 'currentColor');
    }
  }
}

/** Иконка многоцветная — цвет из редактора меняет не всё. */
export function isMulticolor(code: string): boolean {
  const svg = parseSvg(code);
  return Boolean(svg && paintColors(svg).size > 1);
}

/** Без скриптов, обработчиков и ссылок javascript: — для показа в админке и для записи на страницу. */
function sanitize(svg: SVGSVGElement): void {
  svg.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((n) => n.remove());
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || /^\s*(javascript|data):/i.test(a.value) || ((a.name === 'href' || a.name === 'xlink:href') && !a.value.startsWith('#'))) {
        el.removeAttribute(a.name);
      }
    }
  }
}

/** Безопасная копия для показа в админке (размеры и классы — как есть). */
export function safeSvg(code: string): string {
  const svg = parseSvg(code);
  if (!svg) return '';
  sanitize(svg);
  return svg.outerHTML;
}

/**
 * Свой SVG (со svgrepo.com, из редактора) → иконка для страницы: безопасная,
 * без служебных тегов, пустых групп, лишних id, размеров и классов (размер
 * задаёт место на странице); оформление фигур — атрибутами, а не style
 * (иначе при сохранении появятся классы); одного цвета — нарисована
 * currentColor, чтобы её можно было перекрашивать. Не SVG — null.
 */
export function normalizeSvg(code: string): string | null {
  const svg = parseSvg(code.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, ''));
  if (!svg) return null;
  sanitize(svg);
  svg.querySelectorAll('metadata, title, desc, sodipodi\\:namedview').forEach((n) => n.remove());
  const walker = document.createTreeWalker(svg, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.parentNode?.removeChild(c));
  const all = () => [svg, ...svg.querySelectorAll('*')];
  // id нужны, только если на них ссылаются (градиенты, маски)
  const used = new Set([...svg.outerHTML.matchAll(/url\(\s*['"]?#([^'")\s]+)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]));
  for (const el of all()) {
    if (el.id && !used.has(el.id)) el.removeAttribute('id');
    for (const a of [...el.attributes]) if (/^(sodipodi|inkscape|data-name)/i.test(a.name)) el.removeAttribute(a.name);
    // style фигур → атрибуты
    if (el !== svg && el.hasAttribute('style')) {
      for (const [prop, v] of decls(el.getAttribute('style'))) if (/^[a-z-]+$/.test(prop)) el.setAttribute(prop, v);
      el.removeAttribute('style');
    }
  }
  // пустые группы (у svgrepo — служебные обёртки)
  for (const g of [...svg.querySelectorAll('g')].reverse()) if (!g.children.length) g.remove();
  if (!svg.getAttribute('viewBox')) {
    const w = Number.parseFloat(svg.getAttribute('width') ?? '');
    const h = Number.parseFloat(svg.getAttribute('height') ?? '');
    if (w > 0 && h > 0) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  for (const name of ['width', 'height', 'class', 'style', 'id', 'version', 'xmlns', 'xmlns:xlink', 'xml:space', 'x', 'y', 'enable-background']) svg.removeAttribute(name);
  paintable(svg);
  return svg.outerHTML;
}

/** Цвет иконки (style="color:…" у <svg>) как #rrggbb; нет — null (цвет из оформления сайта). */
export function svgColor(code: string): string | null {
  const svg = parseSvg(code);
  const v = svg ? decls(svg.getAttribute('style')).find(([p]) => p === 'color')?.[1] : undefined;
  return v ? (toHex(v) ?? v) : null;
}

/** Иконка с цветом color (null — как в оформлении сайта). Остальной style и разметка не меняются. */
export function withSvgColor(code: string, color: string | null): string {
  const svg = parseSvg(code);
  if (!svg) return code;
  if (color) paintable(svg);
  const rest = decls(svg.getAttribute('style')).filter(([p]) => p !== 'color');
  const next = color ? [...rest, ['color', color] as [string, string]] : rest;
  if (next.length) svg.setAttribute('style', joinDecls(next));
  else svg.removeAttribute('style');
  // на странице иконка стоит строкой: заменяем только её сам тег <svg …>
  return svg.outerHTML;
}

/** Атрибуты прежней иконки, от которых зависит вид на странице, — новой (класс, размер, доступность). */
const CARRY = ['class', 'width', 'height', 'aria-hidden', 'aria-label', 'role', 'focusable'];

/** Заменить иконку: новая — с атрибутами прежней (размер, класс) и цветом color. */
export function replaceSvg(previous: string, next: string, color: string | null): string {
  const was = parseSvg(previous);
  const svg = parseSvg(next);
  if (!svg) return previous;
  if (was) {
    for (const name of CARRY) {
      const v = was.getAttribute(name);
      if (v !== null) svg.setAttribute(name, v);
    }
  }
  if (!svg.hasAttribute('aria-hidden') && !svg.hasAttribute('aria-label')) svg.setAttribute('aria-hidden', 'true');
  return withSvgColor(svg.outerHTML, color);
}

/** Одна и та же иконка (для поиска её в данных): содержимое без пробелов между тегами. */
export const sameIcon = (a: string, b: string) => {
  const inner = (code: string) => (parseSvg(code)?.innerHTML ?? '').replace(/>\s+</g, '><').trim();
  return inner(a) === inner(b);
};

/** Цвета для быстрого выбора — из дизайн-системы (tokens.css, style.md). */
export const ICON_COLORS: [color: string, label: string][] = [
  ['#1f5e78', 'Бирюзовый — фирменный (teal-600)'],
  ['#2c6985', 'Бирюзовый светлее (teal-500)'],
  ['#88b0bf', 'Бирюзовый бледный (teal-300)'],
  ['#4fab3a', 'Зелёный — акцент (green-500)'],
  ['#6cbb54', 'Зелёный светлый (green-400)'],
  ['#101f26', 'Глубокий тёмный (neutral-950)'],
  ['#18181b', 'Почти чёрный (neutral-900)'],
  ['#52525b', 'Серый (neutral-600)'],
  ['#a1a1aa', 'Светло-серый (neutral-400)'],
  ['#ffffff', 'Белый'],
  ['#d97706', 'Янтарный (amber-500)'],
  ['#b91c1c', 'Красный (red-600)'],
];
