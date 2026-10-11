import assert from 'node:assert/strict';
import { test } from 'node:test';
import { annotateDocument, docMeta, setDocMeta } from './doc-edit.ts';

const DOC = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Плавка &amp; литьё</title>
<meta name="description" content="Старое описание"><meta property="og:title" content="Плавка"><script>var a = "<p>x</p>";</script></head>
<body><P class=lead>Привет, <b>мир</b>!</p><ul><li>один<li>два</ul><img src="/img/a.png" alt="A"><ui-form type="short"></ui-form></body></html>`;

/** Атрибут data-mtpk-src элемента (по началу его открывающего тега в размеченном документе). */
const range = (marked: string, tagStart: string, attrName = 'data-mtpk-src') => {
  const at = marked.indexOf(tagStart);
  const m = new RegExp(`${attrName}="(\\d+):(\\d+)"`).exec(marked.slice(at));
  assert.ok(m, `нет ${attrName} у ${tagStart}`);
  return [Number(m[1]), Number(m[2])] as const;
};

test('annotateDocument: содержимое элемента — ровно кусок исходника между тегами', () => {
  const marked = annotateDocument(DOC);
  const [a, b] = range(marked, '<P');
  assert.equal(DOC.slice(a, b), 'Привет, <b>мир</b>!');
  const [c, d] = range(marked, '<b data-mtpk');
  assert.equal(DOC.slice(c, d), 'мир');
  // картинка — весь открывающий тег
  const [e, f] = range(marked, '<img', 'data-mtpk-tag');
  assert.equal(DOC.slice(e, f), '<img src="/img/a.png" alt="A">');
  // без закрывающего тега, в <head>, в скрипте и в форме — без пометок
  assert.ok(!/<li data-mtpk/.test(marked));
  assert.ok(!/<title data-mtpk/.test(marked));
  assert.ok(marked.includes('var a = "<p>x</p>";'));
  assert.ok(marked.includes('<ui-form type="short">'));
  // кроме вставленных атрибутов документ не изменился
  assert.equal(marked.replace(/ data-mtpk-(?:src|tag)="\d+:\d+"/g, ''), DOC);
});

test('docMeta: заголовок, описание и noindex из <head>', () => {
  assert.deepEqual(docMeta(DOC), { title: 'Плавка & литьё', description: 'Старое описание', noindex: false });
});

test('setDocMeta: title, description, og:title и robots — в <head>, остальное без изменений', () => {
  const next = setDocMeta(DOC, { title: 'Новый «заголовок» & co', description: 'Новое "описание"', noindex: true });
  assert.deepEqual(docMeta(next), { title: 'Новый «заголовок» & co', description: 'Новое "описание"', noindex: true });
  assert.ok(next.includes('<title>Новый «заголовок» &amp; co</title>'));
  assert.ok(next.includes('<meta property="og:title" content="Новый «заголовок» &amp; co">'));
  assert.ok(next.includes('<meta name="robots" content="noindex, follow">'));
  assert.equal(next.slice(next.indexOf('<body>')), DOC.slice(DOC.indexOf('<body>')));
  // снять noindex — robots уходит
  const back = setDocMeta(next, { title: 'Плавка', description: 'Старое описание', noindex: false });
  assert.equal(docMeta(back).noindex, false);
  assert.ok(!back.includes('name="robots"'));
});

test('setDocMeta: нет описания — добавляется после title', () => {
  const doc = '<html><head><title>T</title></head><body></body></html>';
  const next = setDocMeta(doc, { title: 'T', description: 'D', noindex: false });
  assert.equal(next, '<html><head><title>T</title><meta name="description" content="D"></head><body></body></html>');
});
