import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatHtml } from './format-html.ts';

test('блочные элементы — с новой строки и с отступом, строчные — как были', () => {
  const html =
    '<section class="stats" aria-label="Ключевые показатели"><div class="container"><div class="stats__grid">' +
    '<div class="stat"><div class="stat__label">с 2013</div><div class="stat__num">13<small>&nbsp;лет</small></div><div class="stat__text">в&nbsp;металлургии и&nbsp;литейном производстве</div></div>' +
    '</div></div></section>';
  assert.equal(
    formatHtml(html),
    [
      '<section class="stats" aria-label="Ключевые показатели">',
      '  <div class="container">',
      '    <div class="stats__grid">',
      '      <div class="stat">',
      '        <div class="stat__label">с 2013</div>',
      '        <div class="stat__num">13<small>&nbsp;лет</small></div>',
      '        <div class="stat__text">в&nbsp;металлургии и&nbsp;литейном производстве</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</section>',
    ].join('\n'),
  );
});

test('между строчными элементами пробелы не появляются', () => {
  const html = '<p class="lead">Текст <a href="/x/">ссылка</a><span class="arrow">→</span><em>акцент</em></p>';
  assert.equal(formatHtml(html), html);
  const card = '<a class="card" href="/x/"><span class="badge">Новинка</span><div class="card__body"><h3>Название</h3><p>Описание карточки товара подробно</p></div></a>';
  assert.equal(
    formatHtml(card),
    // короткий блок (до 100 символов) — одной строкой
    ['<a class="card" href="/x/">', '  <span class="badge">Новинка</span>', '  <div class="card__body"><h3>Название</h3><p>Описание карточки товара подробно</p></div>', '</a>'].join('\n'),
  );
});

test('код скриптов и SVG — без изменений', () => {
  const script = '<script>\n  // комментарий\n  var a = 1;\n</script>';
  const html = `<div class="wrap"><div class="a">Первый блок с текстом для длины строки больше ста символов</div>${script}</div>`;
  const out = formatHtml(html);
  assert.ok(out.includes(script), out);
});
