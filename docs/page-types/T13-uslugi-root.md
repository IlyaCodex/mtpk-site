# T13 · Корень «Услуги»

**URL:** `/uslugi/`
**Источник:** `astro/src/raw-pages/uslugi/body.html` + `meta.json`
**Кол-во страниц:** 1

## Назначение

Корневая страница раздела «Услуги» — индекс из 6 сервисных направлений. По структуре идентична `/products/` (T02), но компактнее: всего одна секция с 6 карточками одной формы.

## Карта блоков

| # | Блок | Класс | Обязательно? |
|---:|---|---|---|
| 1 | Hero (тёмный) | `.cat-hero` | ✅ |
| 2 | Одна секция «6 услуг» в `.scard-grid` (3 колонки на desktop) | `<section class="cat-index">` | ✅ |
| 3 | Leadgen | `<!--C:leadgen-->` | ✅ |
| 4 | Best-offer | `<!--C:best-offer-->` | ✅ |

## Карточки

6 ссылок на T06-страницы услуг, каждая со своим hero-фото (используем тот же что на T06-странице услуги). Заголовок карточки = короткое название услуги (3-4 слова). Мета внизу = роль услуги, не количество.

| Слаг | Заголовок | Hero |
|---|---|---|
| `montazh-shefmontazh` | Монтаж и шефмонтаж | `/img/montazh-hero-blueprint.png` |
| `puskonaladka` | Пусконаладка оборудования | `/img/puskonaladka-hero-realistic.png` |
| `obuchenie-personala` | Обучение персонала | `/img/obuchenie-hero-realistic.png` |
| `tehnicheskij-audit` | Технический аудит | `/img/audit-hero-blueprint.png` |
| `remont-plavilnyh-pechey` | Ремонт плавильных печей | `/img/plavilnye-pechi-hero-realistic.png` |
| `remont-drobemetov` | Ремонт дробемётов | `/img/drobemety-hero-realistic.png` |

## CSS

Базовый блок `inline_styles[0]` копируется из любой `/uslugi/<slug>/meta.json`.
Override `inline_styles[1]` — тот же, что у `/products/` (`.cat-index`, `.scard-grid`, `.scard`).

## SEO

- `<h1>` — «Сервис и инженерное сопровождение» (в hero).
- `<h2>` — название секции («Полный сервис под ключ»).
- `<h3>` — заголовок каждой `.scard`.
- BreadcrumbList JSON-LD автоматически.

## Чек-лист

- [ ] При добавлении новой услуги — добавить и сюда карточку.
- [ ] Hero-картинка услуги синхронизирована с T06.

## Пример

См. live: https://uralinduktor.ru/uslugi/
