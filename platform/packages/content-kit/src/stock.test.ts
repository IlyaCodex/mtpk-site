import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Block } from '@mtpk/content-model';
import type { CatalogData, CatalogProduct } from './catalog.ts';
import { hasStockBlocks, resolveStockBlocks, resolveStockView, stockBySlug, textHtml, type StockItemRow } from './stock.ts';

const product = (over: Partial<CatalogProduct>): CatalogProduct => ({
  id: 1,
  pageId: 100,
  categoryId: 1,
  subcategoryId: 10,
  path: '/products/cat/sub/p1/',
  status: 'published',
  name: 'УИ-0.15Т-160',
  nameNote: null,
  cover: '/img/p1.jpg',
  coverAlt: 'Печь',
  coverAttrs: {},
  badge: 'Сталь / чугун',
  origin: 'Производство Россия',
  caption: null,
  label: null,
  linkText: null,
  warranty: null,
  specs: [{ label: 'Масса плавки', value: '150 кг' }],
  actions: [],
  attrs: {},
  sort: 0,
  listed: true,
  ...over,
});

const catalog: CatalogData = {
  categories: [],
  subcategories: [
    { id: 10, pageId: 10, categoryId: 1, path: '/products/cat/sub/', status: 'published', name: 'Смесители', crumb: 'См', description: '', cover: '/img/s.jpg', coverAlt: '', coverAttrs: {}, sort: 0, listed: true },
  ],
  products: [product({}), product({ id: 2, pageId: 101, path: '/products/cat/sub/draft/', status: 'draft', name: 'Черновик' })],
};

const item = (over: Partial<StockItemRow>): StockItemRow => ({
  groupKey: 'pechi',
  url: '/products/cat/sub/p1/',
  title: null,
  image: null,
  specs: null,
  photos: [],
  qty: null,
  shipping: null,
  ...over,
});

const groups = [
  { key: 'pechi', kind: 'equipment', title: 'Печи', image: null },
  { key: 'smesiteli', kind: 'equipment', title: 'Смесители', image: '/img/type.jpg' },
  { key: 'pusto', kind: 'parts', title: 'Без позиций', image: null },
];

test('позиция без своих полей берёт название, фото, плашку и характеристики из карточки товара', () => {
  const { items } = resolveStockView(groups, [item({ photos: [{ src: '/img/stock/1.jpg', alt: 'На складе' }, 'bad', { src: '' }] })], catalog);
  assert.deepEqual(items[0], {
    group: 'pechi',
    href: '/products/cat/sub/p1/',
    title: 'УИ-0.15Т-160',
    image: { src: '/img/p1.jpg', alt: 'Печь' },
    badge: 'Сталь / чугун',
    origin: 'Производство Россия',
    specs: [{ label: 'Масса плавки', value: '150 кг' }],
    photos: [{ src: '/img/stock/1.jpg', alt: 'На складе' }],
  });
});

test('свои название, фото, характеристики, количество и срок важнее каталога', () => {
  const { items } = resolveStockView(
    groups,
    [item({ title: 'Печь на складе', image: '/img/own.jpg', specs: [['Модель', 'УИ-1'], ['', 'пусто']], qty: 2, shipping: ' от 3 дней ' })],
    catalog,
  );
  assert.equal(items[0].title, 'Печь на&nbsp;складе');
  assert.deepEqual(items[0].image, { src: '/img/own.jpg', alt: 'Печь на складе' });
  assert.deepEqual(items[0].specs, [{ label: 'Модель', value: 'УИ-1' }]);
  assert.equal(items[0].qty, 2);
  assert.equal(items[0].shipping, 'от&nbsp;3 дней');
});

test('ссылка на раздел каталога, на черновик и без ссылки', () => {
  const { items } = resolveStockView(
    groups,
    [item({ groupKey: 'smesiteli', url: '/products/cat/sub' }), item({ url: '/products/cat/sub/draft/' }), item({ url: '', title: 'Индуктор' })],
    catalog,
  );
  assert.equal(items[2].href, '/products/cat/sub/', 'адрес раздела — со слешем');
  assert.equal(items[2].title, 'Смесители');
  assert.deepEqual(items[2].specs, []);
  assert.equal(items[0].href, '', 'черновик — без ссылки');
  assert.equal(items[0].title, 'Черновик');
  assert.equal(items[1].href, '');
  assert.equal(items[1].title, 'Индуктор');
  assert.equal(items[1].image, undefined);
});

