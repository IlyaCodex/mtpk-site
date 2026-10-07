# Формы заявок — канон

> **Справочно: документ про старый сайт на Astro.** Папка `astro/` удалена 07.10.2026 (есть в истории git);
> сайт теперь — платформа `platform/` (Next.js, база, админка), работаем только локально. Актуальное — [`CLAUDE.md`](../CLAUDE.md).

> Вынесено из CLAUDE.md (2026-06-04). Читать при любой работе с формами.
> Главное правило: ФОРМА БЕЗ `js-lead-form` — ЗАГЛУШКА, заявка не уйдёт.

Две модели форм: полная (Leadgen — `<form class="form">`) и короткая
(BestOffer — `<form class="best-offer__form">`). Обе обязаны иметь класс
`js-lead-form`, иначе обработчик `astro/public/js/forms.js` их игнорирует.

## Минимальная разметка формы заявки

```html
<form class="form js-lead-form" data-form="Подбор и расчёт · <страница>">
  <input type="text" name="company" class="hp-field" tabindex="-1"
         autocomplete="off" aria-hidden="true">
  <input type="hidden" name="form_ts" class="js-form-ts">
  <input type="hidden" name="source" class="js-form-source">
  <input type="hidden" name="roistat_visit" class="js-roistat">

  <input class="form__input" type="text" name="name" required>
  <input class="form__input" type="tel"  name="phone" required>
  <input class="form__input" type="email" name="email">
  <textarea name="task"></textarea>

  <button type="submit">Отправить</button>
  <div class="js-form-status" style="display:none" role="status" aria-live="polite"></div>
</form>
```

## Обязательные элементы

- `class="js-lead-form"` + `data-form="..."` (источник в логе/Битрикс24).
- Honeypot `<input name="company" class="hp-field">` (защита от ботов).
- 3 hidden поля: `form_ts` (время загрузки), `source` (URL), `roistat_visit` (трекинг).
- `name=` на каждом input/textarea (без него FormData пустая, бэкенд отбрасывает).
- `required` на `name` и `phone`.
- `<div class="js-form-status">` — вывод «Заявка отправлена» / «Ошибка».
- Никаких `onsubmit="..."` — обработчик ставит forms.js.

## Backend

`/api/send.php` (боевой VPS): лид в Битрикс24 (webhook) + email (SMTP) +
лог `/var/www/uralinduktor/logs/leads.log`. Конфиг —
`/var/www/uralinduktor/config/secrets.php` (НЕ коммитить).

## Правило

Новая страница с формой → копируй разметку из рабочей формы
(`Leadgen.astro` или `BestOffer.astro`). Никогда не писать `<form>` с нуля.
