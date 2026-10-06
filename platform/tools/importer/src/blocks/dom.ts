/**
 * Помощники разбора HTML (parse5) для парсеров блоков. Парсер строгий: всё,
 * что не совпало с ожидаемой структурой, бросает Mismatch — секция остаётся
 * блоком «HTML как есть», контент не теряется.
 */
import { serialize, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';
import type { Action, Crumb } from '@mtpk/content-model';

export type Node = DefaultTreeAdapterMap['node'];
export type El = DefaultTreeAdapterMap['element'];

export class Mismatch extends Error {}
export function fail(msg: string): never {
  throw new Mismatch(msg);
}

export const isEl = (n: Node): n is El => 'tagName' in n;
export const textOf = (n: Node) => (n as DefaultTreeAdapterMap['textNode']).value ?? '';

export function attr(el: El, name: string): string | undefined {
  return el.attrs.find((a) => a.name === name)?.value;
}

export function classList(el: El): string[] {
  return (attr(el, 'class') ?? '').split(/\s+/).filter(Boolean);
}

/** Дочерние элементы; значимый текст между ними — несовпадение структуры. */
export function kids(el: El): El[] {
  const out: El[] = [];
  for (const n of el.childNodes as Node[]) {
    if (isEl(n)) out.push(n);
    else if (n.nodeName === '#text' && textOf(n).trim()) fail(`текст внутри <${el.tagName}.${classList(el).join('.')}>`);
  }
  return out;
}

/** Элемент заданного тега и ровно с этим набором классов (порядок не важен). */
export function expect(el: El | undefined, tag: string, className?: string): El {
  if (!el) return fail(`нет <${tag}${className ? `.${className}` : ''}>`);
  if (el.tagName !== tag) fail(`ожидался <${tag}>, а не <${el.tagName}>`);
  if (className !== undefined) {
    const want = className.split(/\s+/).filter(Boolean).sort().join(' ');
    const got = classList(el).sort().join(' ');
    if (want !== got) fail(`<${tag}> класс «${got}» вместо «${want}»`);
  }
  return el;
}

export function hasClass(el: El | undefined, c: string): boolean {
  return !!el && classList(el).includes(c);
}

/** Разрешены только эти атрибуты (помимо class). */
export function onlyAttrs(el: El, allowed: string[]) {
  for (const a of el.attrs) {
    if (a.name === 'class') continue;
    if (!allowed.includes(a.name)) fail(`лишний атрибут ${a.name} у <${el.tagName}>`);
  }
}

/** Атрибуты, кроме перечисленных, — словарём (undefined, если пусто). */
export function restAttrs(el: El, ...exclude: string[]): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const a of el.attrs) if (a.name !== 'class' && !exclude.includes(a.name)) out[a.name] = a.value;
  return Object.keys(out).length ? out : undefined;
}

const INLINE_TAGS = new Set(['a', 'span', 'em', 'strong', 'b', 'i', 'small', 'sup', 'sub', 'mark', 'abbr', 'code', 'label', 'time', 'u', 's']);

/**
 * Внутренний HTML (поле с простой разметкой). Переводы строк и отступы
 * исходника схлопываются в пробел (на странице они так и выглядят), у блочных
 * элементов пробелы по краям убираются — в браузере они не отображаются.
 */
export function inner(el: El): string {
  const html = serialize(el).replace(/\s+/g, ' ');
  return INLINE_TAGS.has(el.tagName) ? html : html.trim();
}

export function outer(el: El): string {
  return serializeOuter(el);
}

const ARROW_RE = /\s*<span class="btn__arrow">→<\/span>\s*$/;

/** Ссылка-кнопка: подпись, стрелка «→», классы, прочие атрибуты. */
export function parseAction(a: El): Action {
  expect(a, 'a');
  const href = attr(a, 'href');
  if (href === undefined) fail('ссылка без href');
  const html = inner(a);
  const arrow = ARROW_RE.test(html);
  return {
    href,
    label: arrow ? html.replace(ARROW_RE, '').trim() : html,
    className: attr(a, 'class') ?? '',
    arrow,
    attrs: restAttrs(a, 'href'),
  };
}

/** Хлебные крошки: ссылки через span.breadcrumb__sep, последняя — span.breadcrumb__current. */
export function parseBreadcrumbs(nav: El, className: string): Crumb[] {
  expect(nav, 'nav', className);
  onlyAttrs(nav, ['aria-label']);
  if (attr(nav, 'aria-label') !== 'Хлебные крошки') fail('крошки: aria-label');
  const items: Crumb[] = [];
  const children = kids(nav);
  children.forEach((c, i) => {
    const last = i === children.length - 1;
    if (i % 2 === 1) {
      expect(c, 'span', 'breadcrumb__sep');
      if (inner(c) !== '/' || c.attrs.length !== 1) fail('крошки: разделитель');
      return;
    }
    if (last) {
      expect(c, 'span', 'breadcrumb__current');
      if (c.attrs.length !== 1) fail('крошки: атрибуты текущей');
      items.push({ label: inner(c) });
    } else {
      expect(c, 'a');
      onlyAttrs(c, ['href']);
      if (c.attrs.find((x) => x.name === 'class')) fail('крошки: класс у ссылки');
      items.push({ label: inner(c), href: attr(c, 'href')! });
    }
  });
  if (!items.length) fail('крошки пустые');
  return items;
}
