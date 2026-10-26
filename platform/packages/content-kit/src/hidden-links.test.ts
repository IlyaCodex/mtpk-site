import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Block } from '@mtpk/content-model';
import { hiddenTest, pruneHiddenHtml, pruneHiddenLinks } from './hidden-links.ts';

const hidden = hiddenTest(['/products/vakuum/', '/products/pechi/tranzistornye/ui-25p/'])!;

const section = (cat: string, all: string, cards: string[]) =>
  `<section class="cat-index" data-cat="${cat}">
  <div class="cat-index__head"><h2 class="cat-index__title">${cat}</h2><a class="cat-index__all" href="${all}">Раздел&nbsp;целиком</a></div>
  <div class="scard-grid">
${cards.map((h) => `    <a class="scard" href="${h}"><div class="scard__cover"><img src="/img/x.jpg" alt=""></div><h3 class="scard__title">${h}</h3></a>`).join('\n')}
  </div>
</section>`;

test('адрес скрыт: сам раздел и всё под ним, с доменом и без слеша', () => {
  assert.ok(hidden('/products/vakuum/'));
  assert.ok(hidden('/products/vakuum/pech-1/'));
  assert.ok(hidden('https://uralinduktor.ru/products/vakuum/pech-1?x=1'));
  assert.ok(hidden('/products/vakuum#top'));
  assert.ok(!hidden('/products/vakuum-2/'));
  assert.ok(!hidden('/products/pechi/tranzistornye/'));
  assert.ok(!hidden('#leadgen'));
  assert.equal(hiddenTest([]), null);
});

test('каталог /products/: раздел скрытой категории убран вместе с пунктом «Категория», у видимой — убрана скрытая карточка', () => {
  const filter = '<select data-cat-select=""><option value="all">Все</option><option value="vakuum">Вакуум</option><option value="pechi">Печи</option></select>';
  const blocks: Block[] = [
    { type: 'html', html: filter },
    { type: 'html', html: section('pechi', '/products/pechi/', ['/products/pechi/tranzistornye/ui-15p/', '/products/pechi/tranzistornye/ui-25p/']) },
    { type: 'html', html: section('vakuum', '/products/vakuum/', ['/products/vakuum/pech-1/']) },
  ];
  const [f, pechi, vakuum] = pruneHiddenLinks(blocks, hidden) as Extract<Block, { type: 'html' }>[];
  assert.equal(f.html, '<select data-cat-select=""><option value="all">Все</option><option value="pechi">Печи</option></select>');
  assert.equal(vakuum.html, '');
  assert.ok(pechi.html.includes('ui-15p'));
  assert.ok(!pechi.html.includes('ui-25p'));
  // остальное — байт в байт: неразрывные пробелы, порядок атрибутов, переносы
  assert.ok(pechi.html.startsWith('<section class="cat-index" data-cat="pechi">\n  <div class="cat-index__head">'));
  assert.ok(pechi.html.includes('Раздел&nbsp;целиком'));
});

test('раздел, где скрыты все карточки, убран и без ссылки «Раздел целиком»', () => {
  const html = section('dop', '/products/dop/', ['/products/vakuum/a/', '/products/vakuum/b/']).replace(/<a class="cat-index__all"[^>]*>.*?<\/a>/, '');
  assert.deepEqual(pruneHiddenHtml(html, hidden), { html: '', removed: ['dop'] });
});

test('списки ссылок, кнопки, ссылки-блоки — убраны; ссылка в тексте — текстом', () => {
  const html =
    '<ul class="spec__links">\n<li><a href="/products/vakuum/">Вакуумные печи</a></li>\n<li><a href="/proekty/">Проекты</a></li>\n</ul>' +
    '<p>Смотрите <a href="/products/vakuum/pech-1/">вакуумную печь</a> и <a href="/uslugi/">услуги</a>.</p>' +
    '<a class="btn btn--primary" href="/products/vakuum/">Перейти</a>' +
    '<a href="/products/vakuum/"><img src="/img/v.jpg" alt=""></a>' +
    '<li><a href="/products/vakuum/">Вакуум</a> — для термообработки</li>';
  const { html: out } = pruneHiddenHtml(html, hidden);
  assert.equal(
    out,
    '<ul class="spec__links">\n\n<li><a href="/proekty/">Проекты</a></li>\n</ul>' +
      '<p>Смотрите вакуумную печь и <a href="/uslugi/">услуги</a>.</p>' +
      '<li>Вакуум — для термообработки</li>',
  );
});

test('поля блоков: дополнительные карточки и кнопки со скрытым адресом убраны; стили и скрипты не трогаем; без скрытых — как было', () => {
  const blocks: Block[] = [
    {
      type: 'catalogCards',
      source: 'none',
      design: 'teaser',
      items: [
        { href: '/products/vakuum/', title: 'Вакуум', alt: '' },
        { href: '/products/pechi/', title: 'Печи', alt: '' },
      ],
      groupLinks: [{ group: 'Г', label: 'Все', href: '/products/vakuum/' }],
    },
    { type: 'style', css: '.x{background:url("/products/vakuum/a.png")} /* <a href="/products/vakuum/"> */' },
  ];
  const [cards, style] = pruneHiddenLinks(blocks, hidden) as [Extract<Block, { type: 'catalogCards' }>, Extract<Block, { type: 'style' }>];
  assert.deepEqual(cards.items?.map((i) => i.href), ['/products/pechi/']);
  assert.deepEqual(cards.groupLinks, []);
  assert.equal(style.css, (blocks[1] as Extract<Block, { type: 'style' }>).css);
  const plain: Block[] = [{ type: 'html', html: '<p><a href="/products/pechi/">Печи</a></p>' }];
  assert.deepEqual(pruneHiddenLinks(plain, hidden), plain);
});
