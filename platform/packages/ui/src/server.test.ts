import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Block } from '@mtpk/content-model';
import { renderBlocksMarked, renderBlocksToHtml } from './server.ts';

const html = (s: string): Block => ({ type: 'html', html: s });

test('метка перед каждым блоком, разметка блоков — как на сайте', () => {
  const blocks = [html('<section class="a"><h2>Заголовок</h2></section>'), html('<p>Абзац</p>')];
  const marked = renderBlocksMarked(blocks, ['0', '1']);
  assert.equal(marked, '<!--mtpk:0--><section class="a"><h2>Заголовок</h2></section><!--mtpk:1--><p>Абзац</p>');
  assert.equal(marked.replace(/<!--mtpk:[\w.]+-->/g, ''), renderBlocksToHtml(blocks));
});

test('блоки контейнера — с номером внутри контейнера', () => {
  const blocks: Block[] = [{ type: 'container', tag: 'div', attrs: { class: 'box' }, children: [html('<p>Один</p>'), html('<p>Два</p>')] }];
  assert.equal(renderBlocksMarked(blocks, ['3']), '<!--mtpk:3--><div class="box"><!--mtpk:3.0--><p>Один</p><!--mtpk:3.1--><p>Два</p></div>');
});

test('блок не из страницы (общий блок категории) — «shared», и его вложенные тоже', () => {
  const blocks: Block[] = [html('<p>Своё</p>'), { type: 'container', tag: 'div', children: [html('<p>Общее</p>')] }];
  assert.equal(renderBlocksMarked(blocks, ['0', null]), '<!--mtpk:0--><p>Своё</p><!--mtpk:shared--><div><!--mtpk:shared--><p>Общее</p></div>');
});

test('блок с полями: метки не меняют его разметку', () => {
  const stats: Block = { type: 'stats', items: [{ label: 'введено', num: '578<small>&nbsp;объектов</small>', text: 'единиц', icon: '' }] };
  const marked = renderBlocksMarked([stats], ['2']);
  assert.ok(marked.startsWith('<!--mtpk:2--><section class="stats"'));
  assert.equal(marked.replace('<!--mtpk:2-->', ''), renderBlocksToHtml([stats]));
});
