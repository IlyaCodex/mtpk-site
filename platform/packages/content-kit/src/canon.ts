/**
 * Каноническая форма HTML для сверок «старая вёрстка ↔ React-компоненты».
 *
 * Приводит к одному виду то, что не влияет на страницу: порядок атрибутов,
 * пробелы между тегами, запись style, сущности. Опционально убирает то, что
 * в старом сайте дорисовывали скрипты ПОСЛЕ загрузки, а теперь рендерит
 * сервер (бейджи «В наличии» / «Сделано в России», кнопки сравнения, карусель
 * галереи, подсветка оглавления), и JS-хуки, которые больше не нужны.
 */
import { parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { COVER_IMG_CLASS, coverSource, normalizeDecls } from './inline-styles.ts';

type Node = DefaultTreeAdapterMap['node'];
type El = DefaultTreeAdapterMap['element'];
const isEl = (n: Node): n is El => 'tagName' in n;
const getAttr = (el: El, name: string) => el.attrs.find((a) => a.name === name)?.value;
const classes = (el: El) => (getAttr(el, 'class') ?? '').split(/\s+/).filter(Boolean);

export interface CanonOptions {
  /** убрать серверные «усиления», которых не было в исходном SSR старого сайта */
  stripEnhancements?: boolean;
}

/**
 * Элементы, у которых пробелы в начале и в конце содержимого не отображаются
 * (блочный контекст: CSS white-space: normal схлопывает их).
 */
const BLOCKISH = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'button', 'caption', 'dd', 'details', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'li', 'main',
  'nav', 'ol', 'p', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'select', 'option',
]);

function trimEdges(el: El) {
  if (!BLOCKISH.has(el.tagName)) return;
  const nodes = el.childNodes as Node[];
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (first && first.nodeName === '#text') {
    const t = first as DefaultTreeAdapterMap['textNode'];
    t.value = t.value.replace(/^\s+/, '');
  }
  if (last && last.nodeName === '#text') {
    const t = last as DefaultTreeAdapterMap['textNode'];
    t.value = t.value.replace(/\s+$/, '');
  }
}

/** Классы-хуки скриптов, не влияющие на оформление. */
const HOOK_CLASSES = new Set(['js-lead-form']);
/** Атрибуты-хуки скриптов. */
const HOOK_ATTRS = new Set(['onsubmit', 'onclick', 'data-filter-form', 'data-cf-form']);
/** Подсказки браузеру, как грузить картинку. */
const LOADING_HINTS = new Set(['loading', 'fetchpriority', 'decoding', 'srcset', 'sizes']);

/**
 * Классы, заменившие атрибуты style="" прежней вёрстки: стили теперь в
 * CSS-файлах (apps/web/src/styles/components.css и стили страниц — классы
 * s-<хеш>). Разметку сверяем без style="", этих классов и hidden (так стала
 * скрываться строка статуса формы); совпадение вида проверяют скриншоты.
 */
const STYLE_CLASSES = new Set(['adv__accent', 'best-offer__title', 'best-offer__lead', 'best-offer__submit', 'ui-pixel']);
const isStyleClass = (c: string) => STYLE_CLASSES.has(c) || /^phero__thumbs--cols-\d+$/.test(c) || /^s-[0-9a-f]{8}$/.test(c);

function styleAttrsToCanon(n: El, cls: string[]): void {
  if (cls.some(isStyleClass)) {
    n.attrs = n.attrs.map((a) => (a.name === 'class' ? { ...a, value: a.value.split(/\s+/).filter((c) => !isStyleClass(c)).join(' ') } : a));
  }
  n.attrs = n.attrs.filter((a) => a.name !== 'style' && a.name !== 'hidden');
}

/**
 * Обложка: фон style="background-image:url(X)" прежней вёрстки и картинка
 * <img class="cover-img" src="X"> новой сверяются как атрибут data-cover="X".
 */
function canonCover(n: El): void {
  const img = (n.childNodes as Node[]).find((c): c is El => isEl(c) && classes(c).includes(COVER_IMG_CLASS));
  const src = img ? getAttr(img, 'src') : coverSource(n, normalizeDecls(getAttr(n, 'style') ?? ''));
  if (img) n.childNodes = n.childNodes.filter((c) => c !== img);
  if (src) n.attrs.push({ name: 'data-cover', value: src });
}

