import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stockPriceFor } from './catalog';

const PATH = '/products/sistemy-ohlazhdeniya/gradirni/uig-10t/';

test('цена со склада для страницы товара: наименьшая из видимых позиций с ценой, «от» при разных ценах', () => {
  assert.equal(stockPriceFor([], PATH), undefined);
  // без цены, скрытая, другой товар — не в счёт; адрес позиции — с ?query и без слеша на конце
  assert.equal(
    stockPriceFor(
      [
        { url: PATH, price: null },
        { url: PATH, price: 900000, hidden: true },
        { url: '/products/sistemy-ohlazhdeniya/gradirni/uig-20t/', price: 500000 },
      ],
      PATH,
    ),
    undefined,
  );
  assert.deepEqual(stockPriceFor([{ url: `${PATH.slice(0, -1)}?from=stock`, price: 1141000, priceNote: ' с НДС ' }], PATH), {
    price: 1141000,
    priceFrom: false,
    priceNote: 'с НДС',
  });
  assert.deepEqual(
    stockPriceFor(
      [
        { url: PATH, price: 1200000 },
        { url: PATH, price: 1141000, priceNote: 'с НДС' },
      ],
      PATH,
    ),
    { price: 1141000, priceFrom: true, priceNote: 'с НДС' },
  );
});
