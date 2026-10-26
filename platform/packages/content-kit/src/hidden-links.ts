/**
 * Ссылки на разделы каталога, скрытые тумблером «На сайте / Скрыта», — из страниц, которые отдаются сайту.
 * Исходник в базе и предпросмотр в админке не меняются: включили раздел — всё вернулось.
 *
 * В HTML (HTML-блоки, разделы статей, документы Практикума):
 *  - карточка (элемент с классом на …card: scard, teaser-card, pcard), чья ссылка ведёт в скрытый раздел, — убирается;
 *  - раздел каталога /products/ (section.cat-index), у которого скрыт «Раздел целиком» или все карточки, — убирается
 *    вместе с пунктом выпадающего списка «Категория» (option со значением его data-cat);
 *  - пункт списка из одной ссылки («Связанные разделы»), кнопка (.btn) и ссылка-блок (с картинкой, заголовком) —
 *    убираются; ссылка в тексте остаётся текстом — без перехода на 404.
 * В полях блоков: элемент списка с href скрытого раздела (дополнительная карточка, кнопка, ссылка под группой) — убирается.
 * Правки — вырезанием кусков исходника по позициям разбора: остальная разметка остаётся байт в байт.
 */
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import type { Block } from '@mtpk/content-model';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
type TextNode = DefaultTreeAdapterMap['textNode'];

/** Скрыт ли адрес ссылки. */
export type HiddenTest = (href: string) => boolean;

/** Проверка по адресам скрытых записей каталога: скрыт сам адрес и всё под ним (подборки и статьи раздела). */
export function hiddenTest(paths: Iterable<string>): HiddenTest | null {
  const prefixes = [...paths];
  if (!prefixes.length) return null;
  return (href) => {
    const m = /^(?:https?:\/\/[^/]+)?(\/[^?#]*)/.exec(href.trim());
    if (!m) return false;
    const path = m[1].endsWith('/') ? m[1] : `${m[1]}/`;
    return prefixes.some((p) => path.startsWith(p));
  };
}

/** Куда не заходим: код, стили, векторная графика. */
const SKIP = new Set(['script', 'style', 'template', 'svg', 'math', 'noscript', 'textarea']);
/** Ссылка с таким содержимым — блок (обложка, заголовок), а не слово в тексте: убирается целиком. */
const BLOCKY = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'picture', 'figure', 'section', 'article', 'ul', 'ol', 'table']);
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

const isElement = (n: Node): n is Element => 'tagName' in n;
const kids = (n: Node): Node[] => ('childNodes' in n ? n.childNodes : []);
const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;
const classes = (el: Element) => (attr(el, 'class') ?? '').split(/\s+/).filter(Boolean);
/** Карточка: класс на …card (scard, teaser-card, pcard) — не «scard-grid» и не «scard__body». */
const isCard = (el: Element) => classes(el).some((c) => /card$/.test(c));

function* descendants(n: Node): Generator<Element> {
  for (const c of kids(n)) {
    if (!isElement(c)) continue;
    yield c;
    yield* descendants(c);
  }
}

/** Главная ссылка элемента: он сам или первая ссылка внутри. */
function firstLink(el: Element): Element | undefined {
  if (el.tagName === 'a' && attr(el, 'href') !== undefined) return el;
  for (const d of descendants(el)) if (d.tagName === 'a' && attr(d, 'href') !== undefined) return d;
  return undefined;
}

/** Единственный элемент внутри (текст вокруг — только пробелы): <li><a …>…</a></li>. */
function onlyChild(el: Element): Element | undefined {
  const els = kids(el).filter(isElement);
  const text = kids(el)
    .filter((c): c is TextNode => c.nodeName === '#text')
    .map((c) => c.value)
    .join('');
  return els.length === 1 && !text.trim() ? els[0] : undefined;
}

/** Правки строки (кусок → текст) — с конца, чтобы позиции не сдвигались. */
function splice(src: string, edits: { from: number; to: number }[]): string {
  let out = src;
  for (const e of [...edits].sort((a, b) => b.from - a.from)) out = out.slice(0, e.from) + out.slice(e.to);
  return out;
}

