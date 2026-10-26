import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Block } from '@mtpk/content-model';
import { applyHidden, catalogOwner, hiddenPages, HIDDEN_STATUS, pageProducts, resolveCatalogBlocks, type CatalogData, type CatalogProduct } from './catalog.ts';

const product = (over: Partial<CatalogProduct>): CatalogProduct => ({
  id: 1,
  pageId: 100,
  categoryId: 1,
  subcategoryId: 10,
  path: '/products/cat/sub/p1/',
  status: 'published',
  name: 'P1',
  nameNote: null,
  cover: '/img/p1.jpg',
  coverAlt: '',
  coverAttrs: {},
  badge: null,
  origin: null,
  caption: null,
  label: null,
  linkText: null,
  warranty: null,
  specs: [],
  actions: [],
  attrs: {},
  sort: 0,
  listed: true,
  ...over,
});

const data: CatalogData = {
  categories: [
    { id: 1, pageId: 1, path: '/products/cat/', status: 'published', name: 'Категория', crumb: 'Кат', cover: '/img/c.jpg', coverAlt: '', coverAttrs: {}, sort: 1, onHome: true, kind: 'equipment', productBlocks: [{ type: 'adv' }, { type: 'leadgen' }] },
    { id: 2, pageId: 2, path: '/products/hidden/', status: 'published', name: 'Не на главной', crumb: 'Скрыта', cover: null, coverAlt: '', coverAttrs: {}, sort: 0, onHome: false, kind: 'equipment', productBlocks: [] },
    { id: 3, pageId: 3, path: '/products/draft/', status: 'draft', name: 'Черновик', crumb: 'Черновик', cover: null, coverAlt: '', coverAttrs: {}, sort: 2, onHome: true, kind: 'equipment', productBlocks: [] },
  ],
  subcategories: [
    { id: 10, pageId: 10, categoryId: 1, path: '/products/cat/sub/', status: 'published', name: 'Подкатегория', crumb: 'Под', description: 'Описание', cover: '/img/s.jpg', coverAlt: '', coverAttrs: {}, sort: 0, listed: true },
    { id: 11, pageId: 11, categoryId: 1, path: '/products/cat/hidden-sub/', status: 'published', name: 'Скрытая', crumb: 'Скр', description: '', cover: null, coverAlt: '', coverAttrs: {}, sort: 1, listed: false },
  ],
  products: [
    product({ id: 2, pageId: 101, path: '/products/cat/sub/p2/', name: 'P2', sort: 2 }),
    product({ id: 1, pageId: 100, sort: 1, warranty: '12 месяцев' }),
    product({ id: 3, pageId: 102, path: '/products/cat/sub/p3/', name: 'P3', status: 'draft' }),
    product({ id: 4, pageId: 103, path: '/products/cat/sub/p4/', name: 'P4', listed: false }),
  ],
};

test('карточки главной: только опубликованные категории «на главной», по порядку', () => {
  const [b] = resolveCatalogBlocks({ id: 999 }, [{ type: 'catalogCards', source: 'categories', design: 'home' }], data);
  assert.equal(b.type, 'catalogCards');
  assert.deepEqual(
    (b as Extract<Block, { type: 'catalogCards' }>).items?.map((i) => i.href),
    ['/products/cat/'],
  );
});

test('список товаров подкатегории: опубликованные и показанные, по порядку', () => {
  assert.deepEqual(
    pageProducts(10, data).map((p) => p.name),
    ['P1', 'P2'],
  );
  const [b] = resolveCatalogBlocks({ id: 10 }, [{ type: 'catalogList', auto: true, cards: [] }], data);
  assert.deepEqual(
    (b as Extract<Block, { type: 'catalogList' }>).cards.map((c) => c.href),
    ['/products/cat/sub/p1/', '/products/cat/sub/p2/'],
  );
});

test('подкатегории категории: скрытые из «Модельного ряда» не показываются; доп. карточки — в конце', () => {
  const extra = [{ href: '/products/zapchasti/', title: 'Запчасти', alt: '' }];
  const [b] = resolveCatalogBlocks({ id: 1 }, [{ type: 'catalogCards', source: 'subcategories', design: 'teaser', extra }], data);
  assert.deepEqual(
    (b as Extract<Block, { type: 'catalogCards' }>).items?.map((i) => [i.href, i.caption]),
    [
      ['/products/cat/sub/', 'Описание'],
      ['/products/zapchasti/', undefined],
    ],
  );
});

