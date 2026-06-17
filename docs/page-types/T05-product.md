# T05 · Товарная позиция

**URL-паттерн:**
- `/products/<раздел>/<категория>/<товар>/` — стандартная глубина
- `/products/<раздел>/<товар>/` — для разделов без категорий (нагреватели, муфельные, вакуумные, запчасти)

**Источник:** `astro/src/raw-pages/products/.../<товар>/body.html` + `meta.json`
**Кол-во страниц:** ~140

## Назначение

Карточка конкретной модели. Должна закрыть пользователя в действие: запросить КП, позвонить, оставить заявку.

## Карта блоков (top → bottom)

| # | Блок | Класс | Обязательно? |
|---:|---|---|---|
| 1 | Hero-карточка товара (`.phero`) с галереей + ТТХ | `.phero` | ✅ |
| 2 | Описание / технология (опц.) | `.product-desc` | опц. |
| 3 | Технические характеристики (полная таблица) | `.product-specs` | ✅ |
| 4 | Применение / преимущества | `.product-benefits` | опц. |
| 5 | Связанные товары (опц.) | `.related` | опц. |
| 6 | Лидген «Запросить КП» | `<!--C:leadgen-->` | ✅ |
| 7 | Best-offer | `<!--C:best-offer-->` | ✅ |

## Hero товара (`.phero`)

```html
<section class="phero">
  <div class="container">
    <nav class="breadcrumb">…</nav>

    <div class="phero__layout">
      <!-- Галерея слева -->
      <div class="phero__gallery">
        <button class="phero__main" data-img="/img/<товар>-main.png">
          <img src="/img/<товар>-main.png" alt="...">
        </button>
        <div class="phero__thumbs">
          <button data-img="/img/<товар>-photo-1.jpg"><img src="..."></button>
          <!-- 2-4 миниатюры -->
        </div>
      </div>

      <!-- ТТХ справа -->
      <div class="phero__info">
        <h1 class="phero__title">УИ-0.5Т-400 на гидравлике</h1>
        <div class="phero__chips">
          <span class="chip">В наличии</span>
          <span class="chip">Собственное производство</span>
        </div>
        <dl class="phero__specs">
          <div><dt>Загрузка</dt><dd>0.5 т</dd></div>
          <div><dt>Мощность</dt><dd>400 кВт</dd></div>
          <!-- 5-8 ключевых параметров -->
        </dl>
        <div class="phero__actions">
          <a href="#leadgen" class="btn btn--primary">Запросить КП →</a>
          <a href="tel:+73512116597" class="btn btn--ghost">+7 (351) 211-65-97</a>
        </div>
      </div>
    </div>
  </div>
</section>
```

## SEO

- `<h1>` — `.phero__title` (название модели).
- `<h2>` — на каждом крупном блоке.
- JSON-LD **`Product`** (с offers.priceCurrency=RUB, price=0, availability=PreOrder) — генерируется автоматически в `[...slug].astro` на основе `<section class="phero">` + `meta.description`.
- BreadcrumbList JSON-LD — авто.

## Картинки

- **Главное фото:** `/img/<товар>-main.png` (квадрат 1:1 или 4:3, тёмный или светлый фон).
- **Реальные фото:** `/img/<товар>-photo-1.jpg`, `-photo-2.jpg`, ... (галерея из 3-5 шт.).
- WebP-конверсия обязательна.

## Формы

- Leadgen — `data-form="<название товара> · запрос КП"`.
- Best-offer — стандартная.

## Бейджи «В наличии»

См. [`../stock-system.md`](../stock-system.md). Если товар в `stock.config.json` — `.phero__chips` добавляет бейдж + `.phero__actions` показывает количество.

## Чек-лист

- [ ] Главное фото есть (`<товар>-main.png`).
- [ ] 3+ реальных фото в галерее.
- [ ] ТТХ заполнены: загрузка, мощность, питание, охлаждение, габариты.
- [ ] Leadgen + best-offer.
- [ ] Запись в `structura.md` (внутри категории).
- [ ] Запись в `picture.md`.
- [ ] Если складское — в `stock.config.json`.

## Пример

См. live: https://new.uralinduktor.ru/products/induktsionnye-plavilnye-pechi/po-stali/ui-0-5t-400/