/** Есть ли в HTML ссылка на скрытый раздел — без разбора: большинство строк не трогаем вовсе. */
function mentionsHidden(html: string, hidden: HiddenTest): boolean {
  for (const m of html.matchAll(HREF)) if (hidden(m[1] ?? m[2] ?? m[3] ?? '')) return true;
  return false;
}

/**
 * HTML без ссылок на скрытые разделы. removed — data-cat убранных разделов каталога: их пункты списка «Категория»
 * (могут стоять в другом блоке страницы) убираются вторым проходом с dropOptions.
 */
export function pruneHiddenHtml(html: string, hidden: HiddenTest, dropOptions: ReadonlySet<string> = new Set()): { html: string; removed: string[] } {
  if (!mentionsHidden(html, hidden) && !(dropOptions.size && html.includes('<option'))) return { html, removed: [] };
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const edits: { from: number; to: number }[] = [];
  const removed: string[] = [];
  const isHidden = (a: Element | undefined) => {
    const href = a && attr(a, 'href');
    return href !== undefined && hidden(href);
  };
  /** Убрать элемент целиком (у элементов, достроенных разбором, позиций нет — их не трогаем). */
  const cut = (el: Element) => {
    const loc = el.sourceCodeLocation;
    if (loc) edits.push({ from: loc.startOffset, to: loc.endOffset });
    return Boolean(loc);
  };
  const walk = (n: Node) => {
    for (const el of kids(n)) {
      if (!isElement(el) || SKIP.has(el.tagName)) continue;
      if (el.tagName === 'section' && classes(el).includes('cat-index')) {
        const all = [...descendants(el)].find((d) => d.tagName === 'a' && classes(d).includes('cat-index__all'));
        const cards = [...descendants(el)].filter(isCard);
        if ((isHidden(all) || (cards.length > 0 && cards.every((c) => isHidden(firstLink(c))))) && cut(el)) {
          const key = attr(el, 'data-cat');
          if (key) removed.push(key);
          continue;
        }
      }
      if (isCard(el) && isHidden(firstLink(el)) && cut(el)) continue;
      const only = el.tagName === 'li' ? onlyChild(el) : undefined;
      if (only?.tagName === 'a' && isHidden(only) && cut(el)) continue;
      if (el.tagName === 'option' && dropOptions.has(attr(el, 'value') ?? '') && cut(el)) continue;
      if (el.tagName === 'a' && isHidden(el)) {
        const loc = el.sourceCodeLocation;
        if (classes(el).includes('btn') || kids(el).some((c) => isElement(c) && BLOCKY.has(c.tagName))) {
          if (cut(el)) continue;
        } else if (loc?.startTag && loc.endTag) {
          // ссылка в тексте — текстом: убираем теги, содержимое остаётся
          edits.push({ from: loc.startTag.startOffset, to: loc.startTag.endOffset }, { from: loc.endTag.startOffset, to: loc.endTag.endOffset });
        }
      }
      walk(el);
    }
  };
  walk(doc);
  return { html: edits.length ? splice(html, edits) : html, removed };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Поля блоков с кодом, а не разметкой: стили и скрипты. */
const CODE = new Set(['css', 'code']);

/** Блоки страницы для сайта: без карточек, разделов и ссылок на скрытые разделы каталога. */
export function pruneHiddenLinks(blocks: Block[], hidden: HiddenTest): Block[] {
  const removed: string[] = [];
  const visit = (v: unknown, key: string | undefined, drop: ReadonlySet<string>): unknown => {
    if (typeof v === 'string') {
      if ((key && CODE.has(key)) || !v.includes('<')) return v;
      const r = pruneHiddenHtml(v, hidden, drop);
      removed.push(...r.removed);
      return r.html;
    }
    if (Array.isArray(v)) return v.filter((x) => !(isObject(x) && typeof x.href === 'string' && hidden(x.href))).map((x) => visit(x, undefined, drop));
    if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, visit(x, k, drop)]));
    return v;
  };
  const once = visit(blocks, undefined, new Set()) as Block[];
  // убран раздел каталога — второй проход убирает его пункт в выпадающем списке «Категория»
  return removed.length ? (visit(once, undefined, new Set(removed)) as Block[]) : once;
}
