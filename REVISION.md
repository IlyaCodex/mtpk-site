# Ревизия сайта new.uralinduktor.ru — 2026-05-26

> **Справочно: документ про старый сайт на Astro.** Папка `astro/` удалена 07.10.2026 (есть в истории git);
> сайт теперь — платформа `platform/` (Next.js, база, админка), работаем только локально. Актуальное — [`CLAUDE.md`](CLAUDE.md).

> Полная карта страниц на сервере с разбивкой по редизайн-статусу.
> Используется как точка отсчёта для переезда на Astro и подготовки к боевому режиму.

## Сводка

| Категория | Кол-во | Доля |
|---|---|---|
| **Всего страниц на сервере** | **433** | 100% |
| ✅ Редизайнено (новое меню + наш дизайн) | 123 | 28% |
| 🟡 Legacy WP (старый дизайн, перенесены ранее) | 310 | 72% |

> Изменения 2026-05-26: удалена категория `/products/induktsionnoe-oborudovanie/` (3 страницы) и `/test/` (1 страница). Все URL → 301-редиректы.

Маркер редизайна — наличие пункта «Системы охлаждения» в мегаменю (последняя версия партиала `_partials/header.html`).

---

## 📋 Распределение по архитектурным разделам

### 1. Главные / статичные (3 страницы — 2 редизайн, 2 legacy)

| URL | Статус | Описание |
|---|---|---|
| `/` | ✅ | Главная (index-v7-dmgmori) |
| `/o-company/` | 🟡 | О компании — legacy WP |
| `/proizvodstvo/` | ✅ | Производство — наш редизайн |
| `/proekty/` | ✅ | Хаб «Проекты» — наш редизайн (заглушка, без отдельных кейсов) |
| `/test/` | 🟡 | Тестовая страница (мусор?) |

### 2. Услуги — `/uslugi/*` (6 страниц, ВСЕ legacy 🟡)

| URL | Статус |
|---|---|
| `/uslugi/montazh-shefmontazh/` | 🟡 legacy |
| `/uslugi/obuchenie-personala/` | 🟡 legacy |
| `/uslugi/puskonaladka/` | 🟡 legacy |
| `/uslugi/remont-drobemetov/` | 🟡 legacy |
| `/uslugi/remont-plavilnyh-pechey/` | 🟡 legacy |
| `/uslugi/tehnicheskij-audit/` | 🟡 legacy |

> ⚠️ Нет хаба `/uslugi/` (агрегатора). Только 6 отдельных страниц услуг.

### 3. Каталог `/products/*` (249 страниц)

#### 3.1. Дробемётное оборудование ✅ (65 страниц, **100% редизайнено**)

| URL | Статус | Содержимое |
|---|---|---|
| `/products/drobemetnoe-oborudovanie/` | ✅ | Хаб с 9 тизерами |
| `/products/drobemetnoe-oborudovanie/kranovogo-tipa/` | ✅ | Каталог + 9 product (УИД-376–3750) |
| `/products/drobemetnoe-oborudovanie/barabannogo-tipa/` | ✅ | Каталог + 10 product (УИД-320–28) |
| `/products/drobemetnoe-oborudovanie/s-vrashchayushchimsya-stolom/` | ✅ | Каталог + 4 product (УИД-3512–3525) |
| `/products/drobemetnoe-oborudovanie/dlya-shvellera-i-sorta/` | ✅ | Каталог + 12 product (УИД-1500/1000–3800/1700) |
| `/products/drobemetnoe-oborudovanie/prokhodnye-podvesnogo-tipa/` | ✅ | Каталог + 4 product (УИД-383–4810) |
| `/products/drobemetnoe-oborudovanie/dlya-ochistki-trub/` | ✅ | Каталог + 5 product (УИДТ-20–150) |
| `/products/drobemetnoe-oborudovanie/s-lentochnym-konveyerom/` | ✅ | Каталог + 4 product (УИД-60–120) |
| `/products/drobemetnoe-oborudovanie/s-vykatnym-stolom/` | ✅ | Каталог + 4 product (УИД-765–7630) |
| `/products/drobemetnoe-oborudovanie/peredvizhnye/` | ✅ | Каталог + 3 product (BH270–850) |

#### 3.2. Системы охлаждения ✅ (38 страниц, **100% редизайнено**)

