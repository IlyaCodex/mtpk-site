'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from './icons';
import { MediaInput } from './media';
import { ItemActions } from './schema-form';
import { fromHtml, TextInput } from './text-fields';
import { cx } from './ui';

/**
 * «Поля» секции, перенесённой со старого сайта как HTML: тексты (заголовки,
 * абзацы, подписи, кнопки), ссылки и картинки показываются подписанными
 * полями, повторяющиеся элементы (карточки, пункты, строки таблиц) — списком
 * с дублированием, перестановкой и удалением. Источник — сам HTML: правка
 * поля меняет только свой кусок разметки, остальное не трогается.
 */

/** Строчные элементы: внутри «текста» допустимы только они. */
const INLINE = new Set(['em', 'strong', 'b', 'i', 'u', 's', 'br', 'span', 'small', 'sup', 'sub', 'mark', 'abbr', 'a', 'code', 'nobr', 'wbr', 'time']);
/** Что не показываем: служебное, формы заявок (стандартные), иконки. */
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'template', 'input', 'select', 'textarea', 'option', 'dialog', 'iframe', 'video', 'source', 'picture']);
const SKIP_CLASSES = ['breadcrumbs', 'js-form-status', 'hp-field', 'visually-hidden', 'sr-only'];

/** Смысл элемента по окончанию класса (BEM: cat-card__title → title). */
const ROLES: Record<string, string> = {
  eyebrow: 'Надзаголовок',
  title: 'Заголовок',
  heading: 'Заголовок',
  subtitle: 'Подзаголовок',
  lead: 'Подзаголовок',
  text: 'Текст',
  desc: 'Описание',
  description: 'Описание',
  descr: 'Описание',
  badge: 'Плашка',
  caption: 'Подпись',
  link: 'Ссылка',
  more: 'Ссылка',
  btn: 'Кнопка',
  button: 'Кнопка',
  price: 'Цена',
  num: 'Число',
  number: 'Число',
  value: 'Значение',
  count: 'Число',
  label: 'Подпись',
  note: 'Примечание',
  name: 'Название',
  tag: 'Метка',
  meta: 'Подпись',
  quote: 'Цитата',
  author: 'Автор',
  city: 'Город',
  date: 'Дата',
  sub: 'Пояснение',
  lead2: 'Подзаголовок',
};
const TAG_ROLES: Record<string, string> = {
  h1: 'Главный заголовок (H1)',
  h2: 'Заголовок',
  h3: 'Подзаголовок',
  h4: 'Подзаголовок',
  h5: 'Подзаголовок',
  p: 'Текст',
  li: 'Пункт',
  dt: 'Параметр',
  dd: 'Значение',
  th: 'Заголовок столбца',
  td: 'Ячейка',
  a: 'Ссылка',
  button: 'Кнопка',
  label: 'Подпись',
  figcaption: 'Подпись к фото',
  blockquote: 'Цитата',
};
/** Как называть элементы списка по их классу. */
const ITEM_ROLES: [RegExp, string][] = [
  [/card/, 'Карточка'],
  [/step/, 'Шаг'],
  [/stat|metric|fact/, 'Показатель'],
  [/case|project/, 'Проект'],
  [/review|testimonial/, 'Отзыв'],
  [/region|tag|chip/, 'Метка'],
  [/slide/, 'Слайд'],
  [/feature|benefit|adv|pro/, 'Преимущество'],
  [/item/, 'Элемент'],
];

/** Поля, по которым элемент списка узнают в свёрнутом виде. */
const TITLE_ROLES = new Set(['Главный заголовок (H1)', 'Заголовок', 'Название', 'Подзаголовок']);

const classesOf = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

function roleOf(el: Element): string {
  for (const c of classesOf(el)) {
    const tail = c.split('__').pop()!.split('--')[0].replace(/^s-/, '');
    const key = tail.split('-').pop()!;
    if (ROLES[tail]) return ROLES[tail];
    if (ROLES[key]) return ROLES[key];
  }
  return TAG_ROLES[el.tagName.toLowerCase()] ?? 'Подпись';
}

function itemRole(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === 'li') return 'Пункт';
  if (tag === 'tr') return 'Строка';
  const cls = classesOf(el).join(' ');
  return ITEM_ROLES.find(([re]) => re.test(cls))?.[1] ?? 'Элемент';
}

