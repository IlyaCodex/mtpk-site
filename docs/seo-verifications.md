# Подтверждения прав на сайт (SEO-верификации)

> Коды верификации поисковых систем. При **замене** кода — старый переносить в
> «Архив» ниже (не удалять бесследно), новый ставить активным.

## Куда ставится

Мета-тег в `<head>` — в [`astro/src/layouts/BaseLayout.astro`](../astro/src/layouts/BaseLayout.astro)
сразу после `<meta name="viewport">`. Layout общий → тег попадает на все страницы
(и на корень `/`, который проверяют вебмастера).

## Активные

| Система | Код (content) | Установлен |
|---|---|---|
| Google Search Console | `klj1lj9utoieH9ZljmhDYykW6XSM3G7dtdVklWGJQw4` | 2026-08-28 |

```html
<meta name="google-site-verification" content="klj1lj9utoieH9ZljmhDYykW6XSM3G7dtdVklWGJQw4" />
```

## Архив (заменённые коды)

_(пусто — прежних Google-верификаций на сайте и на проде не было; текущий код — первый)_