| URL | Статус | Содержимое |
|---|---|---|
| `/products/sistemy-ohlazhdeniya/` | ✅ | Хаб с 2 тизерами |
| `/products/sistemy-ohlazhdeniya/gradirni/` | ✅ | Каталог + 10 product (УИГ-10Т–200Т) |
| `/products/sistemy-ohlazhdeniya/chillery/` | ✅ | Каталог + 25 product (УИЧ-005–30В) |

#### 3.3. Индукционные плавильные печи 🟡 (45 страниц, 1 редизайнено, 44 legacy)

| URL | Статус |
|---|---|
| `/products/induktsionnye-plavilnye-pechi/` | ✅ редизайн (21 модель в каталоге) |
| `/products/induktsionnye-plavilnye-pechi/<44 моделей>/` | 🟡 legacy WP product-страницы |

Legacy product-страницы (примеры): `ui-0-15t-100a`, `ui-0-1t-100`, `ui-0-25t-250`, `ui-0-35t-300`, `ui-0-5t-400`, `ui-0-75t-500`, `ui-1-5t-900`, `ui-2t-1000m`, `ui-10t-3500m`, и т.д. **44 модели.**

#### 3.4. Индукционные нагреватели 🟡 (55 страниц, 0 редизайнено, **ВСЕ legacy**)

| URL | Статус |
|---|---|
| `/products/induktsionnye-nagrevateli/` | 🟡 каталог |
| `/products/induktsionnye-nagrevateli/<54 модели>/` | 🟡 product-страницы |

Серии моделей (54 шт): УИ-05Н220, УИ-10АВ, УИ-10АВВ, УИ-100АВН, УИ-1000СЗ, УИ-1200СЗ, УИ-15АВЗ, УИ-15ЛН, УИ-160АВН, УИ-1800СЗ, УИ-2-35АВЗ, УИ-25АВЗ, УИ-25ЛН, УИ-30АВ, УИ-35АВЗ, УИ-40АВВ, УИ-40Н, УИ-50АВВ, УИ-60Н, УИ-80АВВ, УИ-100Н, УИ-120Н и т.д.

#### 3.5. ~~Индукционное оборудование~~ — УДАЛЕНА 🗑 (2026-05-26)

Категория `/products/induktsionnoe-oborudovanie/` полностью удалена по решению заказчика. Дублировала `/products/induktsionnye-plavilnye-pechi/`.

**Реализованные редиректы:**
- 44 exact-match 301 для конкретных моделей печей → новые слаги в `/induktsionnye-plavilnye-pechi/<slug>/`
- 1 catch-all `^/products/induktsionnoe-oborudovanie(/.*)?$` → `/products/induktsionnye-plavilnye-pechi/`

Все старые ссылки в legacy product-страницах (261 файл с breadcrumb на эту категорию) **продолжат работать** через 301.

#### 3.6. Литейное оборудование

| URL | Кол-во | Статус |
|---|---|---|
| `/products/oborudovanie-lvm/` | 1 категория + 20 моделей = 21 | ✅ категория, 🟡 20 product (legacy WP) |
| `/products/oborudovanie-lgm/` | 1 категория + 12 моделей = 13 | ✅ категория **+ 12 product (редизайн)** |
| `/products/linii-dlya-holodnotverdeyushhih-smesej-hts/` | 1 категория + 7 моделей = 8 | ✅ категория, 🟡 7 product (legacy) |
| `/products/oborudovanie-dlya-peschano-glinistyh-smesej-pgs/` | 1 категория | ✅ только категория, нет product |

ЛВМ (20 моделей l2 legacy): `avtoklav`, `bak-dlya-plavki`, `dvuhkanalnaya-filtraciya`, `gorizontalnye-1pos`, `gorizontalnye-2pos`, `kipyashchij-sloj`, `lite-voska`, `obrabotka-voska`, `ochistka-voska`, `odnokolonnye`, `podacha-voska`, `pulpa`, `pyleulovitel`, `regeneraciya-voska`, `separator`, `sterzhni`, `vertikalnye-1pos`, `vertikalnye-2pos`, `vetrovaya-bashnya`, `vstryahivanie`.

### 4. Проекты `/proekty/*` (178 страниц)

| URL | Статус |
|---|---|
| `/proekty/` | ✅ хаб-заглушка |
| `/proekty/<177 кейсов>/` | 🟡 ВСЕ legacy WP |

Примеры кейсов: `otgruzka-2-edinitsy-uif-143-g-izhevsk`, `postavka-376e`, `postavka-mnlz`, `postavka-uid-3210-4` и т.д.