const skipped = (el: Element) => SKIP_TAGS.has(el.tagName.toLowerCase()) || classesOf(el).some((c) => SKIP_CLASSES.includes(c)) || el.getAttribute('aria-hidden') === 'true';

/** Только строчное содержимое с текстом — редактируется одним полем. */
function isTextContainer(el: Element): boolean {
  if (!el.textContent?.trim()) return false;
  for (const d of el.querySelectorAll('*')) if (!INLINE.has(d.tagName.toLowerCase())) return false;
  return true;
}

/** Списки по смыслу: их элементы — пункты, строки, пары «параметр — значение». */
const LIST_PARENTS = new Set(['ul', 'ol', 'dl', 'tbody', 'thead', 'table']);

/**
 * Повторяющийся элемент (карточка, пункт, строка): у родителя ≥ 2 соседей
 * того же тега и первого класса. Абзацы без класса — просто текст, не список.
 */
function isRepeated(el: Element): boolean {
  const parent = el.parentElement;
  if (!parent) return false;
  if (!classesOf(el).length && !LIST_PARENTS.has(parent.tagName.toLowerCase())) return false;
  const key = `${el.tagName}.${classesOf(el)[0] ?? ''}`;
  let same = 0;
  for (const c of parent.children) if (`${c.tagName}.${classesOf(c)[0] ?? ''}` === key) same++;
  return same >= 2;
}

/** Путь до узла: номера среди childNodes от корня фрагмента. */
type Path = number[];
function pathOf(node: Node, root: Node): Path {
  const path: Path = [];
  for (let n: Node | null = node; n && n !== root; n = n.parentNode) path.unshift([...n.parentNode!.childNodes].indexOf(n as ChildNode));
  return path;
}
function locate(root: Node, path: Path): Node {
  return path.reduce<Node>((n, i) => n.childNodes[i], root);
}

/**
 * Форма заявки в секции — тег <ui-form> (компонент packages/ui/src/forms): её
 * тексты — атрибуты тега. Какие показывать полями и как подписывать.
 */
const FORM_ATTRS: [attr: string, label: string, multiline?: boolean][] = [
  ['title', 'Форма: заголовок'],
  ['task-label', 'Форма: подпись поля задачи'],
  ['task-placeholder', 'Форма: пример в поле задачи', true],
  ['model-label', 'Форма: подпись поля модели'],
  ['model-placeholder', 'Форма: пример модели'],
  ['file', 'Форма: кнопка файла («нет» — без файла)'],
  ['submit', 'Форма: подпись кнопки'],
  ['button', 'Форма: подпись кнопки'],
  ['name', 'Форма: название (источник заявки в CRM)'],
];

type Field =
  | { kind: 'formAttr'; path: Path; label: string; attr: string; value: string; multiline: boolean; item: Path | null }
  | { kind: 'text'; path: Path; label: string; value: string; multiline: boolean; item: Path | null }
  | { kind: 'textNode'; path: Path; label: string; value: string; item: Path | null }
  | { kind: 'href'; path: Path; label: string; value: string; item: Path | null }
  | { kind: 'image'; path: Path; label: string; src: string; alt: string; item: Path | null };

type ItemGroup = { list: Path; items: Path[]; role: string };

function parse(html: string): DocumentFragment {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content;
}
function serialize(frag: DocumentFragment): string {
  const tpl = document.createElement('template');
  tpl.content.append(...[...frag.childNodes].map((n) => n.cloneNode(true)));
  return tpl.innerHTML;
}

