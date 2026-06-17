# T06 · Услуга

**URL-паттерн:** `/uslugi/<slug>/`
**Источник:** `astro/src/raw-pages/uslugi/<slug>/body.html` + `meta.json`
**Кол-во страниц:** 6

## Список услуг

| URL | Услуга |
|---|---|
| `/uslugi/montazh-shefmontazh/` | Монтаж и шефмонтаж |
| `/uslugi/puskonaladka/` | Пусконаладка |
| `/uslugi/obuchenie-personala/` | Обучение персонала |
| `/uslugi/tehnicheskij-audit/` | Технический аудит |
| `/uslugi/remont-plavilnyh-pechey/` | Ремонт плавильных печей |
| `/uslugi/remont-drobemetov/` | Ремонт дробемётов |

## Назначение

Витрина услуги: что входит, в каких ситуациях, чем мы лучше, сколько стоит/занимает по срокам, заявка на расчёт.

## Карта блоков

| # | Блок | Класс | Обязательно? |
|---:|---|---|---|
| 1 | Hero (тёмный, фото услуги) | `.cat-hero` | ✅ |
| 2 | KPI-strip (4 цифры) | `.hero-kpi` | ✅ |
| 3 | Что это за услуга (определение) | `.problems` / `.uslugi-intro` | ✅ |
| 4 | В каких ситуациях нужна | `.situations` | ✅ |
| 5 | Что входит в услугу | `.scope` | ✅ |
| 6 | Лидген 1 (расчёт услуги) | **2 формы** (см. ниже) | ✅ |
| 7 | Как мы работаем (этапы) | `.process` | ✅ |
| 8 | Преимущества / гарантии | `.benefits` | опц. |
| 9 | FAQ | `.faq` | опц. |
| 10 | Best-offer / короткая форма | внутри `.uslugi` | ✅ |

## Формы

⚠️ На каждой странице услуги **2 формы**, обе обязательно с `class="js-lead-form"`:

1. **Полная форма** «Получить расчёт услуги»:
   ```html
   <form class="form js-lead-form" data-form="Услуга <название>">
     <input type="text" name="company" class="hp-field" tabindex="-1">
     <input type="hidden" name="form_ts" class="js-form-ts">
     <input type="hidden" name="source" class="js-form-source">
     <input type="hidden" name="roistat_visit" class="js-roistat">
     <!-- name, email, phone, task -->
     <div class="js-form-status" ...></div>
   </form>
   ```
2. **Короткая** (best-offer-style) — телефон + кнопка:
   ```html
   <form class="best-offer__form js-lead-form" data-form="Услуга <название> · короткая">
     <input type="text" name="company" class="hp-field" tabindex="-1">
     <input type="hidden" name="form_ts" class="js-form-ts">
     <input type="hidden" name="source" class="js-form-source">
     <input type="hidden" name="roistat_visit" class="js-roistat">
     <input type="tel" name="phone" ...>
     <div class="js-form-status" ...></div>
   </form>
   ```

## SEO

- `<h1>` — название услуги.
- `<h2>` × ~6 (по блокам).
- BreadcrumbList: Главная → Услуги → Эта услуга.

## Чек-лист

- [ ] **Обе формы имеют `js-lead-form`** (если нет — это заглушка, см. историю фиксов 03.06.2026).
- [ ] Hero-картинка соответствует услуге.
- [ ] Запись в `structura.md`.
- [ ] Ссылка из футера (раздел «Услуги»).

## Пример

См. live: https://new.uralinduktor.ru/uslugi/montazh-shefmontazh/
