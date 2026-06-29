# T04 · Категория

**URL-паттерн:** `/products/<раздел>/<категория>/`
**Источник:** `astro/src/raw-pages/products/<раздел>/<категория>/body.html` + `meta.json`
**Кол-во страниц:** ~30

## Примеры

| URL | Раздел |
|---|---|
| `/products/induktsionnye-plavilnye-pechi/po-stali/` | Печи |
| `/products/drobemetnoe-oborudovanie/kranovogo-tipa/` | Дробемёты |
| `/products/sistemy-ohlazhdeniya/chillery/` | Охлаждение |
| `/products/stalerozlivochnye-kovshi/stalerazlivochnye-kovshi-chajnikovogo-tipa/` | Ковши |
| `/products/oborudovanie-lvm/avtoklav/` | ЛВМ (узел) |

## Назначение

Список товарных позиций конкретной категории + фильтрация по параметрам. Цель — провести посетителя к выбору товара.

## Карта блоков

| # | Блок | Класс | Обязательно? |
|---:|---|---|---|
| 1 | Hero (тёмный, фото категории) | `.cat-hero` | ✅ |
| 2 | KPI-strip (4 цифры по категории) | `.hero-kpi` | опц. |
| 3 | Intro | `.cat-intro` / `.problems` | ✅ |
| 4 | Фильтр (тёмная плашка, см. правило ниже) | `.catalog-filter` | ✅ |
| 5 | Сетка товаров (pcard) | `.pcard-grid` + `<article class="pcard">` | ✅ |
| 6 | Применение / Полный цикл (опц.) | `.application`, `.cycle` | опц. |
| 7 | Лидген | `<!--C:leadgen-->` | ✅ |
| 8 | Best-offer | `<!--C:best-offer-->` | ✅ |

## Фильтр (`.catalog-filter`)

**ОБЯЗАТЕЛЬНО — тёмная плашка.** С 3 июня 2026 на категориях используется dark-filter override (см. `DARK FILTER OVERRIDE` в `inline_styles[1]` страницы `po-stali`). Параметры:

- Фон `#1A1D20` (graphite).
- Левая полоса-акцент `var(--teal-600)`.
- Триггеры (dropdown) — светлый текст; hover/open — teal-подсветка.
- Панель опций (popout) — остаётся светлой для читаемости галочки.
- 1-2 фильтра (масса / мощность / тип). Если категория узкая (≤8 моделей) — фильтр опц.

JS: `astro/public/js/catalog-filter.js`. Подключается автоматически через BaseLayout.

## Карточка товара (`.pcard`)

**ПРАВИЛО (картинка карточки = главная товарной страницы).** `pcard__cover img`
обязан указывать на ту же картинку, что и главная (`phero__main`) на странице
этого товара. Меняешь главную в карточке товара (T05) — синхронно меняй и
миниатюру в листинге категории. Источник правды для миниатюры — статический
`body.html` категории (карточки `.pcard` захардкожены здесь); подсистема
«Наличие» НЕ дублирует это поле, а **достаёт готовую `.pcard` из родительской
категории** (`astro/scripts/build-stock.mjs` → `extractCatalogCard`) и пишет в
`stock.json` (`image` + `cardHtml`) при сборке — поэтому после правки листинга
обязателен `npm run build`, иначе `stock.json` и листинг разойдутся.

```html
<article class="pcard">
  <a href="/products/<раздел>/<категория>/<товар>/" class="pcard__cover">
    <img src="/img/<товар>-main.png" alt="..." loading="lazy">
  </a>
  <div class="pcard__badge">Под заказ / В наличии</div>  <!-- опц. -->
  <div class="pcard__body">
    <h3 class="pcard__title"><a href="...">Название модели</a></h3>
    <div class="pcard__origin">Собственное производство</div>
    <dl class="pcard__specs">
      <div class="pcard__spec"><dt>Загрузка</dt><dd>0.5 т</dd></div>
      <div class="pcard__spec"><dt>Мощность</dt><dd>400 кВт</dd></div>
      <!-- 3-5 ключевых параметров -->
    </dl>
    <div class="pcard__actions">
      <a class="pcard__more" href="...">Подробнее →</a>
    </div>
  </div>
</article>
```

## SEO

- `<h1>` в hero.
- `<h2>` × ~5 (intro, фильтр, каталог, применение, лидген).
- `<h3>` — у каждой `pcard__title`.
- BreadcrumbList: Главная → Каталог → Раздел → Категория.

## Формы

- Leadgen + Best-offer (обе с `js-lead-form`).

## Бейджи «В наличии»

См. [`../stock-system.md`](../stock-system.md). Если товар в `stock.config.json` — на `.pcard` автоматически добавляется бейдж скриптом `stock-badges.js`.

## Чек-лист

- [ ] Hero-картинка категории сгенерирована.
- [ ] Все товарные позиции (L4) подключены как `.pcard`.
- [ ] Если категория без подкатегорий — список товаров полный.
- [ ] Тёмный фильтр (override) применён.
- [ ] Запись в `structura.md` + дубль карточки в `/products/` (T02).
- [ ] Запись в `picture.md` если новые картинки.

## Пример

См. live: https://uralinduktor.ru/products/induktsionnye-plavilnye-pechi/po-stali/