function normalize(nodes: Node[], opts: CanonOptions): Node[] {
  const out: Node[] = [];
  for (const n of nodes) {
    if (n.nodeName === '#comment') continue;
    if (!isEl(n)) {
      out.push(n);
      continue;
    }
    const cls = classes(n);
    if (opts.stripEnhancements) {
      // элементы, которые раньше добавлял JS после загрузки
      if (cls.includes('made-badge') || cls.includes('pcard__stock-badge') || cls.includes('cmp-btn')) continue;
      if (cls.includes('phero__nav') || cls.includes('phero__counter')) continue;
      if (cls.includes('catalog-filter__count')) continue;
      // автофильтр каталога раньше строил скрипт после загрузки, теперь — сервер
      if (n.tagName === 'form' && getAttr(n, 'data-cf-auto') !== undefined) continue;
      // число кадров лайтбокса: старый скрипт пересчитывал его при загрузке, теперь считает сервер
      if (n.tagName === 'span' && getAttr(n, 'id') === 'lb-total') n.childNodes = [];
      // inline-скрипты, чьё поведение перенесено в React-компоненты
      if (n.tagName === 'script' && !getAttr(n, 'src') && !getAttr(n, 'type')) continue;
      // React 19 сам добавляет preload для картинок первого экрана
      if (n.tagName === 'link' && getAttr(n, 'rel') === 'preload') continue;
      // обёртки галереи и бейджа склада — раскрываем
      if (n.tagName === 'div' && (cls.includes('phero__stage') || cls.includes('audit-stock-cover'))) {
        out.push(...normalize(n.childNodes as Node[], opts));
        continue;
      }
      // стили страницы: были <style> в коде, стали подключаемыми файлами
      if (n.tagName === 'style' || (n.tagName === 'link' && getAttr(n, 'rel') === 'stylesheet')) continue;
      canonCover(n);
      styleAttrsToCanon(n, cls);
    }
    n.attrs = n.attrs
      .filter((a) => !HOOK_ATTRS.has(a.name))
      .filter((a) => !(a.name === 'src' && a.value === ''))
      .filter((a) => !(opts.stripEnhancements && a.name === 'data-stock'))
      // подсказки загрузки картинок (lazy, приоритет, адаптивные размеры) на вид не влияют
      .filter((a) => !(opts.stripEnhancements && n.tagName === 'img' && LOADING_HINTS.has(a.name)))
      .map((a) => {
        if (a.name === 'class') {
          let list = a.value.split(/\s+/).filter((c) => c && !HOOK_CLASSES.has(c));
          if (opts.stripEnhancements) {
            list = list.filter((c) => c !== 'is-carousel');
            if (list.includes('spec__nav-link')) list = list.filter((c) => c !== 'is-active');
          }
          return { ...a, value: list.join(' ') };
        }
        if (a.name === 'style') {
          return {
            ...a,
            value: a.value
              .split(';')
              .map((d) => d.trim())
              .filter(Boolean)
              .map((d) => d.replace(/\s*:\s*/, ':'))
              .join(';'),
          };
        }
        return a;
      })
      .filter((a) => !(a.name === 'class' && a.value === ''))
      .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
    n.childNodes = normalize(n.childNodes as Node[], opts) as typeof n.childNodes;
    trimEdges(n);
    if (n.tagName === 'template') {
      const content = (n as unknown as { content: { childNodes: Node[] } }).content;
      content.childNodes = normalize(content.childNodes, opts);
    }
    out.push(n);
  }
  return out;
}

/** HTML → каноническая строка. */
export function canonHtml(html: string, opts: CanonOptions = {}): string {
  const frag = parseFragment(html);
  frag.childNodes = normalize(frag.childNodes as Node[], opts) as typeof frag.childNodes;
  return serialize(frag)
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
}

/** Первое расхождение двух строк — для отчёта. */
export function firstDifference(a: string, b: string, context = 80): { at: number; a: string; b: string } | null {
  if (a === b) return null;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - context);
  return { at: i, a: a.slice(from, i + context * 2), b: b.slice(from, i + context * 2) };
}
