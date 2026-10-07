import { parseFragment, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';
import { createElement, type ElementType, type ReactElement } from 'react';
import { parseElement, toProps } from './attrs.ts';

type Node = DefaultTreeAdapterMap['node'];
const isElement = (n: Node): n is DefaultTreeAdapterMap['element'] => 'tagName' in n;
const textOf = (n: Node) => (n.nodeName === '#text' ? (n as DefaultTreeAdapterMap['textNode']).value : '');

/**
 * HTML из нескольких элементов подряд — текст из редактора: абзацы, списки,
 * подзаголовки, таблицы. Каждый элемент выводится как есть (RawElement),
 * текст между ними — текстом. Один элемент — ровно как RawElement.
 */
export function RawFragment({ html }: { html: string }): ReactElement | null {
  const nodes = parseFragment(html).childNodes as Node[];
  const elements = nodes.filter(isElement);
  const loose = nodes.some((n) => !isElement(n) && textOf(n).trim());
  if (elements.length === 1 && !loose) return <RawElement html={html} />;
  return (
    <>
      {nodes.map((n, i) => (isElement(n) ? <RawElement key={i} html={serializeOuter(n)} /> : textOf(n).trim() ? textOf(n) : null))}
    </>
  );
}

/**
 * Элемент, заданный HTML целиком (блок «HTML как есть», иконка SVG):
 * внешний тег с атрибутами — React-элемент, содержимое — как есть.
 * Обёрток не добавляет, поэтому DOM совпадает с исходным HTML.
 */
export function RawElement({ html }: { html: string }): ReactElement | null {
  const el = parseElement(html);
  if (!el) return null;
  const props = toProps(el.attrs, el.tag);
  // Содержимое — сырой HTML: браузер может нормализовать его иначе, чем строку
  // на сервере, и сверять его при гидратации бессмысленно.
  props.suppressHydrationWarning = true;
  if (el.inner === '' && el.tag.toLowerCase() !== 'script' && el.tag.toLowerCase() !== 'style') {
    return createElement(el.tag, props);
  }
  return createElement(el.tag, { ...props, dangerouslySetInnerHTML: { __html: el.inner } });
}

type InlineProps = {
  /** Тег-обёртка (h1, span, p…) */
  as?: ElementType;
  /** Строка с простой разметкой (em, strong, a, br, &nbsp;) */
  html: string;
  className?: string;
} & Record<string, unknown>;

/** Текст с простой разметкой внутри заданного тега. */
export function Inline({ as: Tag = 'span', html, ...rest }: InlineProps): ReactElement {
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Дополнительные атрибуты блока (data-*, aria-*…) — в пропсы React. */
export function extra(attrs: Record<string, string> | undefined, tag = ''): Record<string, unknown> {
  return toProps(attrs, tag);
}
