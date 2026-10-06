/**
 * Серверный рендер блоков в HTML-строку (react-dom/server). Используется
 * вне Next.js: контент-сервисом (JSON-LD, текст для поиска, индекс сравнения
 * из той же разметки, что видит посетитель) и импортёром (проверка, что блок
 * из данных отрисовывается в исходную разметку).
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Block } from '@mtpk/content-model';
import { Blocks, BlockView } from './blocks/BlockRenderer.tsx';
import { EMPTY_CONTEXT, type RenderContext } from './context.ts';

export function renderBlocksToHtml(blocks: Block[], ctx: Partial<RenderContext> = {}): string {
  return renderToStaticMarkup(createElement(Blocks, { blocks, ctx: { ...EMPTY_CONTEXT, ...ctx } }));
}

export function renderBlockToHtml(block: Block, ctx: Partial<RenderContext> = {}): string {
  return renderToStaticMarkup(createElement(BlockView, { block, ctx: { ...EMPTY_CONTEXT, ...ctx } }));
}
