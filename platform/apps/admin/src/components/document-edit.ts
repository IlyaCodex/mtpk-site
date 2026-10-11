/**
 * Правка страницы-документа (Практикум) прямо в предпросмотре — как у обычных
 * страниц: щелчок по тексту — он правится на месте; Enter или щелчок мимо —
 * правка уходит в черновик, Esc — отмена; щелчок по картинке — замена из
 * медиатеки.
 *
 * Предпросмотр размечен контент-сервисом (content-kit/doc-edit): у элемента
 * data-mtpk-src="начало:конец" — его содержимое в исходнике документа, у
 * картинки data-mtpk-tag — её открывающий тег. Правка заменяет ровно этот кусок
 * исходника (остальной документ — байт в байт), а пометки в предпросмотре
 * сдвигаются на месте — без перерисовки и прыжка к началу.
 */
import { typedSpaces } from './preview-edit';

/** Строчные элементы: текст с ними правится одним куском. */
const INLINE = new Set(['em', 'strong', 'b', 'i', 'u', 's', 'br', 'span', 'small', 'sup', 'sub', 'mark', 'abbr', 'a', 'code', 'nobr', 'wbr', 'time', 'q', 'cite', 'kbd', 'var', 'del', 'ins']);
const SRC = 'data-mtpk-src';
const TAG = 'data-mtpk-tag';

/** Правка исходника: [from, to) → text. */
export type SourceEdit = { from: number; to: number; text: string };
export type DocPickRequest = { current: string; choose: (url: string) => void };

export type DocumentEditorOptions = {
  onEdit: (edit: SourceEdit) => void;
  onPick: (request: DocPickRequest) => void;
  /** Идёт правка: обновлять предпросмотр нельзя — сотрётся набранное. */
  onEditing: (active: boolean) => void;
  /** Ctrl+S в предпросмотре — сохранить. */
  onSave: () => void;
};

export type DocumentEditor = { detach: () => void };