/** Поля секции в порядке документа и списки повторяющихся элементов. */
function collect(html: string): { fields: Field[]; groups: Map<string, ItemGroup> } {
  const root = parse(html);
  const fields: Field[] = [];
  const groups = new Map<string, ItemGroup>();
  const itemOf = (el: Element | null): Element | null => {
    for (let e = el; e; e = e.parentElement) if (isRepeated(e)) return e;
    return null;
  };
  const itemPath = (el: Element): Path | null => {
    const item = itemOf(el);
    if (!item) return null;
    const list = pathOf(item.parentElement!, root);
    const key = list.join('.');
    if (!groups.has(key)) {
      const kin = [...item.parentElement!.children].filter((c) => `${c.tagName}.${classesOf(c)[0] ?? ''}` === `${item.tagName}.${classesOf(item)[0] ?? ''}`);
      groups.set(key, { list, items: kin.map((k) => pathOf(k, root)), role: itemRole(item) });
    }
    return pathOf(item, root);
  };

  const walk = (el: Element) => {
    if (skipped(el)) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'ui-form') {
      for (const [attr, label, multiline] of FORM_ATTRS) {
        const value = el.getAttribute(attr);
        if (value !== null && value !== '') fields.push({ kind: 'formAttr', path: pathOf(el, root), label, attr, value, multiline: Boolean(multiline), item: itemPath(el) });
      }
      return;
    }
    if (tag === 'img') {
      fields.push({ kind: 'image', path: pathOf(el, root), label: 'Картинка', src: el.getAttribute('src') ?? '', alt: el.getAttribute('alt') ?? '', item: itemPath(el) });
      return;
    }
    if (tag === 'a' && el.getAttribute('href') !== null && !el.getAttribute('href')!.startsWith('#')) {
      fields.push({ kind: 'href', path: pathOf(el, root), label: isTextContainer(el) ? `${roleOf(el)} — адрес` : 'Ссылка — адрес', value: el.getAttribute('href') ?? '', item: itemPath(el) });
    }
    if (isTextContainer(el)) {
      const text = el.innerHTML.trim();
      fields.push({ kind: 'text', path: pathOf(el, root), label: roleOf(el), value: text, multiline: text.length > 80 || tag === 'p', item: itemPath(el) });
      return;
    }
    for (const n of el.childNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) walk(n as Element);
      else if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) {
        fields.push({ kind: 'textNode', path: pathOf(n, root), label: roleOf(el), value: n.textContent.trim(), item: itemPath(el) });
      }
    }
  };
  for (const n of root.childNodes) if (n.nodeType === Node.ELEMENT_NODE) walk(n as Element);
  return { fields, groups };
}

/** Изменить HTML: найти узел по пути в свежем разборе и поправить его. */
function patch(html: string, path: Path, mutate: (node: Node) => void): string {
  const root = parse(html);
  mutate(locate(root, path));
  return serialize(root);
}

const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function hasHtmlFields(html: string): boolean {
  return typeof document !== 'undefined' && collect(html).fields.length > 0;
}

