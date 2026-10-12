/**
 * Правка текста прямо в предпросмотре: щелчок по тексту — он выделяется и
 * правится на месте; Enter или щелчок мимо — правка уходит в черновик страницы
 * (как если бы её сделали слева), Esc — отмена. Щелчок по картинке или фону —
 * замена из медиатеки, по иконке SVG — окно «Иконка и цвет».
 *
 * Предпросмотр — iframe без скриптов (sandbox без allow-scripts): обработчики
 * вешает админка на его документ. Какой блок под щелчком — по меткам
 * <!--mtpk:N--> перед блоками (контент-сервис, render с mark). Куда записать
 * правку:
 *  - HTML-секция — тот же элемент в её HTML (путь по элементам от корня секции,
 *    сверка по тексту), как вкладка «Тексты и картинки»;
 *  - блок с полями — поле, в котором ровно этот текст;
 *  - общие блоки (категории под товаром, формы, преимущества…) и карточки из
 *    каталога здесь не правятся — подсказка, где их менять.
 */
import type { BlockData } from './BlockList';
import { iconSvg } from './icons';
import { sameIcon } from './svg-icon';

/** Строчные элементы: текст с ними правится одним куском (как в html-fields). */
const INLINE = new Set(['em', 'strong', 'b', 'i', 'u', 's', 'br', 'span', 'small', 'sup', 'sub', 'mark', 'abbr', 'a', 'code', 'nobr', 'wbr', 'time']);
/** Блоки-компоненты: их тексты одинаковы на всех страницах и в данных страницы не хранятся. */
const COMPONENTS = new Set(['bestOffer', 'catalogCta', 'partner', 'adv', 'whyUs']);

const REASONS = {
  shared: 'Общий блок категории — он одинаковый у всех её товаров. Меняется в «Каталоге продукции» → категория → «Блоки под товарами».',
  component: 'Общая секция сайта — одинаковая на всех страницах, здесь её текст не меняется.',
  defaults: 'Тексты блока — общие, как на главной. Свои тексты для этой страницы задаются в полях блока слева.',
  catalog: 'Карточка из каталога — название и подпись меняются в «Каталоге продукции».',
  form: 'Форма заявки — её подписи меняются слева: у блока «Подбор и расчёт» — поля «Форма», у HTML-секции — «Тексты и картинки» → поля «Форма: …».',
  notFound: 'Этот текст не нашёлся в полях блока — поправьте его слева.',
  mismatch: 'Не удалось сопоставить текст с HTML секции — поправьте его слева.',
  changed: 'Секция изменилась, пока правился текст, — повторите правку.',
  icon: 'Эта иконка — часть оформления блока, а не его поле: здесь она не меняется.',
};

type Plan = { ok: true; apply: (inner: string, text: string, blocks: BlockData[]) => BlockData[] | null } | { ok: false; reason: string };

/** Что меняется в черновике: блоки и/или стили страницы. */
export type PagePatch = { blocks?: BlockData[]; inlineStyles?: string[] };

/** Запрос «выбрать картинку»: что меняем, текущий адрес и что сделать с выбранной. */
export type PickRequest = { what: 'картинку' | 'фон'; current: string; choose: (url: string) => void };

/** Запрос «сменить иконку»: текущая (<svg> из данных страницы), что сделать с новой, как убрать. */
export type IconRequest = { current: string; choose: (svg: string) => void; remove: () => void };

export type PreviewEditorOptions = {
  getBlocks: () => BlockData[];
  /** Стили страницы (вкладка «Стили»): в них обычно задан фон секций. */
  getStyles: () => string[];
  onUpdate: (patch: PagePatch) => void;
  /** Открыть медиатеку и вызвать choose с выбранным адресом. */
  onPick: (request: PickRequest) => void;
  /** Открыть окно «Иконка и цвет» и вызвать choose с новой иконкой. */
  onIcon?: (request: IconRequest) => void;
  /** Ctrl+S в предпросмотре — сохранить страницу, как Ctrl+S в редакторе. */
  onSave: () => void;
  /** Идёт правка: обновлять предпросмотр нельзя — сотрётся набранное. changed — правка ушла в черновик. */
  onEditing: (active: boolean, changed: boolean) => void;
  /** Вставить блок перед блоком index (index = число блоков — в конец): «+» у блока. */
  onInsert?: (index: number) => void;
  /** Действие с блоком из его панели в предпросмотре. */
  onBlockAction?: (index: number, action: BlockAction) => void;
  /** Подпись блока на его панели. */
  labelOf?: (index: number) => string;
};

export type BlockAction = 'up' | 'down' | 'copy' | 'remove' | 'settings';

/** Подключённый к предпросмотру редактор. */
export type PreviewEditor = {
  detach: () => void;
  /** Содержимое перерисовано — спрятать рамку (элементы под ней сменились). */
  refresh: () => void;
  /** Прокрутить к блоку index и подсветить его (новый, перемещённый). */
  reveal: (index: number) => void;
};

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** HTML в одном виде для сравнения: разбор и запись браузером, пробелы схлопнуты. */
function canon(html: string): string {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.innerHTML.replace(/\s+/g, ' ').trim();
}
const plainOf = (html: string) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.textContent ?? '';
};

/** Только строчное содержимое с текстом. */
function isText(el: Element): boolean {
  if (!el.textContent?.trim()) return false;
  for (const d of el.querySelectorAll('*')) if (!INLINE.has(d.tagName.toLowerCase())) return false;
  return true;
}

/** Где текста для правки нет: иконки, служебные теги, поля ввода. */
const SKIP = 'svg, script, style, noscript, template, select, textarea, option, iframe, video, audio';

/** Текст под курсором: ближайший текстовый элемент; строчный внутри текста — весь текст целиком. */
function textElement(target: Element): Element | null {
  if (!isText(target) || target.closest(SKIP)) return null;
  let el = target;
  while (el.parentElement && INLINE.has(el.tagName.toLowerCase()) && el.parentElement.tagName !== 'MAIN' && isText(el.parentElement)) el = el.parentElement;
  return el;
}