const rangeOf = (el: Element, name: string): [number, number] | null => {
  const m = /^(\d+):(\d+)$/.exec(el.getAttribute(name) ?? '');
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/** Пометки предпросмотра и следы правки — не в исходник. */
const strip = (html: string) =>
  html
    .replace(/ data-mtpk-(?:src|tag)="\d+:\d+"/g, '')
    .replace(/ data-mtpk="[a-z]*"/g, '')
    .replace(/ contenteditable="[^"]*"/g, '');

/** Набранное: без пробелов и переноса по краям (их добавляет редактор браузера). */
const trimInner = (html: string) => html.replace(/(<br>|&nbsp;|\s)+$/, '').replace(/^(&nbsp;|\s)+/, '');

const isInline = (el: Element) => INLINE.has(el.tagName.toLowerCase());

/** Можно править этот элемент целиком: он размечен, в нём есть текст, внутри — только строчные теги. */
const editable = (el: Element) =>
  el.hasAttribute(SRC) && !el.closest('svg, button, select, textarea, form') && (el.textContent ?? '').trim() !== '' && [...el.children].every(isInline);

/** Текст под щелчком: самый внешний подходящий элемент — от строчного наружу до блока. */
function textElement(target: Element): HTMLElement | null {
  let best: Element | null = editable(target) ? target : null;
  let el: Element | null = target;
  while (el && isInline(el) && el.parentElement) {
    el = el.parentElement;
    if (editable(el)) best = el;
  }
  return best as HTMLElement | null;
}

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Открывающий тег картинки с новым адресом: srcset и sizes старого фото — прочь. */
function imageTag(img: HTMLImageElement, src: string): string {
  const attrs = [...img.attributes].filter((a) => !a.name.startsWith('data-mtpk') && !['srcset', 'sizes', 'src'].includes(a.name));
  return `<img src="${escAttr(src)}"${attrs.map((a) => (a.value === '' ? ` ${a.name}` : ` ${a.name}="${escAttr(a.value)}"`)).join('')}>`;
}

const STYLE = `
html.mtpk-live [data-mtpk="can"]{outline:1.5px dashed rgba(13,110,140,.7);outline-offset:3px;cursor:text}
html.mtpk-live [data-mtpk="edit"]{outline:2px solid #0d6e8c;outline-offset:3px;box-shadow:0 0 0 7px rgba(13,110,140,.14);cursor:text}
html.mtpk-live img[data-mtpk="can"]{outline:2px solid #0d6e8c;outline-offset:-2px;cursor:pointer}
`;

export function attachDocumentEditor(doc: Document, opts: DocumentEditorOptions): DocumentEditor {
  const style = doc.createElement('style');
  style.textContent = STYLE;
  doc.head.append(style);
  doc.documentElement.classList.add('mtpk-live');

  let hover: Element | null = null;
  let editing: { el: HTMLElement; before: string } | null = null;

  const setHover = (el: Element | null) => {
    if (hover === el) return;
    if (hover && hover.getAttribute('data-mtpk') === 'can') hover.removeAttribute('data-mtpk');
    hover = el;
    if (el && !el.hasAttribute('data-mtpk')) el.setAttribute('data-mtpk', 'can');
  };

  /** После замены [from, to) на текст длиной len — сдвинуть пометки у всего, что после или вокруг. */
  const shift = (from: number, to: number, len: number, except: Element) => {
    const delta = len - (to - from);
    if (!delta) return;
    for (const name of [SRC, TAG]) {
      for (const el of doc.querySelectorAll(`[${name}]`)) {
        if (el === except) continue;
        const r = rangeOf(el, name);
        if (!r) continue;
        const a = r[0] >= to ? r[0] + delta : r[0];
        const b = r[1] >= to ? r[1] + delta : r[1];
        if (a !== r[0] || b !== r[1]) el.setAttribute(name, `${a}:${b}`);
      }
    }
  };

  /** Снять режим правки. editing обнуляется раньше: снятие contenteditable вызывает focusout — правка не должна записаться дважды. */
  const finish = (el: HTMLElement) => {
    editing = null;
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-mtpk');
  };

  const commit = () => {
    if (!editing) return;
    const { el, before } = editing;
    const after = trimInner(strip(el.innerHTML));
    const was = trimInner(strip(before));
    const text = typedSpaces(was, after, '&nbsp;');
    const r = rangeOf(el, SRC);
    finish(el);
    if (r && text !== was) {
      // вложенные пометки устарели: их куски вошли в правку
      for (const inner of el.querySelectorAll(`[${SRC}], [${TAG}]`)) {
        inner.removeAttribute(SRC);
        inner.removeAttribute(TAG);
      }
      shift(r[0], r[1], text.length, el);
      el.setAttribute(SRC, `${r[0]}:${r[0] + text.length}`);
      opts.onEdit({ from: r[0], to: r[1], text });
    }
    opts.onEditing(false);
  };

  const cancel = () => {
    if (!editing) return;
    const { el, before } = editing;
    el.innerHTML = before;
    finish(el);
    opts.onEditing(false);
  };

  const start = (el: HTMLElement, x: number, y: number) => {
    setHover(null);
    editing = { el, before: el.innerHTML };
    el.setAttribute('data-mtpk', 'edit');
    el.contentEditable = 'true';
    el.focus();
    // каретка — туда, где щёлкнули
    const d = doc as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
    const range = d.caretRangeFromPoint?.(x, y);
    if (range) {
      const sel = doc.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    opts.onEditing(true);
  };

  const pickImage = (img: HTMLImageElement) => {
    const r = rangeOf(img, TAG);
    if (!r) return;
    opts.onPick({
      current: img.getAttribute('src') ?? '',
      choose: (url) => {
        const tag = imageTag(img, url);
        // в <picture> старые <source> показали бы прежнее фото — остаётся только картинка
        const picture = img.parentElement?.tagName.toLowerCase() === 'picture' ? img.parentElement : null;
        const pr = picture ? rangeOf(picture, SRC) : null;
        const [from, to] = pr ?? r;
        if (picture && pr) for (const s of [...picture.querySelectorAll('source')]) s.remove();
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.setAttribute('src', url);
        shift(from, to, tag.length, picture ?? img);
        if (picture && pr) {
          picture.setAttribute(SRC, `${from}:${from + tag.length}`);
          img.setAttribute(TAG, `${from}:${from + tag.length}`);
        } else img.setAttribute(TAG, `${from}:${from + tag.length}`);
        opts.onEdit({ from, to, text: tag });
      },
    });
  };

  const onMove = (e: MouseEvent) => {
    if (editing) return;
    const t = e.target instanceof doc.defaultView!.Element ? (e.target as Element) : null;
    if (!t) return setHover(null);
    if (t.tagName === 'IMG' && t.hasAttribute(TAG)) return setHover(t);
    setHover(textElement(t));
  };

  const onClick = (e: MouseEvent) => {
    const t = e.target instanceof doc.defaultView!.Element ? (e.target as Element) : null;
    // ссылки и кнопки в предпросмотре никуда не ведут
    if (t?.closest('a, button, [type=submit]')) e.preventDefault();
    if (!t || (editing && editing.el.contains(t))) return;
    if (editing) commit();
    if (t.tagName === 'IMG' && t.hasAttribute(TAG)) {
      e.preventDefault();
      pickImage(t as HTMLImageElement);
      return;
    }
    const el = textElement(t);
    if (el) {
      e.preventDefault();
      start(el, e.clientX, e.clientY);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      commit();
      opts.onSave();
      return;
    }
    if (!editing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  const onFocusOut = (e: FocusEvent) => {
    if (editing && e.target === editing.el) commit();
  };
  const onSubmit = (e: Event) => e.preventDefault();

  doc.addEventListener('mousemove', onMove);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('focusout', onFocusOut);
  doc.addEventListener('submit', onSubmit, true);

  return {
    detach: () => {
      commit();
      doc.removeEventListener('mousemove', onMove);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('focusout', onFocusOut);
      doc.removeEventListener('submit', onSubmit, true);
      doc.documentElement.classList.remove('mtpk-live');
      style.remove();
    },
  };
}