test('страница товара: общие секции категории — перед просмотром фото, «Преимущества» с гарантией товара', () => {
  const out = resolveCatalogBlocks({ id: 100 }, [{ type: 'productHero' } as Block, { type: 'lightbox', label: 'Фото', total: 1 }], data);
  assert.deepEqual(
    out.map((b) => b.type),
    ['productHero', 'adv', 'leadgen', 'lightbox'],
  );
  assert.equal((out[1] as Extract<Block, { type: 'adv' }>).warranty, '12 месяцев');
  // у товара без своей гарантии — как в шаблоне (по умолчанию 18 месяцев)
  const other = resolveCatalogBlocks({ id: 101 }, [{ type: 'productHero' } as Block], data);
  assert.equal((other[1] as Extract<Block, { type: 'adv' }>).warranty, undefined);
});

test('чья страница: категория, подкатегория или товар', () => {
  assert.equal(catalogOwner(1, data).category?.id, 1);
  assert.equal(catalogOwner(10, data).subcategory?.id, 10);
  assert.equal(catalogOwner(100, data).product?.id, 1);
});

test('скрытие тумблером: категория скрывает подкатегории и товары, подкатегория — свои товары', () => {
  const withHidden = (over: (d: CatalogData) => CatalogData) => applyHidden(over(structuredClone(data)));
  const byCat = withHidden((d) => ({ ...d, categories: d.categories.map((c) => (c.id === 1 ? { ...c, hidden: true } : c)) }));
  assert.equal(byCat.categories.find((c) => c.id === 1)?.status, HIDDEN_STATUS);
  assert.deepEqual(byCat.subcategories.map((s) => s.status), [HIDDEN_STATUS, HIDDEN_STATUS]);
  assert.ok(byCat.products.every((p) => p.status === HIDDEN_STATUS));
  // в сетке главной скрытой категории нет; её страницы — в списке скрытых
  const [home] = resolveCatalogBlocks({ id: 999 }, [{ type: 'catalogCards', source: 'categories', design: 'home' }], byCat);
  assert.deepEqual((home as Extract<Block, { type: 'catalogCards' }>).items, []);
  assert.ok(hiddenPages(byCat).paths.has('/products/cat/sub/p1/'));
  // скрытая подкатегория: её товары скрыты, черновик остаётся черновиком
  const bySub = withHidden((d) => ({ ...d, subcategories: d.subcategories.map((s) => (s.id === 10 ? { ...s, hidden: true } : s)) }));
  assert.equal(bySub.categories.find((c) => c.id === 1)?.status, 'published');
  assert.equal(bySub.products.find((p) => p.id === 3)?.status, HIDDEN_STATUS);
  assert.deepEqual(pageProducts(10, bySub), []);
  // ничего не скрыто — данные как были
  assert.equal(hiddenPages(applyHidden(data)).ids.size, 0);
});

test('товары по адресам: подборка из каталога в заданном порядке, без черновиков и скрытых', () => {
  const [b] = resolveCatalogBlocks(
    { id: 999 },
    [{ type: 'catalogList', paths: ['/products/cat/sub/p2/', 'https://uralinduktor.ru/products/cat/sub/p1', '/products/cat/sub/p3/', '/products/nope/'], cards: [] }],
    data,
  );
  assert.deepEqual((b as Extract<Block, { type: 'catalogList' }>).cards.map((c) => c.href), ['/products/cat/sub/p2/', '/products/cat/sub/p1/']);
});

test('карточки: «только дополнительные», группы; ссылки на скрытые разделы не показываются', () => {
  const extra = [
    { href: '/products/cat/sub/', title: 'Раздел', alt: '', group: 'Группа Б' },
    { href: '/products/draft/', title: 'Черновик', alt: '', group: 'Группа Б' },
    { href: '/products/zapchasti/', title: 'Запчасти', alt: '' },
  ];
  const [b] = resolveCatalogBlocks({ id: 1 }, [{ type: 'catalogCards', source: 'none', design: 'teaser', extra }], data);
  assert.deepEqual((b as Extract<Block, { type: 'catalogCards' }>).items?.map((i) => i.href), ['/products/cat/sub/', '/products/zapchasti/']);
  const [g] = resolveCatalogBlocks({ id: 1 }, [{ type: 'catalogCards', source: 'subcategories', design: 'teaser', group: 'Группа А' }], data);
  assert.deepEqual((g as Extract<Block, { type: 'catalogCards' }>).items?.map((i) => i.group), ['Группа А']);
});
