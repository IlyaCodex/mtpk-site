# Структура сайта — готовые страницы

> **Только страницы, развёрнутые в проде** на https://uralinduktor.ru/
> Файл ведётся вручную, обновляется при каждом новом релизе.
> Источник правды по тому, что реально доступно по URL.

---

## Дерево URL (с учётом вложенности)

```
/                                                            ← Главная
└── /products/                                                ← Хаб каталога (НЕ ПОСТРОЕН)
    ├── /products/induktsionnoe-oborudovanie/                 ← Категория «Индукционное оборудование»
    │   ├── /products/induktsionnoe-oborudovanie/
    │   │       inductionye-tiristornye-pechi-po-stali/       ← Каталог позиций «Печи для стали»
    │   └── /products/induktsionnoe-oborudovanie/
    │           induktsionnye-tiristornye-pechi/
    │           induktsionnaya-tiristornaya-pech-ui-0-1t-100/  ← Карточка позиции «УИ-0.1Т-100»
    └── /products/oborudovanie-lvm/                            ← Категория «Оборудование ЛВМ»
```

---

## Список готовых страниц

### 1. Главная

- **URL:** `/`
- **Полный URL:** https://uralinduktor.ru/
- **Прототип:** `design/prototypes/index-v7-dmgmori.html`
- **На сервере:** `/var/www/uralinduktor/public/index.html`
- **Назначение:** входная страница сайта. Hero, показатели, форма подбора, «Один партнёр», каталог направлений (8 категорий), литейное под ключ, в наличии, сервис, модернизация, кейс, запрос КП, лизинг (6 партнёров), карта реализованных проектов (Leaflet, 165 объектов), лучшее предложение, подвал.

### 2. Категория — Индукционное оборудование

- **URL:** `/products/induktsionnoe-oborudovanie/`
- **Полный URL:** https://uralinduktor.ru/products/induktsionnoe-oborudovanie/
- **Прототип:** `design/prototypes/category.html`
- **На сервере:** `/var/www/uralinduktor/public/products/induktsionnoe-oborudovanie/index.html`
- **Назначение:** страница категории второго уровня. Full-bleed hero с фото литейного цеха, 7 реальных подкатегорий (печи для стали / меди-латуни / алюминия, транзисторные от 1 кг, конвейер для слитков, тиристорные от 100 кг, футеровочные смеси), лидген с фото-плашкой инженера, тёмный «Почему выбирают» с баннером и шахматной плиткой 6 карточек, выровненные контакты с картой.

### 3. Каталог позиций — Печи для стали

- **URL:** `/products/induktsionnoe-oborudovanie/inductionye-tiristornye-pechi-po-stali/`
- **Полный URL:** https://uralinduktor.ru/products/induktsionnoe-oborudovanie/inductionye-tiristornye-pechi-po-stali/
- **Прототип:** `design/prototypes/catalog.html`
- **На сервере:** `/var/www/uralinduktor/public/products/induktsionnoe-oborudovanie/inductionye-tiristornye-pechi-po-stali/index.html`
- **Назначение:** листинг моделей внутри подкатегории. Full-bleed hero, эргономичный 2-строчный фильтр (масса загрузки + мощность), 21 реальная модель печей со всеми характеристиками, тёмная форма «получить полный каталог», блоки «Почему выбирают» / помощь / контакты.

### 4. Категория — Оборудование ЛВМ

- **URL:** `/products/oborudovanie-lvm/`
- **Полный URL:** https://uralinduktor.ru/products/oborudovanie-lvm/
- **Прототип:** `design/prototypes/category-lvm.html`
- **На сервере:** `/var/www/uralinduktor/public/products/oborudovanie-lvm/index.html`
- **Назначение:** страница категории «Оборудование для литья по выплавляемым моделям». Full-bleed hero с фото линии ЛВМ, 20 подкатегорий в 3 логических группах (Воск · модельное производство — 12 направлений; Керамика · оболочковое формообразование — 4; Вспомогательное и расходники — 4). URL-схема подкатегорий 1-в-1 с боевого сайта uralinduktor.ru/products/oborudovanie-lvm/.

### 5. Карточка позиции — УИ-0.1Т-100

- **URL:** `/products/induktsionnoe-oborudovanie/induktsionnye-tiristornye-pechi/induktsionnaya-tiristornaya-pech-ui-0-1t-100/`
- **Полный URL:** https://uralinduktor.ru/products/induktsionnoe-oborudovanie/induktsionnye-tiristornye-pechi/induktsionnaya-tiristornaya-pech-ui-0-1t-100/
- **Прототип:** `design/prototypes/product.html`
- **На сервере:** `/var/www/uralinduktor/public/products/induktsionnoe-oborudovanie/induktsionnye-tiristornye-pechi/induktsionnaya-tiristornaya-pech-ui-0-1t-100/index.html`
- **Назначение:** страница конкретного товара. Hero товара с фото-галереей, CSS-табы (8 вкладок: характеристики/описание/гарантии/монтаж/обучение/диагностика/запчасти/лизинг), полная таблица из 10 характеристик, best-offer, партнёр, преимущества, кейс, лидген, контакты.

---

## Ассеты (общие, лежат в корне сервера)

| Путь | Что |
|---|---|
| `/tokens/tokens.css` | Дизайн-токены |
| `/brand/logo-color.png` | Цветной логотип |
| `/brand/logo-white.png` | Белый логотип |
| `/brand/leasing/*.svg` | 6 лого лизинговых партнёров (sber, vtb, alfa, delta, gpb, baltlease) |
| `/img/*` | Все изображения сайта (фото, баннеры, иконки, карточки) |
| `/js/phone-mask.js` | Маска ввода телефона |
| `/js/projects-data.js` | Данные 165 объектов для карты проектов |
| `/js/projects-map.js` | Leaflet-карта реализованных проектов |

---

## Схема вложенности каталога

```
Каталог (хаб)            → /products/                                            [не построен]
  └ Категория            → /products/<категория>/                                 [есть: induktsionnoe-oborudovanie]
      └ Каталог позиций  → /products/<категория>/<подкатегория>/                  [есть: inductionye-tiristornye-pechi-po-stali]
          └ Позиция      → /products/<категория>/<кат-моделей>/<позиция>/         [есть: induktsionnaya-tiristornaya-pech-ui-0-1t-100]
```

Логика URL-вложенности **сохраняет схему текущего сайта** uralinduktor.ru — slug'ы те же, чтобы при переезде сохранить SEO.

---

## Что НЕ построено (план)

| URL | Что должно быть | Шаблон |
|---|---|---|
| `/products/` | Хаб «Каталог оборудования» — список всех 8 категорий | `Каталог_оборудования.pdf` |
| `/products/induktsionnoe-oborudovanie/<остальные 6 подкатегорий>/` | Каталоги позиций для других подкатегорий индукции | по образцу catalog.html |
| `/products/induktsionnoe-oborudovanie/induktsionnye-tiristornye-pechi/<остальные 20 моделей>/` | Карточки остальных 20 моделей печей | по образцу product.html |
| `/products/drobemetnoe-oborudovanie/` и вглубь | Дробемёты — категория и ниже | по образцу category/catalog/product |
| `/products/sistemy-ohlazhdeniya/cooling-towers/` и вглубь | Градирни — категория и ниже | то же |
| `/news/`, `/o-company/`, `/contact/` и др. | Статичные страницы из site/ | заглушки нет |

---

*Последнее обновление: 2026-05-20*