/** Метка блока под узлом и его элемент на уровне метки. */
function blockAt(node: Element): { mark: string; marker: Comment; root: Element } | null {
  for (let el: Element | null = node; el; el = el.parentElement) {
    for (let s = el.previousSibling; s; s = s.previousSibling) {
      if (s.nodeType !== 8) continue;
      const m = /^mtpk:([\w.]+)$/.exec((s as Comment).data);
      if (m) return { mark: m[1], marker: s as Comment, root: el };
    }
  }
  return null;
}

/** Элементы блока: от его метки до следующей метки на том же уровне. */
function blockElements(marker: Comment): Element[] {
  const out: Element[] = [];
  for (let s = marker.nextSibling; s; s = s.nextSibling) {
    if (s.nodeType === 8 && /^mtpk:/.test((s as Comment).data)) break;
    if (s.nodeType === 1) out.push(s as Element);
  }
  return out;
}

/** Путь от корня до элемента — номера среди дочерних элементов (текст и комментарии не считаются). */
function routeOf(root: Element, el: Element): number[] | null {
  const route: number[] = [];
  for (let e: Element | null = el; e !== root; e = e.parentElement) {
    if (!e?.parentElement) return null;
    route.unshift([...e.parentElement.children].indexOf(e));
  }
  return route;
}
const follow = (root: ParentNode, route: number[]) => route.reduce<ParentNode | null>((e, i) => e?.children[i] ?? null, root) as Element | null;

/** Путь до элемента от фрагмента (поля с HTML) — номера среди дочерних элементов. */
function routeIn(root: ParentNode, el: Element): number[] {
  const route: number[] = [];
  for (let e: Element = el; ; e = e.parentElement!) {
    const parent = e.parentNode as ParentNode;
    route.unshift([...parent.children].indexOf(e));
    if (parent === root) return route;
  }
}

function blockByMark(blocks: BlockData[], path: number[]): BlockData | undefined {
  let list = blocks;
  let block: BlockData | undefined;
  for (const [depth, i] of path.entries()) {
    block = list[i];
    if (!block) return undefined;
    if (depth < path.length - 1) {
      if (block.type !== 'container') return undefined;
      list = block.children as BlockData[];
    }
  }
  return block;
}
function replaceByMark(blocks: BlockData[], path: number[], next: BlockData): BlockData[] {
  const [i, ...rest] = path;
  return blocks.map((b, j) => (j !== i ? b : rest.length ? { ...b, children: replaceByMark(b.children as BlockData[], rest, next) } : next));
}