test('порядок — по типам, тип без позиций не показывается, фото типа — своё или первой позиции', () => {
  const view = resolveStockView(groups, [item({ groupKey: 'smesiteli', url: '/products/cat/sub/' }), item({}), item({ groupKey: 'nety', title: 'Без типа', url: '' })], catalog);
  assert.deepEqual(
    view.items.map((i) => i.group),
    ['pechi', 'smesiteli', ''],
  );
  assert.deepEqual(view.groups, [
    { key: 'pechi', kind: 'equipment', title: 'Печи', image: '/img/p1.jpg', count: 1 },
    { key: 'smesiteli', kind: 'equipment', title: 'Смесители', image: '/img/type.jpg', count: 1 },
  ]);
});

test('блоки склада получают данные, в том числе внутри контейнера', () => {
  const view = resolveStockView(groups, [item({})], catalog);
  const blocks = [
    { type: 'text', text: 'x' },
    { type: 'container', tag: 'div', children: [{ type: 'stockList', allLabel: 'Все', empty: '' }] },
    { type: 'stockShowcase', head: { title: 'Склад' } },
  ] as unknown as Block[];
  assert.equal(hasStockBlocks(blocks), true);
  assert.equal(hasStockBlocks([blocks[0]]), false);
  const out = resolveStockBlocks(blocks, view) as unknown as Record<string, unknown>[];
  assert.equal((out[2].groups as unknown[]).length, 1);
  const inner = (out[1].children as Record<string, unknown>[])[0];
  assert.equal((inner.items as unknown[]).length, 1);
});

test('страница не из таблиц каталога (запчасти): название и фото — с её разметки', () => {
  const pages = (path: string) => (path === '/products/zapchasti/kondensatory/' ? { title: 'Электротермические конденсаторы', image: '/img/spares/c.webp' } : undefined);
  const { items } = resolveStockView(groups, [item({ url: '/products/zapchasti/kondensatory/' }), item({ url: '/products/zapchasti/kondensatory/', title: 'Свой', image: '/img/own.jpg' })], catalog, pages);
  assert.equal(items[0].title, 'Электротермические конденсаторы');
  assert.deepEqual(items[0].image, { src: '/img/spares/c.webp', alt: 'Электротермические конденсаторы' });
  assert.equal(items[1].href, '/products/zapchasti/kondensatory/');
  assert.equal(items[0].href, '/products/zapchasti/kondensatory/');
  assert.equal(items[1].title, 'Свой');
  assert.equal(items[1].image?.src, '/img/own.jpg');
});

test('простой текст из админки → HTML: экранирование, неразрывный пробел после коротких слов', () => {
  assert.equal(textHtml(' Индукционные нагреватели и печи '), 'Индукционные нагреватели и&nbsp;печи');
  assert.equal(textHtml('Запчасти для индукционного оборудования'), 'Запчасти для&nbsp;индукционного оборудования');
  assert.equal(textHtml('Печь <500 кг> & «ковш» в цех'), 'Печь &lt;500 кг&gt; &amp; «ковш» в&nbsp;цех');
  assert.equal(textHtml('и в печи'), 'и&nbsp;в&nbsp;печи');
  assert.equal(textHtml('УИ-0.25Т'), 'УИ-0.25Т');
});

test('цена: разряды узким неразрывным пробелом, «от», пояснение; без цены — полей нет', () => {
  const { items } = resolveStockView(
    groups,
    [item({ price: 1250000, priceFrom: true, priceNote: ' с НДС ' }), item({ price: 98500, priceNote: '' }), item({ price: 0, priceNote: 'с НДС' }), item({})],
    catalog,
  );
  assert.equal(items[0].price, 'от&nbsp;1&#8239;250&#8239;000&nbsp;₽');
  assert.equal(items[0].priceNote, 'с&nbsp;НДС');
  assert.equal(items[1].price, '98&#8239;500&nbsp;₽');
  assert.equal(items[1].priceNote, undefined);
  for (const it of items.slice(2)) {
    assert.equal(it.price, undefined);
    assert.equal(it.priceNote, undefined);
  }
});

test('склад для страниц товаров: срок отгрузки и цена — наименьшая из позиций, «от» при разных ценах, число позиций', () => {
  const map = stockBySlug([
    { slug: 'a/ui-1', shipping: 'от 3 дней', price: 1400000 },
    { slug: 'a/ui-1', price: 1250000, priceNote: 'с НДС' },
    { slug: 'a/ui-2', shipping: 'от 1 дня' },
    { slug: 'a/ui-3', price: 500000, priceFrom: true },
  ]);
  assert.deepEqual(map['a/ui-1'], { shipping: 'от 3 дней', offer: { price: 1250000, maxPrice: 1400000, priceFrom: true, priceNote: 'с НДС', offers: 2 } });
  assert.deepEqual(map['a/ui-2'], { shipping: 'от 1 дня' });
  assert.deepEqual(map['a/ui-3'], { offer: { price: 500000, priceFrom: true, offers: 1 } });
});
