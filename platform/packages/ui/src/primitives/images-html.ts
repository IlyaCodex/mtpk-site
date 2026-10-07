import { parseFragment, serialize, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';
import { PLACES, responsive } from './images.ts';

type Node = DefaultTreeAdapterMap['node'];
type El = DefaultTreeAdapterMap['element'];
const isEl = (n: Node): n is El => 'tagName' in n;
const getAttr = (el: El, name: string) => el.attrs.find((a) => a.name === name)?.value;
const placeOf = (el: El, outer: string) => (getAttr(el, 'class') ?? '').split(/\s+/).find((c) => Object.hasOwn(PLACES, c)) ?? outer;

/** Обход картинок фрагмента: картинка и её место (класс её или обёртки из PLACES). */
function eachImage(nodes: Node[], visit: (img: El, place: string) => void, outer = ''): void {
  for (const n of nodes) {
    if (!isEl(n)) continue;
    const place = placeOf(n, outer);
    if (n.tagName === 'img') visit(n, place);
    eachImage(n.childNodes as Node[], visit, place);
    if (n.tagName === 'template') eachImage((n as unknown as { content: { childNodes: Node[] } }).content.childNodes, visit, place);
  }
}

/**
 * Картинки в блоках «HTML как есть»: в известных местах (PLACES) — srcset с
 * копиями нужной ширины (AVIF/WebP из медиасервиса) и sizes. Картинки без
 * указанного loading грузятся лениво — кроме первых на странице (eager):
 * они могут оказаться на первом экране.
 */
export function enhanceImages(html: string, eager: readonly string[] = []): string {
  if (!html.includes('<img')) return html;
  const frag = parseFragment(html);
  let changed = false;
  eachImage(frag.childNodes as Node[], (img, place) => {
    const src = getAttr(img, 'src');
    const hints = getAttr(img, 'srcset') === undefined ? responsive(src, place) : null;
    if (hints) {
      img.attrs.push({ name: 'srcset', value: hints.srcSet }, { name: 'sizes', value: hints.sizes });
      changed = true;
    }
    if (getAttr(img, 'loading') === undefined && getAttr(img, 'fetchpriority') === undefined && !(src && eager.includes(src))) {
      img.attrs.push({ name: 'loading', value: 'lazy' });
      if (getAttr(img, 'decoding') === undefined) img.attrs.push({ name: 'decoding', value: 'async' });
      changed = true;
    }
  });
  return changed ? serialize(frag) : html;
}

/** Место картинки src во фрагменте (для предзагрузки с тем же srcset); null — такой картинки нет. */
export function findImagePlace(html: string, src: string): string | null {
  if (!html.includes(src.split('?')[0])) return null;
  let found: string | null = null;
  eachImage(parseFragment(html).childNodes as Node[], (img, place) => {
    if (found === null && getAttr(img, 'src') === src && getAttr(img, 'srcset') === undefined) found = place;
  });
  return found;
}

/** Элементы верхнего уровня фрагмента — каждый отдельной строкой (пробелы между ними не нужны). */
export function topElements(html: string): string[] {
  return (parseFragment(html).childNodes as Node[]).filter(isEl).map((n) => serializeOuter(n));
}

/** Адреса картинок фрагмента по порядку. */
export function imageSources(html: string): string[] {
  if (!html.includes('<img')) return [];
  const out: string[] = [];
  eachImage(parseFragment(html).childNodes as Node[], (img) => {
    const src = getAttr(img, 'src');
    if (src) out.push(src);
  });
  return out;
}