> 🤔 **Стратегическое решение нужно** (один из 3 вопросов в CLAUDE.md):
> - Перенести все 177 (контент-мусор, но SEO)
> - Агрегировать в одну страницу `/proekty/` с фильтрами (минус SEO)
> - **Гибрид:** оставить 20-30 топ-кейсов как product-страницы, остальные 301 на агрегатор

---

## 🎯 Что нужно сделать к боевому режиму

### Обязательно (блокирующее)

1. **Перенести ключевые статичные страницы на наш дизайн:**
   - [ ] `/o-company/` — есть прототип, нужно задеплоить
   - [ ] 6 страниц `/uslugi/*` — есть прототипы услуг (`usluga-*.html`)? проверить
   - [ ] `/test/` — удалить (мусор)

2. **Каталог `/products/`:**
   - [ ] Создать **хаб** `/products/` (сейчас отсутствует индексная страница каталога)
   - [ ] Подумать что делать с дублем `induktsionnoe-oborudovanie/...pechi-po-stali/` ↔ `induktsionnye-plavilnye-pechi/` — добавить 301-редирект

3. **Решить стратегию для 177 проектов** (см. выше).

4. **Решить судьбу 113 legacy product-страниц** (44 печи + 54 нагревателя + 20 ЛВМ + 7 ХТС):
   - Опция A: оставить как есть с legacy-дизайном (быстро, но 2 разных дизайна на сайте)
   - Опция B: подключить к ним наш header/footer (compromise, частичный редизайн)
   - Опция C: сделать полноценный редизайн каждой (долго, но качественно — у нас уже есть шаблоны)

### Желательно (можно после релиза)

5. Догенерить уникальные рендеры для 35 моделей в системах охлаждения + 55 моделей дробемётов (сейчас общие рендеры по сериям).
6. Перенести `/o-company/` и `/uslugi/*` на новый дизайн.
7. Создать недостающие подкатегории индукционного оборудования (печи для меди, алюминия, транзисторные, и т.п.).

---

## 🚀 Переезд на Astro — план

### Шаг 1. Скаффолд Astro
- Создать `astro/` проект с Tailwind
- Перенести `_partials/header.html` + `_partials/footer.html` → `astro/src/components/Header.astro` + `Footer.astro`
- Перенести брендовые токены `design/tokens/tokens.css` → `astro/src/styles/`

### Шаг 2. Структура контента
- Каталог как **content-коллекция** Astro:
  - `src/content/products/<категория>/<подкатегория>/<товар>.md` с frontmatter (спеки, фото, описание)
- Проекты — content-коллекция `src/content/projects/`
- Услуги — content-коллекция `src/content/services/`

### Шаг 3. Шаблоны
- `src/layouts/CategoryLayout.astro` — хаб категории (тизеры)
- `src/layouts/SubcategoryLayout.astro` — каталог подкатегории (pcard-сетка)
- `src/layouts/ProductLayout.astro` — карточка товара (phero + spec + best-offer)
- `src/layouts/StaticLayout.astro` — для o-company/uslugi/proizvodstvo

### Шаг 4. Перенос текущих страниц
- 124 редизайн-страницы → конвертируем prototype → markdown frontmatter
- 313 legacy — решаем по стратегии (см. выше)

### Шаг 5. Серверная сторона
- `send.php` уже отдельно — оставляем как PHP-обработчик формы
- nginx config — переключение на `astro/dist/` после `npm run build`
- Все 301-редиректы переносим (legacy WP URL → новые pretty URL)

### Шаг 6. Pagefind — статический клиентский поиск
- Заменяет `/poisk/` от WP

### Шаг 7. Деплой и тесты
- `astro/dist/` → rsync на VPS
- Проверка всех 301
- A/B-тест с боевым `uralinduktor.ru` (по плану из CLAUDE.md)

---

## 📊 Стратегические вопросы перед стартом Astro

Принципиально нужно ответить пользователю:

1. **177 проектов** — какая стратегия (см. выше: все / агрегатор / гибрид)?
2. **113 legacy product-страниц** — какая стратегия (legacy-дизайн / частичный редизайн / полноценный)?
3. **Дубли URL** (русско-английские: `/contact/` ↔ `/kontakty/` etc) — есть ли они в нашем переносе?

Все эти вопросы уже заданы в CLAUDE.md → секция «Стратегические решения». Ответ блокирует старт Astro.

---

*Документ актуален на 2026-05-26 после полной ревизии 437 страниц на сервере `uralinduktor-prod`.*
