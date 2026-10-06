import crypto from 'node:crypto';
import { parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type El = DefaultTreeAdapterMap['element'];
const isEl = (n: Node): n is El => 'tagName' in n;
const getAttr = (el: El, name: string) => el.attrs.find((a) => a.name === name)?.value;

/** Объявления style="" в каноническом виде: «a:b;c:d» без лишних пробелов. */
export function normalizeDecls(style: string): string {
  return style
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.replace(/\s*:\s*/, ':'))
    .join(';');
}

/** Класс для набора объявлений: s-<8 символов хеша>. */
export function styleClassName(decls: string): string {
  return `s-${crypto.createHash('md5').update(decls).digest('hex').slice(0, 8)}`;
}

/** CSS-правило класса. Двойной класс — чтобы, как и style="", перебивать обычные правила. */
export const styleClassRule = (cls: string, decls: string) => `.${cls}.${cls}{${decls}}`;

/**
 * Обложки, заданные фоном (пустой блок со style="background-image:url(…)"):
 * карточки разделов, разделители, баннер. Фон браузер грузит сразу для всех
 * 130 карточек каталога и только оригиналом; картинку <img class="cover-img">
 * — лениво (при прокрутке к ней) и нужной ширины (srcset добавляется при
 * выводе страницы). Вид тот же: .cover-img растянута по блоку с object-fit:
 * cover (components.css). Фоны первого экрана (hero) остаются фонами.
 */
const COVER_CLASSES = new Set(['scard__cover', 'section-divider__img', 'modern__banner']);
const COVER_STYLE = /^background-image:url\((['"]?)([^'")]+)\1\)$/;
const LOCAL_RASTER = /^\/img\/[^?#]+\.(png|jpe?g|webp)(\?[^#]*)?$/i;

export const COVER_IMG_CLASS = 'cover-img';

export function coverSource(el: El, decls: string): string | null {
  if (!(getAttr(el, 'class') ?? '').split(/\s+/).some((c) => COVER_CLASSES.has(c))) return null;
  if (el.childNodes.some((c) => isEl(c as Node) || ((c as { value?: string }).value ?? '').trim())) return null;
  const m = COVER_STYLE.exec(decls);
  const src = m?.[2].replace(/^\.{1,2}\/img\//, '/img/');
  return src && LOCAL_RASTER.test(src) ? src : null;
}

function coverImage(parent: El, src: string): El {
  return {
    nodeName: 'img',
    tagName: 'img',
    attrs: [
      { name: 'class', value: COVER_IMG_CLASS },
      { name: 'src', value: src },
      { name: 'alt', value: '' },
      { name: 'loading', value: 'lazy' },
      { name: 'decoding', value: 'async' },
    ],
    namespaceURI: parent.namespaceURI,
    childNodes: [],
    parentNode: parent,
    sourceCodeLocation: undefined,
  } as El;
}

/**
 * Атрибуты style="" в HTML → классы + CSS: в исходном коде страниц не
 * остаётся встроенных стилей. Особые случаи: скрытая строка статуса формы
 * получает атрибут hidden (её показывает модуль форм), служебные метки
 * старого поиска (data-pagefind-meta) удаляются, фон-обложка становится
 * картинкой (см. COVER_CLASSES).
 * Возвращает новый HTML и CSS-правила для созданных классов.
 */
export function extractInlineStyles(html: string): { html: string; rules: Map<string, string> } {
  const rules = new Map<string, string>();
  if (!html.includes('style=') && !html.includes('data-pagefind-meta')) return { html, rules };
  const frag = parseFragment(html);
  const walk = (nodes: Node[]): Node[] =>
    nodes.filter((n) => {
      if (!isEl(n)) return true;
      if (n.tagName === 'span' && getAttr(n, 'data-pagefind-meta') !== undefined) return false;
      const style = getAttr(n, 'style');
      if (style !== undefined) {
        const decls = normalizeDecls(style);
        n.attrs = n.attrs.filter((a) => a.name !== 'style');
        const classes = (getAttr(n, 'class') ?? '').split(/\s+/).filter(Boolean);
        const cover = coverSource(n, decls);
        if (decls === 'display:none' && classes.includes('js-form-status')) {
          n.attrs.push({ name: 'hidden', value: '' });
        } else if (cover) {
          n.childNodes = [coverImage(n, cover)];
        } else if (decls) {
          const cls = styleClassName(decls);
          rules.set(cls, decls);
          if (classes.length) n.attrs = n.attrs.map((a) => (a.name === 'class' ? { ...a, value: `${a.value} ${cls}` } : a));
          else n.attrs.push({ name: 'class', value: cls });
        }
      }
      n.childNodes = walk(n.childNodes as Node[]) as typeof n.childNodes;
      if (n.tagName === 'template') {
        const content = (n as unknown as { content: { childNodes: Node[] } }).content;
        content.childNodes = walk(content.childNodes);
      }
      return true;
    });
  frag.childNodes = walk(frag.childNodes as Node[]) as typeof frag.childNodes;
  return { html: serialize(frag), rules };
}

/**
 * То же для всех HTML-блоков страницы (в том числе вложенных в контейнеры).
 * Блоки возвращаются новыми объектами, исходные не меняются.
 */
export function extractBlocksInlineStyles<T>(blocks: T[]): { blocks: T[]; rules: Map<string, string> } {
  const rules = new Map<string, string>();
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = visit(v);
    if (obj.type === 'html' && typeof obj.html === 'string') {
      const res = extractInlineStyles(obj.html);
      out.html = res.html;
      for (const [c, d] of res.rules) rules.set(c, d);
    }
    return out;
  };
  return { blocks: blocks.map((b) => visit(b) as T), rules };
}

/** CSS-файл из правил классов (в порядке появления). */
export function rulesToCss(rules: Map<string, string>): string {
  return [...rules].map(([cls, decls]) => styleClassRule(cls, decls)).join('\n');
}
