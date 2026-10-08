/**
 * Серверный рендер блоков в HTML-строку (react-dom/server). Используется
 * вне Next.js: контент-сервисом (JSON-LD, текст для поиска, индекс сравнения
 * из той же разметки, что видит посетитель) и проверками (сверка разметки
 * блоков до и после правок).
 */
import { parseFragment } from 'parse5';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Block } from '@mtpk/content-model';
import { Blocks, BlockView } from './blocks/BlockRenderer.tsx';
import { EMPTY_CONTEXT, type RenderContext } from './context.ts';
import { FORM_TAG, FormSlot } from './forms/FormSlot.tsx';

export function renderBlocksToHtml(blocks: Block[], ctx: Partial<RenderContext> = {}): string {
  return renderToStaticMarkup(createElement(Blocks, { blocks, ctx: { ...EMPTY_CONTEXT, ...ctx } }));
}

/**
 * Блоки для правки прямо в предпросмотре админки: перед каждым блоком —
 * комментарий <!--mtpk:метка-->. Метка — номер блока на странице («3»), у блоков
 * внутри контейнера — «3.0», «3.1»; null — блок не из самой страницы (общий блок
 * категории под товаром) → «shared». Разметка блоков та же, что на сайте:
 * комментарии на вёрстку не влияют.
 */
export function renderBlocksMarked(blocks: Block[], marks: (string | null)[], ctx: Partial<RenderContext> = {}): string {
  const token = (mark: string | null): Block => ({ type: 'text', text: `@@mtpk:${mark ?? 'shared'}@@` });
  const withTokens = (list: Block[], keys: (string | null)[]): Block[] =>
    list.flatMap((b, i) => {
      const mark = keys[i] ?? null;
      const block = b.type === 'container' ? { ...b, children: withTokens(b.children, b.children.map((_, j) => (mark === null ? null : `${mark}.${j}`))) } : b;
      return [token(mark), block];
    });
  return renderBlocksToHtml(withTokens(blocks, marks), ctx).replace(/@@mtpk:([\w.]+)@@/g, '<!--mtpk:$1-->');
}

export function renderBlockToHtml(block: Block, ctx: Partial<RenderContext> = {}): string {
  return renderToStaticMarkup(createElement(BlockView, { block, ctx: { ...EMPTY_CONTEXT, ...ctx } }));
}

/**
 * Готовый HTML-документ (статья Практикума) с тегами <ui-form>: на их месте —
 * разметка формы-компонента (та же, что на страницах сайта).
 */
export function renderFormSlots(html: string): string {
  if (!html.includes(`<${FORM_TAG}`)) return html;
  return html.replace(/<ui-form\b[^>]*>(?:\s*<\/ui-form>)?/g, (tag) => {
    const el = parseFragment(tag).childNodes[0];
    const attrs = el && 'attrs' in el ? Object.fromEntries(el.attrs.map((a) => [a.name, a.value])) : {};
    return renderToStaticMarkup(createElement(FormSlot, { attrs }));
  });
}
