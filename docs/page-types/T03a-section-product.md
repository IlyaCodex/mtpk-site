# T03a · Раздел каталога — продуктовый

**URL-паттерн:** `/products/<раздел>/`
**Источник:** `astro/src/raw-pages/products/<раздел>/body.html` + `meta.json`
**Кол-во страниц:** 8

## К каким разделам относится

| Раздел | URL |
|---|---|
| Индукционные плавильные печи | `/products/induktsionnye-plavilnye-pechi/` |
| Индукционные нагреватели | `/products/induktsionnye-nagrevateli/` |
| Дробемётное оборудование | `/products/drobemetnoe-oborudovanie/` |
| Системы охлаждения | `/products/sistemy-ohlazhdeniya/` |
| Муфельные термические печи | `/products/mufelnye-termicheskie-pechi/` |
| Запчасти на индукционное оборудование | `/products/zapchasti-na-indukcionnoe-oborudovanie/` |
| Вакуумное оборудование для термообработки | `/products/vakuumnoe-oborudovanie-dlya-termoobrabotki/` |
| Сталеразливочные ковши | `/products/stalerozlivochnye-kovshi/` |

## Назначение

Хаб продуктового раздела: знакомит с группой оборудования, показывает все категории/типы изделий, ведёт в каждую категорию или сразу на товарную страницу.

## Карта блоков (top → bottom)

| # | Блок | Класс | Обязательно? |
|---:|---|---|---|
| 1 | Hero (тёмный, фото в фоне, заголовок + кнопка CTA) | `.cat-hero` | ✅ |
| 2 | KPI-strip (4 цифры: мощность / производство / опыт / гарантия) | `.hero-kpi` | ✅ |
| 3 | Intro: что это за оборудование, кому подходит | `.problems` / `.cat-intro` | ✅ |
| 4 | Сетка категорий (тизеры) | `.teaser-grid` + `<a class="teaser-card">` | ✅ |
| 5 | Применение / Полный цикл (опц.) | `.application`, `.cycle` | опц. |
| 6 | Лидген (форма «Подбор и расчёт») | `<!--C:leadgen-->` | ✅ |
| 7 | Производство в РФ (тёмный блок с фото цеха) | `.production-block` | опц. |
| 8 | FAQ (детали в `<details>`) | `.faq` | опц. |
| 9 | Best-offer | `<!--C:best-offer-->` | ✅ |

## Тизер-карточка категории (`.teaser-card`)

```html
<a href="/products/<раздел>/<категория>/" class="teaser-card">
  <div class="teaser-card__cover">
    <img src="/img/card-...png?v=N" alt="..." loading="lazy">
  </div>
  <div class="teaser-card__body">
    <h3 class="teaser-card__title">Название категории с предметным якорем</h3>
    <p class="teaser-card__caption">N моделей · ключевые ТТХ</p>
    <span class="teaser-card__more">Подробнее <span class="btn__arrow">→</span></span>
  </div>
</a>
```

## SEO

- `<h1>` — один, в hero.
- `<h2>` — у каждого блока (intro, тизеры, применение, лидген, производство, FAQ).
- `<h3>` — у каждой `teaser-card`.
- BreadcrumbList JSON-LD: Главная → Каталог → Этот раздел. Генерируется автоматически из `<nav class="breadcrumb">` в hero.

## Формы

- 1 × Leadgen в блоке #6, `data-form="Подбор и расчёт · <раздел>"`.
- 1 × Best-offer в блоке #9, `data-form="Лучшее предложение"`.

## Картинки

- **Hero:** `/img/hero-*.png` (16:9, тёмный фон, фото цеха или оборудования). Подключается через `background-image` в `.cat-hero__image` в `meta.json[inline_styles][0]`.
- **Тизеры:** `/img/card-*.png|jpg` (4:3, продуктовая карточка). Один файл на категорию.
- Конверсия в WebP обязательна для T-PERF-7.

## CSS

Базовый блок (130KB) копируется из любой существующей T03a-страницы. Содержит header/footer/container/hero/teaser-card/leadgen и т.п. Page-specific стили — в `inline_styles[1]`.

## Чек-лист при создании новой T03a-страницы

- [ ] Скопировать прототип из соседней T03a.
- [ ] Hero-картинка сгенерирована, лежит в `/img/` и зарегистрирована в `picture.md`.
- [ ] Тизеры покрывают **все** категории раздела.
- [ ] Заголовок каждой карточки имеет предметный якорь.
- [ ] Leadgen + best-offer присутствуют с маркерами `<!--C:-->`.
- [ ] Запись в `structura.md` + дубль карточек в `/products/` (корень каталога, T02).

## Пример

См. live: https://new.uralinduktor.ru/products/induktsionnye-plavilnye-pechi/