/** Строковые поля блока с путями (служебные type и attrs — мимо). */
type Leaf = { path: (string | number)[]; value: string };
function leaves(v: unknown, path: (string | number)[] = [], out: Leaf[] = []): Leaf[] {
  if (typeof v === 'string') out.push({ path, value: v });
  else if (Array.isArray(v)) v.forEach((x, i) => leaves(x, [...path, i], out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'type' && k !== 'attrs') leaves(x, [...path, k], out);
  return out;
}
function setLeaf(v: unknown, path: (string | number)[], value: string): unknown {
  if (!path.length) return value;
  const [k, ...rest] = path;
  if (Array.isArray(v)) return v.map((x, i) => (i === k ? setLeaf(x, rest, value) : x));
  const obj = v as Record<string, unknown>;
  return { ...obj, [k]: setLeaf(obj[k as string], rest, value) };
}
const leafAt = (v: unknown, path: (string | number)[]) => path.reduce<unknown>((x, k) => (x as Record<string | number, unknown> | undefined)?.[k], v);

/** Куда записать правку текста el. */
function plan(el: Element, blocks: BlockData[]): Plan {
  const deny = (reason: string): Plan => ({ ok: false, reason });
  if (el.closest('form, .js-lead-form')) return deny(REASONS.form);
  const at = blockAt(el);
  if (!at) return deny(REASONS.notFound);
  if (at.mark === 'shared') return deny(REASONS.shared);
  const path = at.mark.split('.').map(Number);
  const block = blockByMark(blocks, path);
  if (!block) return deny(REASONS.notFound);
  if (COMPONENTS.has(block.type)) return deny(REASONS.component);
  // «Подбор и расчёт» без своих текстов выводит общие — в его полях их нет
  if (block.type === 'leadgen' && !leaves(block).some((l) => l.value.trim())) return deny(REASONS.defaults);
  const original = norm(el.textContent);

  if (block.type === 'html') {
    const route = routeOf(at.root, el);
    const locate = (html: string) => {
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const root = tpl.content.firstElementChild;
      const found = route && root ? follow(root, route) : null;
      return found && norm(found.textContent) === original ? { tpl, found } : null;
    };
    if (!locate(String(block.html))) return deny(REASONS.mismatch);
    return {
      ok: true,
      apply: (inner, _text, now) => {
        const current = blockByMark(now, path);
        const hit = current?.type === 'html' ? locate(String(current.html)) : null;
        if (!current || !hit) return null;
        hit.found.innerHTML = inner;
        return replaceByMark(now, path, { ...current, html: hit.tpl.innerHTML });
      },
    };
  }

  // блок с полями: поле с тем же HTML (или текстом); нет — абзац, пункт… внутри HTML-поля (описание товара)
  const all = leaves(block).filter((l) => l.value.trim());
  const html = canon(el.innerHTML);
  const tag = el.tagName.toLowerCase();
  type Hit = { leaf: Leaf; route: number[] | null };
  let hits: Hit[] = all.filter((l) => canon(l.value) === html).map((leaf) => ({ leaf, route: null }));
  if (!hits.length) hits = all.filter((l) => norm(plainOf(l.value)) === original).map((leaf) => ({ leaf, route: null }));
  if (!hits.length) {
    for (const leaf of all) {
      if (!leaf.value.includes('<')) continue;
      const tpl = document.createElement('template');
      tpl.innerHTML = leaf.value;
      for (const d of tpl.content.querySelectorAll(tag)) {
        if (d === textElement(d) && (canon(d.innerHTML) === html || norm(d.textContent) === original)) hits.push({ leaf, route: routeIn(tpl.content, d) });
      }
    }
  }
  if (!hits.length) return deny(block.type === 'catalogCards' || block.type === 'catalogList' ? REASONS.catalog : REASONS.notFound);
  let hit = hits[0];
  if (hits.length > 1) {
    // одинаковый текст в нескольких местах — по порядку появления в блоке
    const same = blockElements(at.marker)
      .flatMap((e) => [e, ...e.querySelectorAll('*')])
      .filter((e) => e === textElement(e) && norm(e.textContent) === original);
    hit = hits[Math.min(Math.max(same.indexOf(el), 0), hits.length - 1)];
  }
  const { leaf, route } = hit;
  const was = leaf.value;
  // поле без разметки и сущностей — пишем текстом, иначе HTML
  const asText = route === null && !/[<&]/.test(was);
  return {
    ok: true,
    apply: (inner, text, now) => {
      const current = blockByMark(now, path);
      if (!current || leafAt(current, leaf.path) !== was) return null;
      let value = asText ? cleanText(text) : inner;
      if (route) {
        const tpl = document.createElement('template');
        tpl.innerHTML = was;
        const target = follow(tpl.content, route);
        if (!target) return null;
        target.innerHTML = inner;
        value = tpl.innerHTML;
      }
      return replaceByMark(now, path, setLeaf(current, leaf.path, value) as BlockData);
    },
  };
}

/** Картинка под точкой: <img> или фон (background-image у элемента, его ::before/::after). */
type ImageHit = { kind: 'img'; el: Element; src: string } | { kind: 'bg'; el: Element; pseudo: '' | '::before' | '::after'; url: string };
type ImagePlan = { ok: true; what: PickRequest['what']; current: string; apply: (url: string, blocks: BlockData[], styles: string[]) => PagePatch | null } | { ok: false; reason: string };

/** Адрес картинки на сайте: /img/… (computed style отдаёт полный адрес). */
function sitePath(raw: string, doc: Document): string {
  try {
    const u = new URL(raw, doc.baseURI);
    return u.origin === new URL(doc.baseURI).origin ? u.pathname + u.search : raw;
  } catch {
    return raw;
  }
}

function imageAt(doc: Document, x: number, y: number): ImageHit | null {
  const win = doc.defaultView;
  if (!win) return null;
  // сверху вниз по слоям: оверлеи-градиенты пропускаем, картинка может быть под ними
  for (const el of doc.elementsFromPoint(x, y)) {
    if (el.tagName === 'MAIN' || !el.closest('main')) continue;
    if (el.tagName === 'IMG') return { kind: 'img', el, src: el.getAttribute('src') ?? '' };
    for (const pseudo of ['', '::before', '::after'] as const) {
      const m = /url\(["']?([^"')]+)["']?\)/.exec(win.getComputedStyle(el, pseudo || null).backgroundImage);
      if (m) return { kind: 'bg', el, pseudo, url: sitePath(m[1], doc) };
    }
  }
  return null;
}

/** Селектор для правила поверх общих стилей: свои классы элемента, иначе путь от ближайшего с классом. */
function selectorOf(el: Element): string {
  const classes = (e: Element) => [...e.classList].map((c) => `.${CSS.escape(c)}`).join('');
  if (el.classList.length) return classes(el);
  const parent = el.parentElement;
  const nth = parent ? `${el.tagName.toLowerCase()}:nth-child(${[...parent.children].indexOf(el) + 1})` : el.tagName.toLowerCase();
  return parent && parent.tagName !== 'MAIN' ? `${selectorOf(parent)} > ${nth}` : nth;
}

/** Куда записать новую картинку. */
function imagePlan(hit: ImageHit, blocks: BlockData[]): ImagePlan {
  const deny = (reason: string): ImagePlan => ({ ok: false, reason });
  const at = blockAt(hit.el);
  if (at?.mark === 'shared') return deny(REASONS.shared);

  if (hit.kind === 'bg') {
    const { url, el, pseudo } = hit;
    return {
      ok: true,
      what: 'фон',
      current: url,
      apply: (next, now, styles) => {
        // адрес фона — в стилях страницы, блоках «Стили» или HTML секций: заменить там
        const swap = (s: string) => s.split(url).join(next);
        let found = false;
        const inlineStyles = styles.map((css) => {
          if (!css.includes(url)) return css;
          found = true;
          return swap(css);
        });
        const walk = (list: BlockData[]): BlockData[] =>
          list.map((b) => {
            if (b.type === 'container') return { ...b, children: walk(b.children as BlockData[]) };
            const key = b.type === 'style' ? 'css' : b.type === 'html' ? 'html' : null;
            if (!key || !String(b[key]).includes(url)) return b;
            found = true;
            return { ...b, [key]: swap(String(b[key])) };
          });
        const nextBlocks = walk(now);
        if (found) return { blocks: nextBlocks, inlineStyles };
        // фон из общих стилей сайта — правило поверх них, только на этой странице
        return { inlineStyles: [...styles, `${selectorOf(el)}${pseudo} { background-image: url('${next}') !important; }`] };
      },
    };
  }

  if (!at) return deny(REASONS.notFound);
  const path = at.mark.split('.').map(Number);
  const block = blockByMark(blocks, path);
  if (!block) return deny(REASONS.notFound);
  if (COMPONENTS.has(block.type)) return deny(REASONS.component);

  if (block.type === 'html') {
    const route = routeOf(at.root, hit.el);
    const locate = (html: string) => {
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const root = tpl.content.firstElementChild;
      const found = route && root ? follow(root, route) : null;
      return found?.tagName === 'IMG' && found.getAttribute('src') === hit.src ? { tpl, found } : null;
    };
    if (!locate(String(block.html))) return deny(REASONS.mismatch);
    return {
      ok: true,
      what: 'картинку',
      current: hit.src,
      apply: (url, now) => {
        const current = blockByMark(now, path);
        const h = current?.type === 'html' ? locate(String(current.html)) : null;
        if (!current || !h) return null;
        h.found.setAttribute('src', url);
        // уменьшенные копии и WebP медиасервис делает сам — старые варианты убрать
        h.found.removeAttribute('srcset');
        h.found.removeAttribute('sizes');
        if (h.found.parentElement?.tagName === 'PICTURE') h.found.parentElement.querySelectorAll('source').forEach((s) => s.remove());
        return { blocks: replaceByMark(now, path, { ...current, html: h.tpl.innerHTML }) };
      },
    };
  }

  // блок с полями: поля с этим адресом; у фото галереи — и картинка, и миниатюра
  const hits = leaves(block).filter((l) => l.value === hit.src);
  if (!hits.length) return deny(block.type === 'catalogCards' || block.type === 'catalogList' ? REASONS.catalog : REASONS.notFound);
  return {
    ok: true,
    what: 'картинку',
    current: hit.src,
    apply: (url, now) => {
      let next: unknown = blockByMark(now, path);
      if (!next) return null;
      for (const l of hits) {
        const was = leafAt(next, l.path);
        if (was === url) continue; // уже заменено вместе с парой «картинка — миниатюра»
        if (was !== hit.src) return null;
        next = setLeaf(next, l.path, url);
        const parent = l.path.slice(0, -1);
        const photo = leafAt(next, parent) as Record<string, unknown> | undefined;
        if ((l.path.at(-1) === 'src' || l.path.at(-1) === 'thumb') && typeof photo?.src === 'string' && typeof photo.thumb === 'string') {
          next = setLeaf(setLeaf(next, [...parent, 'src'], url), [...parent, 'thumb'], url);
        }
      }
      return { blocks: replaceByMark(now, path, next as BlockData) };
    },
  };
}

/** Иконка: сам <svg> (внешний, если вложены) или рамка вокруг одной иконки — маленький блок без текста. */
function iconOf(el: Element): Element | null {
  let svg = el.closest('svg');
  if (svg) {
    while (svg.parentElement?.closest('svg')) svg = svg.parentElement.closest('svg')!;
    return svg;
  }
  if (el.tagName === 'MAIN' || el.textContent?.trim()) return null;
  const inner = el.querySelectorAll('svg');
  const r = el.getBoundingClientRect();
  return inner.length === 1 && r.width <= 160 && r.height <= 160 ? inner[0] : null;
}

/** Иконка под точкой: по слоям сверху вниз до первого элемента с текстом. */
function iconAt(doc: Document, x: number, y: number): Element | null {
  for (const el of doc.elementsFromPoint(x, y)) {
    if (el.tagName === 'MAIN' || !el.closest('main')) continue;
    const svg = iconOf(el);
    if (svg) return svg;
    if (el.textContent?.trim()) return null;
  }
  return null;
}

type IconPlan = { ok: true; current: string; apply: (svg: string, blocks: BlockData[]) => BlockData[] | null } | { ok: false; reason: string };

/** Заменить элемент разметкой html (пусто — убрать элемент). */
function replaceElement(el: Element, html: string): void {
  if (!html) return el.remove();
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  el.replaceWith(...tpl.content.childNodes);
}

/** Куда записать новую иконку: тот же <svg> в HTML секции или поле блока с этой иконкой. */
function iconPlan(svg: Element, blocks: BlockData[]): IconPlan {
  const deny = (reason: string): IconPlan => ({ ok: false, reason });
  if (svg.closest('form, .js-lead-form')) return deny(REASONS.form);
  const at = blockAt(svg);
  if (!at) return deny(REASONS.icon);
  if (at.mark === 'shared') return deny(REASONS.shared);
  const path = at.mark.split('.').map(Number);
  const block = blockByMark(blocks, path);
  if (!block) return deny(REASONS.icon);
  if (COMPONENTS.has(block.type)) return deny(REASONS.component);
  const shown = svg.outerHTML;

  if (block.type === 'html') {
    const route = routeOf(at.root, svg);
    const locate = (html: string) => {
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const root = tpl.content.firstElementChild;
      const found = route && root ? follow(root, route) : null;
      return found?.tagName.toLowerCase() === 'svg' && sameIcon(found.outerHTML, shown) ? { tpl, found } : null;
    };
    const first = locate(String(block.html));
    if (!first) return deny(REASONS.mismatch);
    return {
      ok: true,
      current: first.found.outerHTML,
      apply: (next, now) => {
        const current = blockByMark(now, path);
        const hit = current?.type === 'html' ? locate(String(current.html)) : null;
        if (!current || !hit) return null;
        replaceElement(hit.found, next);
        return replaceByMark(now, path, { ...current, html: hit.tpl.innerHTML });
      },
    };
  }

  // блок с полями: поле-иконка с тем же рисунком; одинаковые — по порядку в блоке
  const hits = leaves(block).filter((l) => /^\s*<svg[\s>]/i.test(l.value) && sameIcon(l.value, shown));
  if (!hits.length) return deny(REASONS.icon);
  let leaf = hits[0];
  if (hits.length > 1) {
    const same = blockElements(at.marker)
      .flatMap((e) => [...e.querySelectorAll<Element>('svg')])
      .filter((e) => sameIcon(e.outerHTML, shown));
    leaf = hits[Math.min(Math.max(same.indexOf(svg), 0), hits.length - 1)];
  }
  const was = leaf.value;
  return {
    ok: true,
    current: was,
    apply: (next, now) => {
      const current = blockByMark(now, path);
      if (!current || leafAt(current, leaf.path) !== was) return null;
      return replaceByMark(now, path, setLeaf(current, leaf.path, next) as BlockData);
    },
  };
}

/**
 * Пробелы и редактор браузера: набранный пробел он часто ставит неразрывным, а
 * неразрывный рядом с местом правки сам делает обычным. Сравниваем изменённый
 * кусок (между общим началом и общим концом «было» и «стало»): отличается только
 * видом пробела — правки нет; иначе набранные неразрывные — обычные, а
 * неразрывный на краю куска, который был в тексте (после предлога), остаётся.
 */
export function typedSpaces(before: string, after: string, nbsp: '&nbsp;' | '\u00a0'): string {
  const max = Math.min(before.length, after.length);
  let start = 0;
  while (start < max && before[start] === after[start]) start++;
  let tail = 0;
  while (tail < max - start && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
  let end = after.length - tail;
  if (nbsp === '&nbsp;') {
    // границы не режут сущность пополам
    const amp = after.lastIndexOf('&', start - 1);
    if (amp >= 0 && after.indexOf(';', amp) >= start) start = amp;
    const last = after.lastIndexOf('&', end - 1);
    if (last >= start && after.indexOf(';', last) >= end) end = after.indexOf(';', last) + 1;
  }
  const plain = (s: string) => s.split(nbsp).join(' ');
  const was = before.slice(start, before.length - (after.length - end));
  if (plain(was) === plain(after.slice(start, end))) return before;
  let typed = plain(after.slice(start, end));
  if (was.startsWith(nbsp) && typed.startsWith(' ')) typed = nbsp + typed.slice(1);
  if (was.endsWith(nbsp) && typed.endsWith(' ')) typed = typed.slice(0, -1) + nbsp;
  return after.slice(0, start) + typed + after.slice(end);
}

/** Набранное: без пробелов по краям; пара «пробел + неразрывный» от редактора браузера — обычный пробел. */
function cleanInner(html: string): string {
  return html
    .replace(/&nbsp; | &nbsp;/g, ' ')
    .replace(/(<br>|&nbsp;|\s)+$/, '')
    .replace(/^(&nbsp;|\s)+/, '');
}

/** То же для поля без разметки. */
const cleanText = (t: string) => t.replace(/\u00a0 | \u00a0/g, ' ').trim();

const STYLE = `
html.mtpk-live [data-mtpk="can"]{outline:1.5px dashed rgba(13,110,140,.7);outline-offset:3px;cursor:text}
html.mtpk-live [data-mtpk="edit"]{outline:2px solid #0d6e8c;outline-offset:3px;box-shadow:0 0 0 7px rgba(13,110,140,.14);cursor:text}
html.mtpk-live img[data-mtpk="can"],html.mtpk-live svg[data-mtpk="can"]{cursor:pointer}
html.mtpk-live [data-mtpk="pick"]{outline:2px solid #0d6e8c;outline-offset:-2px}
.mtpk-tip{position:fixed;z-index:2147483647;max-width:340px;padding:9px 12px;border-radius:10px;background:#0f172a;color:#fff;font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(15,23,42,.3);pointer-events:none}
.mtpk-pop{position:fixed;z-index:2147483647;display:flex;gap:4px;padding:5px;border-radius:12px;background:#0f172a;box-shadow:0 10px 30px rgba(15,23,42,.35);font:13px/1 system-ui,-apple-system,"Segoe UI",sans-serif}
.mtpk-pop button{all:unset;cursor:pointer;padding:9px 12px;border-radius:8px;color:#fff;background:#0d6e8c;font-weight:600}
.mtpk-pop button:hover{background:#0b5d77}
.mtpk-pop button.mtpk-pop__cancel{background:transparent;color:#cbd5e1;font-weight:400}
.mtpk-pop button.mtpk-pop__cancel:hover{background:rgba(255,255,255,.08)}
.mtpk-frame{position:absolute;z-index:2147483600;display:none;pointer-events:none;outline:2px solid rgba(13,110,140,.6);outline-offset:-2px}
.mtpk-frame.is-shared{outline:2px dashed rgba(100,116,139,.7)}
.mtpk-tools{position:absolute;z-index:2147483601;display:none;align-items:center;gap:1px;padding:3px;border-radius:9px;background:#0d6e8c;color:#fff;box-shadow:0 6px 18px rgba(15,23,42,.28);font:600 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:0;text-transform:none}
.mtpk-tools.is-shared{background:#64748b}
.mtpk-tools__label{padding:0 8px 0 6px;white-space:nowrap}
.mtpk-tools button{all:unset;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;color:#fff;cursor:pointer}
.mtpk-tools button:hover{background:rgba(255,255,255,.2)}
.mtpk-tools button[data-act="remove"]:hover{background:#dc2626}
.mtpk-tools svg,.mtpk-plus svg{display:block}
.mtpk-plus{all:unset;position:absolute;z-index:2147483601;display:none;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#0d6e8c;color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,.3);transition:transform .15s}
.mtpk-plus:hover{transform:scale(1.15);background:#0b5d77}
.mtpk-end{all:unset;display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;width:calc(100% - 48px);margin:24px;padding:18px;border:2px dashed #94a3b8;border-radius:12px;color:#475569;font:600 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer}
.mtpk-end:hover{border-color:#0d6e8c;color:#0d6e8c;background:rgba(13,110,140,.05)}
[data-mtpk-flash]{animation:mtpk-flash 1.8s ease-out}
@keyframes mtpk-flash{0%,30%{outline:3px solid #4fab3a;outline-offset:-3px}100%{outline:3px solid transparent;outline-offset:-3px}}
`;

/** Блок верхнего уровня под элементом: его метка и комментарий-метка (ребёнок <main>). */
function topBlock(el: Element): { mark: string; marker: Comment } | null {
  let e: Element | null = el;
  while (e?.parentElement && e.parentElement.tagName !== 'MAIN') e = e.parentElement;
  if (!e || e.parentElement?.tagName !== 'MAIN') return null;
  for (let s = e.previousSibling; s; s = s.previousSibling) {
    const m = s.nodeType === 8 ? /^mtpk:([\w.]+)$/.exec((s as Comment).data) : null;
    if (m) return { mark: m[1], marker: s as Comment };
  }
  return null;
}

/** Где на странице блок: общий прямоугольник его элементов (невидимые — мимо). */
function blockRect(marker: Comment): { x: number; y: number; w: number; h: number } | null {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of blockElements(marker)) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return top === Infinity ? null : { x: left, y: top, w: right - left, h: bottom - top };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Части содержимого по меткам верхнего уровня: метка и HTML блока (для сравнения). */
function parts(html: string): { key: string; html: string }[] {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const out: { key: string; html: string }[] = [];
  for (const n of tpl.content.childNodes) {
    const m = n.nodeType === 8 ? /^mtpk:([\w.]+)$/.exec((n as Comment).data) : null;
    if (m || !out.length) out.push({ key: m?.[1] ?? '', html: '' });
    if (!m) out[out.length - 1].html += n.nodeType === 1 ? (n as Element).outerHTML : n.nodeType === 3 ? esc(n.textContent ?? '') : `<!--${(n as Comment).data}-->`;
  }
  return out;
}

/**
 * Обновить содержимое предпросмотра: заменить только изменившиеся блоки — у
 * остальных не перезагружаются картинки и стили, ничего не мигает. Другой
 * набор блоков — всё содержимое целиком.
 */
export function patchMain(main: Element, before: string, after: string): void {
  const a = parts(before);
  const b = parts(after);
  const groups: Node[][] = [];
  for (const n of [...main.childNodes]) {
    const isMark = n.nodeType === 8 && /^mtpk:/.test((n as Comment).data);
    if (isMark || !groups.length) groups.push([]);
    groups[groups.length - 1].push(n);
  }
  if (a.length !== b.length || groups.length !== b.length || a.some((p, i) => p.key !== b[i].key)) {
    main.innerHTML = after;
    return;
  }
  const range = main.ownerDocument.createRange();
  range.selectNodeContents(main);
  b.forEach((p, i) => {
    if (p.html === a[i].html) return;
    const [first, ...rest] = groups[i];
    const marker = first.nodeType === 8 ? first : null;
    for (const n of marker ? rest : groups[i]) n.parentNode?.removeChild(n);
    const frag = range.createContextualFragment(p.html);
    if (marker) marker.parentNode?.insertBefore(frag, marker.nextSibling);
    else main.insertBefore(frag, main.firstChild);
  });
}

/** Подключить правку к документу предпросмотра. Возвращает отключение. */
export function attachPreviewEditor(doc: Document, opts: PreviewEditorOptions): PreviewEditor {
  const win = doc.defaultView;
  if (!win) return { detach: () => {}, refresh: () => {}, reveal: () => {} };
  const style = doc.createElement('style');
  style.textContent = STYLE;
  doc.head.append(style);
  doc.documentElement.classList.add('mtpk-live');

  let hover: Element | null = null;
  let active: { el: HTMLElement; plan: Extract<Plan, { ok: true }>; original: string; originalText: string } | null = null;
  let tipEl: HTMLElement | null = null;
  let tipTimer: ReturnType<typeof setTimeout> | undefined;
  const verdicts = new WeakMap<Element, Plan>();
  const verdict = (el: Element) => {
    let v = verdicts.get(el);
    if (!v) verdicts.set(el, (v = plan(el, opts.getBlocks())));
    return v;
  };

  const setHover = (el: Element | null) => {
    if (hover === el) return;
    if (hover && hover.getAttribute('data-mtpk') === 'can') hover.removeAttribute('data-mtpk');
    hover = el;
    if (el && !active) el.setAttribute('data-mtpk', 'can');
  };

  const tip = (text: string, x: number, y: number) => {
    tipEl?.remove();
    clearTimeout(tipTimer);
    tipEl = doc.createElement('div');
    tipEl.className = 'mtpk-tip';
    tipEl.textContent = text;
    doc.body.append(tipEl);
    const w = tipEl.offsetWidth;
    tipEl.style.left = `${Math.max(8, Math.min(x - w / 2, win.innerWidth - w - 8))}px`;
    tipEl.style.top = `${y + 18 + tipEl.offsetHeight > win.innerHeight ? y - tipEl.offsetHeight - 12 : y + 18}px`;
    tipTimer = setTimeout(() => tipEl?.remove(), 4000);
  };

  const caretAt = (x: number, y: number): Range | null => {
    const d = doc as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
    if (d.caretPositionFromPoint) {
      const p = d.caretPositionFromPoint(x, y);
      if (!p) return null;
      const r = doc.createRange();
      r.setStart(p.offsetNode, p.offset);
      r.collapse(true);
      return r;
    }
    return d.caretRangeFromPoint?.(x, y) ?? null;
  };

  const finish = (save: boolean) => {
    if (!active) return;
    const { el, plan: p, original, originalText } = active;
    active = null;
    el.removeEventListener('blur', onBlur);
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-mtpk');
    let changed = false;
    if (save) {
      const inner = cleanInner(typedSpaces(original, el.innerHTML, '&nbsp;'));
      if (inner !== cleanInner(original)) {
        const next = p.apply(inner, typedSpaces(originalText, el.textContent ?? '', '\u00a0'), opts.getBlocks());
        if (next) {
          opts.onUpdate({ blocks: next });
          changed = true;
        } else {
          el.innerHTML = original;
          const r = el.getBoundingClientRect();
          tip(REASONS.changed, r.left + r.width / 2, r.top);
        }
      }
    } else el.innerHTML = original;
    opts.onEditing(false, changed);
  };
  const onBlur = () => finish(true);

  const start = (el: Element, p: Extract<Plan, { ok: true }>, x: number, y: number) => {
    const h = el as HTMLElement;
    setHover(null);
    active = { el: h, plan: p, original: h.innerHTML, originalText: h.textContent ?? '' };
    h.setAttribute('data-mtpk', 'edit');
    try {
      h.contentEditable = 'plaintext-only';
    } catch {
      h.contentEditable = 'true';
    }
    h.focus();
    const range = caretAt(x, y);
    if (range && h.contains(range.startContainer)) {
      const sel = doc.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    h.addEventListener('blur', onBlur);
    hideBlock();
    opts.onEditing(true, false);
  };

  // замена картинки: меню у точки щелчка, картинка (или элемент с фоном) обведена
  let pop: HTMLElement | null = null;
  let popAction: (() => void) | null = null;
  let picked: Element | null = null;
  const closePop = () => {
    pop?.remove();
    pop = null;
    popAction = null;
    if (picked?.getAttribute('data-mtpk') === 'pick') picked.removeAttribute('data-mtpk');
    picked = null;
  };
  const showPop = (el: Element, label: string, action: () => void, x: number, y: number) => {
    closePop();
    picked = el;
    el.setAttribute('data-mtpk', 'pick');
    pop = doc.createElement('div');
    pop.className = 'mtpk-pop';
    const go = doc.createElement('button');
    go.type = 'button';
    go.textContent = label;
    const cancel = doc.createElement('button');
    cancel.type = 'button';
    cancel.className = 'mtpk-pop__cancel';
    cancel.textContent = 'Отмена';
    pop.append(go, cancel);
    doc.body.append(pop);
    pop.style.left = `${Math.max(8, Math.min(x - pop.offsetWidth / 2, win.innerWidth - pop.offsetWidth - 8))}px`;
    pop.style.top = `${y + 12 + pop.offsetHeight > win.innerHeight ? y - pop.offsetHeight - 12 : y + 12}px`;
    popAction = action;
  };
  const pickImage = (hit: ImageHit, p: Extract<ImagePlan, { ok: true }>, x: number, y: number) =>
    showPop(
      hit.el,
      `Заменить ${p.what}…`,
      () =>
        opts.onPick({
          what: p.what,
          current: p.current,
          choose: (url) => {
            const patch = p.apply(url, opts.getBlocks(), opts.getStyles());
            if (patch) opts.onUpdate(patch);
            else tip(REASONS.changed, x, y);
          },
        }),
      x,
      y,
    );
  const pickIcon = (svg: Element, p: Extract<IconPlan, { ok: true }>, x: number, y: number) => {
    const put = (next: string) => {
      const blocks = p.apply(next, opts.getBlocks());
      if (blocks) opts.onUpdate({ blocks });
      else tip(REASONS.changed, x, y);
    };
    showPop(svg, 'Иконка и цвет…', () => opts.onIcon?.({ current: p.current, choose: put, remove: () => put('') }), x, y);
  };
  const images = new WeakMap<Element, ImagePlan>();
  const icons = new WeakMap<Element, IconPlan>();
  const iconVerdict = (svg: Element) => {
    let v = icons.get(svg);
    if (!v) icons.set(svg, (v = iconPlan(svg, opts.getBlocks())));
    return v;
  };
  const imageVerdict = (img: Element) => {
    let v = images.get(img);
    if (!v) images.set(img, (v = imagePlan({ kind: 'img', el: img, src: img.getAttribute('src') ?? '' }, opts.getBlocks())));
    return v;
  };

  // рамка блока, его панель и «+» сверху и снизу — в теле документа, вне <main>
  const builder = Boolean(opts.onBlockAction && opts.onInsert);
  const frame = doc.createElement('div');
  frame.className = 'mtpk-frame';
  const tools = doc.createElement('div');
  tools.className = 'mtpk-tools';
  const plusBefore = doc.createElement('button');
  const plusAfter = doc.createElement('button');
  for (const [b, at] of [
    [plusBefore, 'before'],
    [plusAfter, 'after'],
  ] as const) {
    b.type = 'button';
    b.className = 'mtpk-plus';
    b.dataset.at = at;
    b.title = at === 'before' ? 'Добавить блок над этим' : 'Добавить блок под этим';
    b.innerHTML = iconSvg('plus', 16);
  }
  const endBtn = doc.createElement('button');
  endBtn.type = 'button';
  endBtn.className = 'mtpk-end';
  endBtn.innerHTML = `${iconSvg('add', 18)}<span>Добавить блок в конец страницы</span>`;
  if (builder) doc.body.append(frame, tools, plusBefore, plusAfter, endBtn);
  let shown: { index: number; shared: boolean } | null = null;
  const hideBlock = () => {
    shown = null;
    for (const el of [frame, tools, plusBefore, plusAfter]) el.style.display = 'none';
  };
  const showBlock = (b: { mark: string; marker: Comment }) => {
    const r = blockRect(b.marker);
    const shared = b.mark === 'shared';
    const index = shared ? -1 : Number(b.mark);
    if (!r || (!shared && Number.isNaN(index))) return hideBlock();
    if (shown && shown.index === index && shown.shared === shared && frame.style.display === 'block') return;
    shown = { index, shared };
    const x = r.x + win.scrollX;
    const y = r.y + win.scrollY;
    Object.assign(frame.style, { display: 'block', left: `${x}px`, top: `${y}px`, width: `${r.w}px`, height: `${r.h}px` });
    frame.classList.toggle('is-shared', shared);
    tools.classList.toggle('is-shared', shared);
    tools.innerHTML = shared
      ? '<span class="mtpk-tools__label">Общий блок категории — меняется в каталоге</span>'
      : `<span class="mtpk-tools__label">${(opts.labelOf?.(index) ?? 'Блок').replace(/</g, '&lt;')}</span>` +
        ([
          ['up', 'up', 'Выше'],
          ['down', 'down', 'Ниже'],
          ['copy', 'copy', 'Копия блока'],
          ['remove', 'trash', 'Удалить блок'],
          ['settings', 'settings', 'Настроить слева'],
        ] as const)
          .map(([act, icon, title]) => `<button type="button" data-act="${act}" title="${title}" aria-label="${title}">${iconSvg(icon, 16)}</button>`)
          .join('');
    tools.style.display = 'flex';
    const tw = tools.offsetWidth;
    tools.style.left = `${Math.max(x + 8, x + r.w - tw - 10)}px`;
    tools.style.top = `${Math.max(win.scrollY + 6, y + 10)}px`;
    for (const [b, top] of [
      [plusBefore, y - 14],
      [plusAfter, y + r.h - 14],
    ] as const) {
      Object.assign(b.style, { display: shared ? 'none' : 'flex', left: `${x + r.w / 2 - 14}px`, top: `${Math.max(0, top)}px` });
    }
  };

  /** Текст под точкой: сам элемент под мышью или — если поверх лежит слой без текста (декор, затемнение) — текст под ним. */
  const textAt = (t: Element, x: number, y: number): Element | null => {
    const own = textElement(t);
    if (own || t.closest('.mtpk-tools, .mtpk-plus, .mtpk-end, .mtpk-pop')) return own;
    for (const el of doc.elementsFromPoint(x, y)) {
      if (el === t || !el.closest('main')) continue;
      const found = textElement(el);
      if (found) return found;
    }
    return null;
  };

  const onOver = (e: Event) => {
    const target = e.target as Element;
    if (builder && !active && target.nodeType === 1 && !target.closest('.mtpk-tools, .mtpk-plus, .mtpk-end')) {
      const b = topBlock(target);
      if (b) showBlock(b);
      else if (!target.closest('main')) hideBlock();
    }
    if (active) return;
    const t = e.target as Element;
    const el = t.nodeType === 1 ? textAt(t, (e as MouseEvent).clientX, (e as MouseEvent).clientY) : null;
    if (el) return setHover(verdict(el).ok ? el : null);
    const svg = opts.onIcon && t.nodeType === 1 && t.closest('main') ? iconOf(t) : null;
    if (svg) return setHover(iconVerdict(svg).ok ? svg : null);
    setHover(t.tagName === 'IMG' && t.closest('main') && imageVerdict(t).ok ? t : null);
  };
  const onLeave = () => {
    setHover(null);
    hideBlock();
  };
  const onClick = (e: MouseEvent) => {
    const t = e.target as Element;
    if (t.nodeType !== 1) return;
    if (t.closest('.mtpk-pop')) {
      e.preventDefault();
      const act = t.closest('button') && !t.closest('.mtpk-pop__cancel') ? popAction : null;
      closePop();
      act?.();
      return;
    }
    closePop();
    const plus = t.closest<HTMLElement>('.mtpk-plus');
    const act = t.closest<HTMLElement>('.mtpk-tools button')?.dataset.act as BlockAction | undefined;
    if (t.closest('.mtpk-end')) {
      e.preventDefault();
      return opts.onInsert?.(opts.getBlocks().length);
    }
    if ((plus || act) && shown && !shown.shared) {
      e.preventDefault();
      const index = shown.index;
      if (plus) opts.onInsert?.(plus.dataset.at === 'after' ? index + 1 : index);
      else if (act) opts.onBlockAction?.(index, act);
      hideBlock();
      return;
    }
    if (t.closest('.mtpk-tools')) return;
    // по ссылкам в предпросмотре не переходим
    if (t.closest('a[href]')) e.preventDefault();
    if (active && active.el.contains(t)) return;
    if (active) finish(true);
    const el = textAt(t, e.clientX, e.clientY);
    if (!el) {
      // не текст — иконка: окно «Иконка и цвет»
      const svg = opts.onIcon ? iconAt(doc, e.clientX, e.clientY) : null;
      const icp = svg ? iconPlan(svg, opts.getBlocks()) : null;
      if (svg && icp?.ok) {
        tipEl?.remove();
        setHover(null);
        pickIcon(svg, icp, e.clientX, e.clientY);
        return;
      }
      // картинка или фон под точкой: предложить замену
      const hit = imageAt(doc, e.clientX, e.clientY);
      if (!hit) {
        if (icp && !icp.ok) tip(icp.reason, e.clientX, e.clientY);
        return;
      }
      const ip = imagePlan(hit, opts.getBlocks());
      if (!ip.ok) tip(ip.reason, e.clientX, e.clientY);
      else {
        tipEl?.remove();
        setHover(null);
        pickImage(hit, ip, e.clientX, e.clientY);
      }
      return;
    }
    const p = plan(el, opts.getBlocks());
    if (!p.ok) {
      tip(p.reason, e.clientX, e.clientY);
      return;
    }
    tipEl?.remove();
    start(el, p, e.clientX, e.clientY);
  };
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      finish(true);
      // черновик обновится после перерисовки — сохраняем следом
      setTimeout(opts.onSave, 60);
      return;
    }
    if (pop && e.key === 'Escape') return closePop();
    if (!active) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      active.el.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  };
  const stop = (e: Event) => e.preventDefault();

  doc.addEventListener('mouseover', onOver);
  doc.documentElement.addEventListener('mouseleave', onLeave);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('auxclick', stop, true);
  doc.addEventListener('submit', stop, true);
  doc.addEventListener('dragstart', stop, true);
  doc.addEventListener('drop', stop, true);
  doc.addEventListener('keydown', onKey, true);
  const reveal = (index: number) => {
    const marker = [...(doc.querySelector('main')?.childNodes ?? [])].find((n) => n.nodeType === 8 && (n as Comment).data === `mtpk:${index}`) as Comment | undefined;
    const el = marker ? blockElements(marker).find((x) => x.getBoundingClientRect().height > 0) : undefined;
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.setAttribute('data-mtpk-flash', '');
    setTimeout(() => el.removeAttribute('data-mtpk-flash'), 1900);
  };
  const detach = () => {
    finish(true);
    closePop();
    setHover(null);
    hideBlock();
    for (const el of [frame, tools, plusBefore, plusAfter, endBtn]) el.remove();
    tipEl?.remove();
    clearTimeout(tipTimer);
    doc.removeEventListener('mouseover', onOver);
    doc.documentElement.removeEventListener('mouseleave', onLeave);
    doc.removeEventListener('click', onClick, true);
    doc.removeEventListener('auxclick', stop, true);
    doc.removeEventListener('submit', stop, true);
    doc.removeEventListener('dragstart', stop, true);
    doc.removeEventListener('drop', stop, true);
    doc.removeEventListener('keydown', onKey, true);
    style.remove();
    doc.documentElement.classList.remove('mtpk-live');
  };
  return { detach, refresh: hideBlock, reveal };
}
