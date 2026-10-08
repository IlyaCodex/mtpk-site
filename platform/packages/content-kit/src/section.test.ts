import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scopeCss, sectionParts, sectionScript, withSectionAttr } from './section.ts';

const S = '[data-s="ab12"]';

test('селекторы — внутри секции, & и :root — сама секция', () => {
  assert.equal(scopeCss('.title{color:red}', S), `${S} .title{color:red}`);
  assert.equal(scopeCss('&{padding:0} &:hover .x{color:red}', S), `${S}{padding:0} ${S}:hover .x{color:red}`);
  assert.equal(scopeCss(':root{--c:red} body .y{margin:0}', S), `${S}{--c:red} ${S} .y{margin:0}`);
});

test('списки селекторов и запятые в скобках', () => {
  assert.equal(scopeCss('.a, .b > p {x:1}', S), `${S} .a, ${S} .b > p {x:1}`);
  assert.equal(scopeCss(':is(.a, .b) p{x:1}', S), `${S} :is(.a, .b) p{x:1}`);
  assert.equal(scopeCss('a[title="x,y"]{x:1}', S), `${S} a[title="x,y"]{x:1}`);
});

test('@media внутри разбирается, @keyframes и @font-face — как есть', () => {
  assert.equal(scopeCss('@media (max-width: 600px){.a{x:1}}', S), `@media (max-width: 600px){${S} .a{x:1}}`);
  const kf = '@keyframes spin{from{transform:none}to{transform:rotate(1turn)}}';
  assert.equal(scopeCss(kf, S), kf);
  const ff = '@font-face{font-family:X;src:url(/f.woff2)}';
  assert.equal(scopeCss(ff, S), ff);
  assert.equal(scopeCss('@import url("/a.css");.a{x:1}', S), `@import url("/a.css");${S} .a{x:1}`);
});

test('скобки в строках и комментариях не путают разбор', () => {
  const css = '/* .b{} */ .a::before{content:"{"} .c{x:1}';
  assert.equal(scopeCss(css, S), `/* .b{} */ ${S} .a::before{content:"{"} ${S} .c{x:1}`);
});

test('атрибут секции — в первый тег, скрипт — с переменной section', () => {
  assert.equal(withSectionAttr('<section class="x"><p>a</p></section>', 'ab12'), '<section data-s="ab12" class="x"><p>a</p></section>');
  assert.equal(withSectionAttr('<!-- c --><div>a</div>', 'ab12'), '<!-- c --><div data-s="ab12">a</div>');
  const js = sectionScript('section.classList.add("on");', 'ab12');
  assert.ok(js.includes(`document.querySelector<HTMLElement>('[data-s="ab12"]')`) && js.includes('section.classList.add("on");'));
});

test('без метки или пустые — нечего выводить', () => {
  assert.equal(sectionParts({ css: '.a{x:1}' }), null);
  assert.equal(sectionParts({ sid: 'ab12', css: '  ', script: '' }), null);
  assert.equal(sectionParts({ sid: 'плохая', css: '.a{x:1}' }), null);
  assert.deepEqual(sectionParts({ sid: 'ab12', css: '.a{x:1}' }), { sid: 'ab12', css: `${S} .a{x:1}`, script: '' });
});
