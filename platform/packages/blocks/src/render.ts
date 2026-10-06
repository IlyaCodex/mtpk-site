import { renderToStaticMarkup } from 'react-dom/server';
import { splitSegments, stripHtmlComments } from '@mtpk/content-kit';
import { BLOCKS, type BlockContext } from './registry.tsx';

const cache = new Map<string, string>();

/** HTML блока по имени маркера (результат кешируется: блоки статичны). */
export function renderBlock(name: string, ctx: BlockContext): string {
  const factory = BLOCKS[name];
  if (!factory) return ''; // неизвестный маркер — как в Astro, ничего не выводим
  const key = `${name}|${ctx.hasLeadgenBlock ? 1 : 0}`;
  let html = cache.get(key);
  if (html === undefined) {
    html = renderToStaticMarkup(factory(ctx));
    cache.set(key, html);
  }
  return html;
}

/**
 * Тело страницы → готовый HTML для <main>: комментарии разработчиков
 * вырезаются, маркеры <!--C:имя--> заменяются отрисованными блоками.
 */
export function renderPageBody(rawBody: string): string {
  const ctx: BlockContext = {
    hasLeadgenBlock: rawBody.includes('<!--C:leadgen-->') || rawBody.includes('id="leadgen"'),
  };
  const body = stripHtmlComments(rawBody, { keepBlockMarkers: true });
  return splitSegments(body)
    .map((seg) => (seg.type === 'html' ? seg.content : renderBlock(seg.name, ctx)))
    .join('');
}
