# T12 · Юридическая страница

**URL-паттерн:** `/policy/`, `/soglasie/`
**Источник:** `astro/src/raw-pages/{policy,soglasie}/body.html` + `meta.json`
**Кол-во страниц:** 2

## Список

| URL | Документ | Файл |
|---|---|---|
| `/policy/` | Политика обработки персональных данных | `astro/src/raw-pages/policy/` |
| `/soglasie/` | Согласие на обработку персональных данных | `astro/src/raw-pages/soglasie/` |

## Назначение

Юридические документы для соответствия 152-ФЗ (О персональных данных). Простой типографский шаблон — никаких визуальных украшений, только читаемый текст.

## Карта блоков

| # | Блок | Класс | Обязательно? |
|---:|---|---|---|
| 1 | Шапка (`.legal-hero`) | `.legal-hero` + `.legal-container` | ✅ |
| 2 | Содержание (`.legal-body`) | `.legal-body` + `.legal-container` | ✅ |
| 3 | Подпись внизу (`.legal-foot`) | `.legal-foot` | ✅ |

## CSS

⚠️ **Важно — не использовать глобальный `.container`!** Это глобальный класс, занятый шапкой/футером. Если переопределить max-width в этом классе, шапка/футер сжимаются. Используется собственный `.legal-container { max-width: 880px; margin: 0 auto; padding: 0 24px; }`.

Override-блок (`<style>...</style>`) находится в `inline_styles[1]` в `meta.json`. Базовый блок `inline_styles[0]` обязателен — он несёт глобальные стили header/footer/breadcrumb (без него шапка сломается, см. историю фикса 03.06.2026 «огромная синяя SVG»).

## Структура content

```html
<section class="legal-hero">
  <div class="legal-container">
    <nav class="breadcrumb">…</nav>
    <h1 class="legal-hero__title">Название документа</h1>
    <p class="legal-hero__lead">Редакция от … года.</p>
  </div>
</section>

<section class="legal-body">
  <div class="legal-container">
    <h2>1. Раздел один</h2>
    <p>…</p>

    <h2 id="legal-requisites">2. Сведения об Операторе</h2>
    <ul>
      <li><strong>Наименование:</strong> ООО «МТПК»</li>
      <li>ОГРН/ИНН: …</li>
    </ul>

    <!-- ... 17 разделов для /policy/, 9 разделов для /soglasie/ -->

    <div class="legal-foot">ООО «МТПК» · Миасс, 2026</div>
  </div>
</section>
```

## Ссылка из футера

`Footer.astro` содержит две ссылки внизу:
```html
<div class="footer__bottom-links">
  <a href="/policy/">Политика конфиденциальности</a>
  <a href="/soglasie/">Согласие на обработку персональных данных</a>
</div>
```

## SEO

- Юр.документы не критичны для SEO — короткий title, короткий description.
- `<h1>` — название документа.
- `<h2>` — разделы документа.
- noindex стоит на поддомене целиком (A/B-тест), поэтому пока не индексируются.

## Связь между документами

В `/soglasie/` обязательно ссылка на `/policy/` (раздел «Cookie и веб-аналитика», «Подтверждение»).

## При смене реквизитов

Менять одновременно в:
1. `astro/src/raw-pages/policy/body.html` (раздел 3 «Сведения об Операторе»)
2. `astro/src/raw-pages/soglasie/body.html` (раздел 2)
3. `astro/src/components/Footer.astro` (copyright + ОГРН/ИНН)

## Пример

См. live:
- https://uralinduktor.ru/policy/
- https://uralinduktor.ru/soglasie/