export function HtmlFieldsEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  // разбор HTML — средствами браузера: поля появляются после монтирования
  // (серверная отрисовка и первая в браузере одинаковы — без ошибки гидратации)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const parsed = useMemo(() => (mounted ? collect(html) : null), [html, mounted]);
  const [open, setOpen] = useState<string | null>(null);
  if (!parsed) return <p className="text-sm text-slate-400">Загружаем поля…</p>;
  const { fields, groups } = parsed;
  if (!fields.length) return <p className="text-sm text-slate-500">В этой секции нет текстов и картинок для правки полями — откройте вкладку «HTML-код».</p>;

  const renderField = (f: Field, i: number) => {
    const key = `${f.kind}:${f.path.join('.')}:${i}`;
    switch (f.kind) {
      case 'formAttr':
        return (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-medium text-brand-700">{f.label}</span>
            <TextInput value={f.value} multiline={f.multiline} onChange={(v) => onChange(patch(html, f.path, (n) => (n as Element).setAttribute(f.attr, fromHtml(v))))} />
          </label>
        );
      case 'text':
        return (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
            <TextInput
              value={f.value}
              multiline={f.multiline}
              onChange={(v) =>
                onChange(
                  patch(html, f.path, (n) => {
                    (n as Element).innerHTML = v;
                  }),
                )
              }
            />
          </label>
        );
      case 'textNode':
        return (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
            <TextInput
              value={f.value}
              onChange={(v) =>
                onChange(
                  patch(html, f.path, (n) => {
                    // пробелы вокруг текста (переносы в вёрстке) сохраняем
                    const old = n.textContent ?? '';
                    const lead = old.match(/^\s*/)![0];
                    const tail = old.match(/\s*$/)![0];
                    const text = v.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    n.textContent = `${lead}${text}${tail}`;
                  }),
                )
              }
            />
          </label>
        );
      case 'href':
        return (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
            <input
              className="field font-mono text-xs"
              value={f.value}
              onChange={(e) => onChange(patch(html, f.path, (n) => (n as Element).setAttribute('href', e.target.value)))}
            />
          </label>
        );
      case 'image':
        return (
          <div key={key} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
              <MediaInput value={f.src} onChange={(v) => onChange(patch(html, f.path, (n) => (n as Element).setAttribute('src', v)))} />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Что на картинке (для поиска и незрячих)</span>
              <input className="field" value={f.alt} onChange={(e) => onChange(patch(html, f.path, (n) => (n as Element).setAttribute('alt', e.target.value)))} />
            </label>
          </div>
        );
    }
  };

  // поля вне списков — по порядку; список — один раз, на месте своего первого поля
  const out: React.ReactNode[] = [];
  const shown = new Set<string>();
  fields.forEach((f, i) => {
    if (!f.item) {
      out.push(renderField(f, i));
      return;
    }
    const listKey = f.item.slice(0, -1).join('.');
    if (shown.has(listKey)) return;
    shown.add(listKey);
    const g = groups.get(listKey)!;
    const itemFields = (item: Path) => fields.map((x, k) => [x, k] as const).filter(([x]) => x.item?.join('.') === item.join('.'));
    out.push(
      <div key={`list:${listKey}`} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {g.role}: {g.items.length}
        </div>
        <div className="space-y-2">
          {g.items.map((item, n) => {
            const own = itemFields(item);
            const itemKey = item.join('.');
            const isOpen = open === itemKey;
            // подпись элемента — его заголовок или название, иначе первый текст
            const texts = own.filter(([x]) => x.kind === 'text' || x.kind === 'textNode').map(([x]) => x as { label: string; value: string });
            const titled = texts.find((x) => TITLE_ROLES.has(x.label)) ?? texts.find((x) => plain(x.value).length > 6) ?? texts[0];
            const title = titled ? plain(titled.value) : `${g.role} ${n + 1}`;
            const parentPath = item.slice(0, -1);
            const move = (to: number) => {
              const target = g.items[to];
              if (!target) return;
              onChange(
                patch(html, parentPath, (list) => {
                  const a = locate(list.getRootNode(), item) as Element;
                  const b = locate(list.getRootNode(), target) as Element;
                  if (to > n) b.after(a);
                  else b.before(a);
                }),
              );
            };
            return (
              <div key={itemKey} className={cx('rounded-lg border bg-white', isOpen ? 'border-brand-200' : 'border-slate-200')}>
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <button type="button" className="min-w-0 flex-1 truncate text-left text-sm text-slate-700" onClick={() => setOpen(isOpen ? null : itemKey)}>
                    <span className="mr-2 inline-flex items-center gap-1 align-middle text-xs text-slate-400">
                      <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} className="h-3.5 w-3.5" />
                      {n + 1}
                    </span>
                    {title}
                  </button>
                  <ItemActions
                    onUp={() => move(n - 1)}
                    onDown={() => move(n + 1)}
                    onRemove={() => onChange(patch(html, item, (el) => (el as Element).remove()))}
                    extra={
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Дублировать"
                        aria-label="Дублировать"
                        onClick={() => onChange(patch(html, item, (el) => (el as Element).after(el.cloneNode(true))))}
                      >
                        <Icon name="copy" className="h-4 w-4" />
                      </button>
                    }
                  />
                </div>
                {isOpen && <div className="space-y-3 border-t border-slate-100 p-3">{own.map(([x, k]) => renderField(x, k))}</div>}
              </div>
            );
          })}
        </div>
      </div>,
    );
  });
  return <div className="space-y-3">{out}</div>;
}

/** Название секции для списка блоков: aria-label, первый заголовок или класс. */
export function sectionTitle(html: string): string {
  const open = html.match(/^\s*<([a-z0-9-]+)([^>]*)>/i);
  if (open?.[1].toLowerCase() === 'script') return 'Служебный код (на странице не виден)';
  const aria = open?.[2].match(/aria-label="([^"]+)"/)?.[1];
  if (aria) return plain(aria);
  const heading = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1];
  if (heading) return plain(heading).slice(0, 90);
  const cls = open?.[2].match(/class="([^"]+)"/)?.[1]?.split(/\s+/)[0];
  return cls ? `Секция «${cls}»` : 'Секция';
}
