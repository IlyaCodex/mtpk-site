# T09 · Наличие на складе

**URL:** `/nalichie/`
**Источник:** `astro/src/raw-pages/nalichie/body.html` + `meta.json`
**Кол-во страниц:** 1
**Подсистема:** см. [`../stock-system.md`](../stock-system.md)

## Назначение

Витрина оборудования, которое уже на складе. Цель — закрыть «горячих» покупателей на быструю отгрузку. Источник правды — `stock.config.json` (resolver рендерит ту же страницу из live-данных).

## Карта блоков

| # | Блок | Класс | Обязательно? |
|---:|---|---|---|
| 1 | Hero (тёмный) | `.cat-hero` | ✅ |
| 2 | Краткое объяснение (что значит «в наличии») | `.stock-intro` | ✅ |
| 3 | Список товаров со склада (карточки + кол-во + срок отгрузки) | `.stock-list` | ✅ |
| 4 | Leadgen | `<!--C:leadgen-->` | ✅ |
| 5 | Best-offer | `<!--C:best-offer-->` | ✅ |

## Карточка со склада

Используется тот же `.pcard` что в T04, но с активным бейджем «В наличии» и количеством на складе:

```html
<article class="pcard pcard--in-stock">
  <div class="pcard__badge pcard__badge--stock">В НАЛИЧИИ · 2 шт.</div>
  ...
</article>
```

Бейджи рендерятся на клиенте скриптом `astro/public/js/stock-badges.js` + `stock-list.js`. JSON: `stock.config.json` (читается на этой странице + автоматически добавляет бейджи на T04/T05).

## Поддерживающие компоненты

- `astro/public/css/stock.css` (бейджи, цвета)
- `astro/public/js/stock-badges.js` (вставка бейджей по slug)
- `astro/public/js/stock-list.js` (рендер списка на `/nalichie/`)
- `astro/src/raw-pages/nalichie/stock.config.json` ИЛИ `astro/public/stock.config.json` — конфиг (см. `docs/stock-system.md`)

## Чек-лист правки

- [ ] Изменения в наличии — только через `stock.config.json`, не править HTML.
- [ ] При добавлении нового складского товара — обязательно есть страница T05 этого товара (иначе бейдж не привяжется).

## Пример

См. live: https://uralinduktor.ru/nalichie/
