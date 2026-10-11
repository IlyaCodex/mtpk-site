/**
 * Правка страниц-документов (Практикум: целый HTML-документ в content.pages.body)
 * в редакторе админки.
 *
 *  - annotateDocument — предпросмотр для правки щелчком: у элементов тела с парой
 *    тегов — data-mtpk-src="начало:конец" (содержимое между тегами в исходнике),
 *    у картинок — data-mtpk-tag (весь открывающий тег). Правка заменяет ровно этот
 *    кусок исходника — остальной документ остаётся байт в байт.
 *  - docMeta / setDocMeta — заголовок и описание документа живут в его <head>
 *    (title, description, og:/twitter:, robots): читаем и правим их там же.
 */
import { parse, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

/** Куда правка щелчком не заходит: служебное, код, векторная графика, формы. */
const SKIP = new Set(['head', 'script', 'style', 'template', 'textarea', 'svg', 'math', 'noscript', 'iframe', 'select', 'ui-form']);

const isElement = (n: Node): n is Element => 'tagName' in n;
const children = (n: Node): Node[] => ('childNodes' in n ? n.childNodes : []);

function* elements(n: Node): Generator<Element> {
  for (const c of children(n)) {
    if (!isElement(c)) continue;
    yield c;
    yield* elements(c);
  }
}

const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;

/** Вставки в строку (позиция → текст) — с конца, чтобы позиции не сдвигались. */
function splice(src: string, edits: { from: number; to: number; text: string }[]): string {
  let out = src;
  for (const e of [...edits].sort((a, b) => b.from - a.from || b.to - a.to)) out = out.slice(0, e.from) + e.text + out.slice(e.to);
  return out;
}

export function annotateDocument(html: string): string {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const edits: { from: number; to: number; text: string }[] = [];
  const walk = (n: Node, inBody: boolean) => {
    for (const c of children(n)) {
      if (!isElement(c) || SKIP.has(c.tagName)) continue;
      const body = inBody || c.tagName === 'body';
      const loc = c.sourceCodeLocation;
      if (body && loc?.startTag && c.tagName !== 'body' && c.tagName !== 'html') {
        // сразу после имени тега: <p data-mtpk-src="…" class="…">
        const at = loc.startTag.startOffset + 1 + c.tagName.length;
        if (c.tagName === 'img') edits.push({ from: at, to: at, text: ` data-mtpk-tag="${loc.startTag.startOffset}:${loc.startTag.endOffset}"` });
        else if (loc.endTag) edits.push({ from: at, to: at, text: ` data-mtpk-src="${loc.startTag.endOffset}:${loc.endTag.startOffset}"` });
      }
      walk(c, body);
    }
  };
  walk(doc, false);
  return splice(html, edits);
}

const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => escText(s).replace(/"/g, '&quot;');

function headOf(html: string): { head: Element | null; title: Element | null; metas: Element[] } {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const all = [...elements(doc)];
  const head = all.find((e) => e.tagName === 'head') ?? null;
  const inHead = head ? [...elements(head)] : [];
  return { head, title: inHead.find((e) => e.tagName === 'title') ?? null, metas: inHead.filter((e) => e.tagName === 'meta') };
}

const textOf = (el: Element) =>
  children(el)
    .map((c) => ('value' in c && c.nodeName === '#text' ? (c as { value: string }).value : ''))
    .join('');

/** Заголовок и описание документа — из его <head>. */
export function docMeta(html: string): { title: string; description: string | null; noindex: boolean } {
  const { title, metas } = headOf(html);
  const desc = metas.find((m) => attr(m, 'name')?.toLowerCase() === 'description');
  const robots = metas.find((m) => attr(m, 'name')?.toLowerCase() === 'robots');
  return {
    title: title ? textOf(title).trim() : '',
    description: desc ? (attr(desc, 'content') ?? '').trim() || null : null,
    noindex: Boolean(robots && /noindex/i.test(attr(robots, 'content') ?? '')),
  };
}

/**
 * Записать заголовок, описание и noindex в <head> документа: <title>, meta description,
 * og:/twitter: title и description (если они есть), meta robots. Остальное — как было.
 */
export function setDocMeta(html: string, meta: { title: string; description: string | null; noindex: boolean }): string {
  const { head, title, metas } = headOf(html);
  const headStart = head?.sourceCodeLocation?.startTag;
  if (!headStart) return html;
  const edits: { from: number; to: number; text: string }[] = [];
  const replaceTag = (el: Element, text: string) => {
    const loc = el.sourceCodeLocation;
    if (loc) edits.push({ from: loc.startOffset, to: loc.endOffset, text });
  };
  const key = (m: Element) => (attr(m, 'name') ?? attr(m, 'property') ?? '').toLowerCase();
  const metaTag = (m: Element, content: string) => {
    const by = attr(m, 'property') !== undefined ? 'property' : 'name';
    return `<meta ${by}="${escAttr(attr(m, by) ?? '')}" content="${escAttr(content)}">`;
  };

  // меняем только то, что действительно другое: остальные теги — как были, байт в байт
  const set = (m: Element, value: string) => {
    if ((attr(m, 'content') ?? '') !== value) replaceTag(m, metaTag(m, value));
  };

  // заголовок
  const t = title?.sourceCodeLocation;
  if (t?.startTag && t.endTag) {
    if (textOf(title!).trim() !== meta.title) edits.push({ from: t.startTag.endOffset, to: t.endTag.startOffset, text: escText(meta.title) });
  }
  else if (!title) edits.push({ from: headStart.endOffset, to: headStart.endOffset, text: `<title>${escText(meta.title)}</title>` });
  for (const m of metas) if (['og:title', 'twitter:title'].includes(key(m))) set(m, meta.title);

  // описание
  const description = meta.description?.trim() ?? '';
  const desc = metas.find((m) => key(m) === 'description');
  if (desc) {
    if (!description) replaceTag(desc, '');
    else set(desc, description);
  }
  else if (description) {
    const after = title?.sourceCodeLocation?.endOffset ?? headStart.endOffset;
    edits.push({ from: after, to: after, text: `<meta name="description" content="${escAttr(description)}">` });
  }
  if (description) for (const m of metas) if (['og:description', 'twitter:description'].includes(key(m))) set(m, description);

  // скрыть от поисковиков
  const robots = metas.find((m) => key(m) === 'robots');
  if (meta.noindex) {
    const tag = '<meta name="robots" content="noindex, follow">';
    if (robots) {
      if (!/noindex/i.test(attr(robots, 'content') ?? '')) replaceTag(robots, tag);
    } else edits.push({ from: headStart.endOffset, to: headStart.endOffset, text: tag });
  } else if (robots && /noindex/i.test(attr(robots, 'content') ?? '')) replaceTag(robots, '');

  return splice(html, edits);
}
