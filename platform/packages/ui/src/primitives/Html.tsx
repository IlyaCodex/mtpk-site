import { createElement, type ElementType, type ReactElement } from 'react';
import { parseElement, toProps } from './attrs.ts';

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
