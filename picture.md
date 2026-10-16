# Картинки проекта — карта и правила

> **С 07.10.2026 сайт — платформа `platform/`** (Next.js, база, админка), папка `astro/` удалена. Пути вида
> `astro/src/raw-pages/…` и `astro/public/…` в тексте ниже — исторические: страницы теперь в базе (админка),
> картинки — в медиатеке (S3), адреса `/img/…` те же. Актуальное устройство — [`CLAUDE.md`](CLAUDE.md).

> **Папка `picture/`** — источник правды по всем изображениям, используемым на сайте.
> Структура повторяет вложенность сайта: для страниц-разделов создаются папки
> в соответствии с URL.

---

## Правила работы с картинками

1. **Все используемые на сайте картинки** хранятся в папке `picture/`.
2. **Структура папок** повторяет вложенность URL сайта:
   - общие для всего сайта → `picture/shared/`
   - бренд (лого, фавиконы) → `picture/brand/`
   - партнёры (лизинг и т.д.) → `picture/brand/leasing/` и аналогично
   - страница главной → `picture/index/`
   - категория → `picture/products/<категория>/`
   - подкатегория → `picture/products/<категория>/<подкатегория>/`
   - карточка позиции → `picture/products/<категория>/<кат-моделей>/<позиция>/`
3. **Именование файлов** — понятное, kebab-case (английский), без пробелов.
   Хорошо: `hero-induction-furnace.png`, `manager-portrait.png`.
   Плохо: `IMG_1234.jpg`, `Без названия (1).png`.
4. **Источник новых картинок** — генерация через **fal.ai** с моделью
   **GPT Image (Chat GPT Image 2)**. См. правила в `style.md`.
5. **При добавлении новой картинки** на сайт:
   - копия → в соответствующую папку `picture/...`
   - запись в этом файле (`picture.md`) о назначении и странице использования
   - копия в `design/prototypes/img/` для прототипа
   - при деплое — копия в `/var/www/uralinduktor/public/img/`

---

## Текущая структура `picture/`

```
picture/
├── brand/                                       # лого и бренд-ассеты
│   ├── logo-color.png                           # основной цветной лого
│   ├── logo-white.png                           # лого на тёмном фоне
│   └── leasing/                                 # лого партнёров
│       ├── alfa.svg
│       ├── baltlease.svg                        # с обводкой black, fill #1F2937
│       ├── delta.svg
│       ├── gpb.svg
│       ├── sber.svg
│       └── vtb.svg
│
├── products/peskostruynoe-oborudovanie/          # фотопакет V9 от 16.09.2026
│   ├── 01_МОДЕЛИ/                               # общие виды и крупные планы 5 моделей
│   ├── 02_УЗЛЫ_И_КАМЕРЫ/                        # камеры, сопла, поворотные столы
│   └── 03_КОМПЛЕКТУЮЩИЕ/                        # сопла и клапаны (на сайте пока не используются)
│
├── products/gruzopodemnye-elektromagnity/        # пакет «Грузоподъёмные электромагниты» v2 (09.10.2026)
│   └── *-480.webp, *-900.webp                   # round, oval, pipes, billets, cabinet, reel — в медиатеке
│                                                # /img/gruzopodemnye-elektromagnity/ (раздел и 6 страниц, корень каталога)
├── products/dop-oborudovanie/                    # пакет «Доп оборудование» v2 (09.10.2026)
│   ├── zagruzochnaya-telezhka.webp, relsovaya-elektroplatforma.webp, rukavnyy-filtr.webp
│   ├── layout.svg, filter-flow.svg              # схемы: планировка загрузки, работа рукавного фильтра
│   └── *-zapros.txt                             # задания для подбора — в медиатеке /files/dop-oborudovanie/
│                                                # картинки — /img/dop-oborudovanie/ (3 страницы, корень каталога)
├── products/kontrolno-izmeritelnye-pribory/      # раздел КИП (со старого сайта 16.10.2026): <slug>.webp 900×900 —
│                                                # фото приборов (карточка товара), card-<slug>.webp 800×600 — обложки
│                                                # (карточки раздела, корень каталога, главная) — /img/kontrolno-izmeritelnye-pribory/
├── products/zapchasti/tigli/                     # пакет «Тигли» V4.3 (09.10.2026): 18 фото (photo-*.png,
│                                                # graphite-quartz.png) и 13 схем размеров (dimensions-*.svg) —
│                                                # в медиатеке /img/crucibles/ (12 страниц, хаб запчастей, корень каталога)
│
├── otzyvy/                                      # благодарственные письма для /otzyvy/
│   └── *.pdf                                    # 9 оригиналов писем (Desktop/Письма);
│                                                # страницы отрисованы в /img/reviews/*.webp, 1000px
│
├── o-company/                                   # уникальное для /o-company/
│   ├── office-hero.jpg                          # фасад/интерьер офиса УралИндуктор (IMG_1714.HEIC → JPEG, max 2400px)
│   ├── company-main.jpg                         # основное фото компании (уи3.jpg) — в блоке «Производственная база»
│   └── company-secondary.jpg                    # дополнительное фото (уи2.jpg) — в тёмной story-секции «14 лет работы»
│
├── shared/                                      # картинки, используемые на 2+ страницах
│   ├── manager-portrait-v2.png                  # инженер Дмитрий — все 5 страниц
│   ├── banner-service.png                       # сервис-баннер — 4 страницы (фон why-us и др.)
│   ├── photo-drobemet.jpg                       # дробемёт в цеху — все 5 (featured Услуги)
│   ├── photo-furnace.jpg                        # печь — 3 страницы
│   ├── prod-furnace.png                         # печь зелёная — 2 страницы
│   ├── product-green-furnace-clean.png          # печь зелёная (clean) — 2 страницы
│   ├── cat-clean-mnlz.png                       # МНЛЗ — 2 страницы (главная, категория)
│   ├── cat-clean-zapchasti.png                  # футеровочные смеси — 2 страницы
│   ├── hero-induction-furnace.png               # тёмный hero ИО — 2 страницы (категория, каталог)
│   └── hero-bg-v1-ural.png                      # старый hero-фон (вероятно dead css)
│
├── index/                                       # уникальное для главной (/)
│   ├── banner-modern-v2.png                     # баннер «Модернизация» на главной
│   ├── turnkey-scheme.svg                       # «Литейное производство под ключ»: изометрическая схема участка (SVG, 2026-10-09)
│   ├── turnkey-scheme-dark.svg                  # то же для тёмной темы
│   ├── cat-clean-aluminij.png                   # каталог-карточка «Алюминий»
│   ├── cat-clean-cooling.png                    # «Охлаждение»
│   ├── cat-clean-induktion.png                  # «Индукция»
│   ├── cat-clean-litejnoe.png                   # «Литейное»
│   ├── cat-clean-mufelnaya.png                  # «Муфельная»
│   ├── cat-photo-drobemet-clean.jpg             # фото дробемёта
│   └── partner-hero-furnace-night.png           # cinematic hero блока «Один партнёр»
│                                                # (21:9, печь с расплавом, fal.ai nano-banana-pro)
│
└── products/
    ├── induktsionnye-plavilnye-pechi/           # каталог /products/induktsionnye-plavilnye-pechi/
    │   ├── hero-induction-melting.png           # cinematic hero, печь с расплавом
    │   │                                         # (16:9, fal.ai nano-banana-pro, 2026-05-24)
    │   │
    │   └── ui-0-1t-100/                         # карточка /products/induktsionnye-plavilnye-pechi/ui-0-1t-100/
    │       ├── ui-0-1t-100-photo-1.png          # общий вид плавильного узла (с боевого WP, 738 KB)
    │       ├── ui-0-1t-100-photo-2.jpg          # реальное фото в цеху (IMG_20250926, 681 KB)
    │       ├── ui-0-1t-100-photo-3.jpg          # реальное фото — слив расплава (IMG_20250425, 714 KB)
    │       ├── ui-0-1t-100-photo-4.jpg          # реальное фото — плавка металла (IMG_20241115, 501 KB)
    │       └── ui-0-1t-100-photo-5.jpg          # реальное фото — установка целиком (IMG_20240124, 780 KB)
    │                                             # Используются в галерее phero (5 thumbs:
    │                                             #  1=plavilnye-uzel-realistic-logo.png рендер,
    │                                             #  2-5=реальные фото в порядке 1→5).
    │                                             # В деплое: /img/ui-0-1t-100-photo-1..5.{png,jpg} плоско.
    │
    ├── drobemetnoe-oborudovanie/                # хаб /products/drobemetnoe-oborudovanie/
    │   │                                         # + страница моделей /products/drobemetnoe-oborudovanie/kranovogo-tipa/
    │   │
    │   ├── hero-shotblast.png                   # hero 16:9 — проходная установка
    │   │                                         # (gpt-image-2-edit, реф ФОТО/.../Проходного типа/1.jpg)
    │   ├── divider-shotblast-action.png         # 21:9 — конвейер с резиновыми завесами
    │   │                                         # (реф ФОТО/.../Проходного типа/2.jpg)
    │   │
    │   ├── product-card-shotblast.png           # 4:3 hub-карточка «Кранового типа»
    │   ├── card-baraban.png                     # 4:3 hub «Барабанного типа»
    │   ├── card-stol.png                        # 4:3 hub «С вращающимся столом»
    │   ├── card-shveller.png                    # 4:3 hub «Швеллер/двутавр/сорт»
    │   ├── card-podves.png                      # 4:3 hub «Проходные подвесного»
    │   ├── card-truby.png                       # 4:3 hub «Для очистки труб»
    │   ├── card-lenta.png                       # 4:3 hub «С ленточным конвейером»
    │   ├── card-vykatnoy.png                    # 4:3 hub «С выкатным столом»
    │   ├── card-peredvizhnoy.png                # 4:3 hub «Передвижные»
    │   │                                         # (все 9 hub: gpt-image-2-edit с эталонов
    │   │                                         #  uralinduktor.ru/wp-content/uploads/2025/...
    │   │                                         #  спека: design/decisions/category-cards-photoreal-spec.md)
    │   │
    │   ├── model-uid-376.png                    # 4:3 карточка модели УИД-376
    │   ├── model-uid-376e.png                   # 4:3 УИД-376Е
    │   ├── model-uid-378.png                    # 4:3 УИД-378
    │   ├── model-uid-378e.png                   # 4:3 УИД-378Е
    │   ├── model-uid-3710.png                   # 4:3 УИД-3710 (корпус антрацит, акценты green)
    │   ├── model-uid-3710e.png                  # 4:3 УИД-3710Е
    │   ├── model-uid-3720.png                   # 4:3 УИД-3720
    │   ├── model-uid-3720e.png                  # 4:3 УИД-3720Е
    │   └── model-uid-3750.png                   # 4:3 УИД-3750 flagship
    │                                            # (9 моделей: gpt-image-2-edit с реф-фото
    │                                            #  Сайт uralinduktor.ru/wp-content/uploads/...
    │                                            #  376/376E реф photo_2025-10-13_17-29-26.jpg,
    │                                            #  378/378E реф photo_2026-02-27_12-18-02.jpg,
    │                                            #  3710-3720E реф IMG_20180314_182044 (перекрашен из синего),
    │                                            #  3750 реф uid-3750-05.jpg)
    │
    │   ├── uid-376-gallery/                      # реальные фото УИД-376 (4 шт. с боевого uralinduktor.ru)
    │   │   └── uid-376-photo-1..4.jpg
    │   ├── uid-378-gallery/                      # реальные фото УИД-378 (4 шт.)
    │   │   └── uid-378-photo-1..4.jpg
    │   ├── uid-378e-gallery/                     # реальные фото УИД-378Е (4 шт.)
    │   │   └── uid-378e-photo-1..4.jpg
    │   ├── uid-3710-gallery/                     # реальные фото УИД-3710 (4 шт., архивные IMG_2016...)
    │   │   └── uid-3710-photo-1..4.jpg
    │   ├── uid-3710e-gallery/                    # реальные фото УИД-3710Е (4 шт.)
    │   │   └── uid-3710e-photo-1..4.jpg
    │   ├── uid-3720-gallery/                     # реальные фото УИД-3720 (3 шт.)
    │   │   └── uid-3720-photo-1..3.jpg
    │   ├── uid-3720e-gallery/                    # реальные фото УИД-3720Е (3 шт., те же что 3720)
    │   │   └── uid-3720e-photo-1..3.jpg
    │   ├── uid-3750-gallery/                     # реальные фото УИД-3750 (2 шт.)
    │   │   └── uid-3750-photo-1..2.jpg
    │   │   # Используются на product-страницах /products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-<slug>/
    │   │   # в галерее phero (1-й thumb — рендер model-uid-<slug>.png, далее реальные фото).
    │   │   # В деплое: /img/uid-<slug>-photo-1..N.jpg плоско.
    │   │
    │   ├── uid-376e-gallery/                     # реальные фото УИД-376Е с боевого uralinduktor.ru
    │   │   ├── photo_2025-09-18_15-19-48.jpg    # в цеху, надпись «УРАЛ ИНДУКТОР» на двери
    │   │   ├── photo_2025-10-09_15-33-13.jpg    # закрытая дверь + тельферы + шкаф
    │   │   ├── photo_2025-10-09_15-38-48.jpg    # деталь конструкции
    │   │   ├── photo_2025-10-13_17-29-26.jpg    # крупный план зелёного УИД с тельферами
    │   │   └── IMG_20171130_115135-scaled.jpg   # архив, синяя/красная окраска — НЕ использовать
    │   │
    │   │   # Используются на /products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-376e/ в галерее phero
    │   │   # (5 thumbs: 1) model-uid-376e.png рендер, 2)-5) 4 реальных фото).
    │   │   # В деплое: /img/uid-376e-photo-1..4.jpg (порядок:
    │   │   #   1=photo_2025-09-18, 2=photo_2025-10-13, 3=photo_2025-10-09_15-33-13, 4=photo_2025-10-09_15-38-48)
    │   │
    │   ├── # Барабанный тип — 10 моделей (uid-320..28). ПЕРЕРИСОВАНЫ 2026-06-16 в цех-канон v3
    │   │   # (nano-banana-pro-edit от реальных фото из ФОТО/…/Дробеметные установки барабанного типа),
    │   │   # БЕЗ текста-оверлея (старые были CGI с титром «ДРОБЕМЕТНЫЕ УСТАНОВКИ…» + бейдж «Россия»).
    │   │   # Мастера 1000×750: picture/products/drobemetnoe-oborudovanie/uid-<slug>-gallery/uid-<slug>-photo-1.*
    │   │   # Прод-плоско: _astro_assets/img/uid-<slug>-photo-1.* (+ .webp-сосед, nginx отдаёт по Accept).
    │   │   # Источники по моделям (конструкция сохранена 1:1):
    │   │   #   uid-320 ← WeChat_20210406095522 (зелёно-серый шкаф ¾)
    │   │   #   uid-322 ← 322.jpg (зелёный корпус + оранж. крышка)
    │   │   #   uid-324 ← photo_2023-12-11_11-07-54 (зелёный шкаф с лентой)
    │   │   #   uid-326 ← Модель 326/photo_2026-02-27_11-31-08 (шкаф + пылесборник + пульт)
    │   │   #   uid-3110, uid-3113 ← 3110/photo_2026-02-27_11-50-28 (зелёный барабан; 3113 своего фото нет)
    │   │   #   uid-3210 ← Модель 3210/photo_2026-02-27_11-40-43 (большой шкаф + пылесборник ¾)
    │   │   #   uid-3220 = uid-15 = uid-28 ← перерисовка CGI-рендера установки без текста (общий кадр на 3 крупные)
    │   │   # На product-страницах barabannogo-tipa/uid-<slug>/ — 2-е фото в phero (1-е = card-baraban рендер).
    │   │   # На каталоге barabannogo-tipa/ — те же 10 как pcard-обложки (4:3 cover).
    │   │   # Галерея phero УИД-326 живёт отдельной папкой: /img/drobemet/uid-326/01…06.webp + t01…t06.webp
    │   │   #   (полный кадр + миниатюра 480×360 cover). 06.webp добавлен 30.09.2026 из Desktop/photo
    │   │   #   (фото Евгения: барабанный дробемёт в цеху, зелёный корпус с шильдиком УРАЛИНДУКТОР).
    │
    ├── induktsionnoe-oborudovanie/              # категория /products/induktsionnoe-oborudovanie/
    │   ├── cat-induction.png                    # карточка подкатегории — медь/латунь
    │   ├── cat-photo-aluminij.png               # карточка — алюминий
    │   │
    │   ├── inductionye-tiristornye-pechi-po-stali/   # каталог «Печи для стали»
    │   │   └── plavilnye-uzel-realistic-logo.png     # фото на всех 21 карточке моделей
    │   │
    │   └── induktsionnye-tiristornye-pechi/          # подкатегория моделей
    │       └── induktsionnaya-tiristornaya-pech-ui-0-1t-100/   # карточка позиции
    │           └── hero-furnace.png                  # фото-галерея товара
    │
    ├── oborudovanie-lvm/                        # категория /products/oborudovanie-lvm/
    │   └── lvm-line-realistic.png               # full-bleed hero, линия ЛВМ в цеху
    │
    ├── oborudovanie-dlya-peschano-glinistyh-smesej-pgs/  # категория /products/...pgs/
    │   ├── pgs-hero-v2.png                      # МАСТЕР cat-hero (2752×1536) — зелёная шнековая
    │   │                                         # установка ПГС в цех-каноне (ТЗ-1 #9, edit от реал-фото
    │   │                                         # старого сайта). Прод: /img/pgs/real/hero.jpg?v=2 (1920w)
    │   ├── pgs-hero-realistic.png               # старый AI-hero (чашечный смеситель) — НЕ используется
    │   └── real/                                # реальные фото товаров (8 карточек) + старый hero.jpg
    │                                             # (снежное уличное фото — заменён на pgs-hero-v2)
    │
    └── sistemy-ohlazhdeniya/                    # категория /products/sistemy-ohlazhdeniya/
        ├── hero-cooling.png                     # 16:9 hero хаба + нижний section-divider (ОДИН файл, оба места).
        │                                         # ?v=4 — ПЕРЕРИСОВАН 2026-06-17 (/fix→/product-image): комбо
        │                                         # из НОВОЙ чистой глянцевой градирни (с белым лого, card-gradirni.png)
        │                                         # справа + чиллер (card-chillery.png) центр-слева, в ДРУГОМ тёмном
        │                                         # цеху, тёмное поле слева под читаемый белый текст hero. 1920×1080
        │                                         # +webp. Конструкции обеих машин сохранены. nano-banana-pro-edit 16:9 2K.
        │                                         # Прежний ?v=3 — старая потрёпанная градирня + чиллер.
        │                                         # ⚠️ Смена inline meta.json → новый хэш inline-extracted, нужна ДВОЙНАЯ сборка.
        ├── hero-cooling-combo-v1.png             # мастер 16:9 (2752×1536) — combo градирня+чиллер, источник прод-копии (2026-06-08)
        ├── hero-cooling-v2.png                   # прежний мастер (только градирня, ТЗ-2 п.2) — оставлен в архиве
        ├── card-gradirni.png                    # 4:3 hub-карточка градирен УИГ + главное фото всех 10 product-страниц
        ├── card-chillery.png                    # 4:3 hub-карточка чиллеров УИЧ + главное фото всех 25 product-страниц
        ├── gradirni-gallery/                    # 4 фото для phero-галереи всех 10 продуктов УИГ
        │   └── gradirni-photo-1..4.png          # реальные фото со старого WP + локального архива
        │                                         # на сервере: /img/gradirni-photo-1..4.png?v=1
        └── chillery-gallery/                    # 4 фото для phero-галереи всех 25 продуктов УИЧ
            └── chillery-photo-1..4.png          # реальные фото с локального архива (uich-*.jpg → .png через sips)
                                                  # на сервере: /img/chillery-photo-1..4.png?v=1
```

---

## Использование по страницам

### Главная — `/`
**Источники:** `picture/brand/`, `picture/shared/`, `picture/index/`
- Hero-фон, manager-portrait, banner-modern, banner-service, 8 catalog-карточек,
  photo-furnace + photo-drobemet (в кейсе и featured Услуги мегаменю).
- «Литейное производство под ключ» (2026-10-09): схема участка — векторная иллюстрация по макету
  Евгения (код, не генерация), `/img/home/turnkey-scheme.svg`, в тёмной теме — `turnkey-scheme-dark.svg`.

### Категория «Индукционное оборудование» — `/products/induktsionnoe-oborudovanie/`
**Источники:** `picture/brand/`, `picture/shared/`, `picture/products/induktsionnoe-oborudovanie/`
- Hero: `picture/shared/hero-induction-furnace.png` (full-bleed)
- 7 subcat-карточек: смесь из `picture/shared/` (photo-furnace, prod-furnace,
  product-green-furnace-clean, cat-clean-mnlz, cat-clean-zapchasti) +
  локальных (cat-induction, cat-photo-aluminij).
- Why-us banner: `picture/shared/banner-service.png`
- Manager в лидгене: `picture/shared/manager-portrait-v2.png`

### Каталог «Индукционные плавильные печи» — `/products/induktsionnye-plavilnye-pechi/`
- Hero: `picture/products/induktsionnye-plavilnye-pechi/hero-induction-melting.png`
  (full-bleed, печь с расплавом, индукционная катушка, тёплая подсветка тигля)
- Все 21 продуктовая карточка: `picture/products/induktsionnoe-oborudovanie/inductionye-tiristornye-pechi-po-stali/plavilnye-uzel-realistic-logo.png`
- Manager + banner-service + общие блоки из shared.
- _Историческое:_ страница ранее жила под старым URL
  `/products/induktsionnoe-oborudovanie/inductionye-tiristornye-pechi-po-stali/`
  с hero `picture/shared/hero-induction-furnace.png` — старый URL теперь 301.
- Тизер 4-й подкатегории (хаб): `card-pech-tranzistor.png?v=1` (+ `.webp`) — цех-канон,
  перерисовка фото УИ-160п через /product-image (nano-banana-pro-edit, 2026-06-16);
  архив `picture/products/induktsionnye-plavilnye-pechi/card-pech-tranzistor{,-src}.png`.
- **Общая главная для `po-stali` с массой ≥150 кг** (2026-06-23, /product-image,
  цех-канон v3). Файл `astro/public/img/catalog-pech-po-stali.png` (1200×900, 492 KB,
  +`.webp` 80 KB; мастер `picture/products/induktsionnye-plavilnye-pechi/catalog-pech-po-stali.png`):
  композит из двух рефов nano-banana-pro-edit — одна тиристольная печь + гидравлическая
  печь глухим фасадом + зелёный шкаф управления (рефы: прежняя `catalog-furnace-bucket-s`
  для тиристоли+шкафа и `pech-gidravlika-main` для фасада). Назначена главной (phero__main +
  thumb-0) на **20 позициях** `po-stali` с массой плавки ≥150 кг; под порог не попала только
  `ui-0-1t-100` (100 кг). Галерейные фото на страницах не тронуты. Прежние главные
  (`catalog-furnace-bucket-{s,m,l,xl}`, `pech-gidravlika-main`) перезаписаны НЕ были — они
  используются в других разделах; заменена только ссылка. Промежуточное имя
  `ui-0-15t-160-main.png` (от 2026-06-23) удалено как дубль.
  - **Синхронизация листинга категории (правило T04):** миниатюры `.pcard` в
    `po-stali/body.html` приведены к главной товарной страницы (все 21 карточки:
    20 ≥150 кг → `catalog-pech-po-stali.png`, `ui-0-1t-100` → свой `ui-0-1t-100-render-v1.png`).
    Был давний дрейф (листинг не совпадал с героем). `stock.json` (`image`+`cardHtml`)
    подтянулся из листинга через `build-stock.mjs`. Правило закреплено в
    [docs/page-types/T04-category.md](docs/page-types/T04-category.md).
- **Реальные фото печей в галереи по массе** (2026-06-29). Из `Desktop/Фотографии` (папки по массе)
  обработаны sharp (автоповорот EXIF, ≤1600px, jpg q82 + webp) → `astro/public/img/pech-<масса>-N.jpg(+webp)`,
  где масса ∈ `100kg(4), 150kg(11), 250kg(7), 500kg(11), 1t(6), 15t(8)` = **47 фото**. Метал-агностичны
  (в 150кг есть кадр «алюминий») → одни и те же фото массы идут на модель этой массы во **всех 3 разделах**
  (сталь/медь/алюм), 20 страниц. На странице: главное фото-рендер (thumb 0) сохранено, реальные фото —
  thumbs 1..N в **карусели** (`.phero__thumbs--scroll`, прокрутка при >5; лайтбокс листает все). НЕ затронуты
  «на гидравлике» и массы без папки (0.35Т, 0.75Т, 2Т+). Прод-файлы — в симлинк-таргете `img`.

### Подкаталог «Транзисторные печи (IGBT)» — `/products/induktsionnye-plavilnye-pechi/tranzistornye/` (2026-06-16)
- **Hero раздела:** `hero-pech-tranzistor.png?v=1` (+ `.webp`, 2048×1143) — чистый цех с плавкой
  металла транзисторной печью УИ-160п (конструкция сохранена, оранжевый расплав в тигле).
  nano-banana-pro-edit из фото УИ-160п (2026-06-16). Переопределяет общий `kategoriya-pechi.css`
  (`hero-pech-stal-v6.png`) через page-specific inline-style в `tranzistornye/meta.json` —
  только для этой страницы. Архив: `…/tranzistornye/hero-pech-tranzistor{,-src}.png`.
- **Section-divider перед лидгеном:** `divider-tranzistor-melting.png?v=2` (+ `.webp`, 1584×672) —
  цех с плавкой металла транзисторными печами (наклоняемые тигельные печи УИ-160п на стальных
  рамах + зелёные шкафы, рабочие, слив раскалённого расплава). nano-banana-pro-edit (2026-06-16).
  v2 — переотрисовка: в v1 печи вышли как обычный «тигель-в-шкафу» (читались тиристорными),
  v2 даёт характерную наклоняемую транзисторную конструкцию (референс — hero-рендер + фото УИ-160п).
  Задаётся inline в `tranzistornye/body.html` вместо общего `divider-engineering.png` — только на
  этой странице (у остальных 4 категорий дивайдер прежний).
- **Фото товаров — реальные снимки узлов со старого сайта** (исключение из правила №9,
  согласовано с Евгением). Архив: `picture/products/induktsionnye-plavilnye-pechi/tranzistornye/`.
  Серв-копии — `astro/public/img/` (+ `.webp`-соседи).
- Главные фото узлов: `ui-tranzistor-nastolnaya.png` (настольные 1П–10П),
  `ui-25p-uzel.jpg` (15П/25П), `ui-35p-uzel.png`, `ui-45p-uzel.png` (+ `ui-45p-02.jpg`, `ui-45p-03.png`),
  `ui-70p-uzel.jpg`, `ui-90p-uzel.jpg`, `ui-110p-uzel.jpg`, `ui-160p-uzel.jpg`.
- **УИ-35П `ui-35p-uzel.png?v=2` — перерисована (2026-06-16, /fix→/product-image).** Старое фото было
  600×600 → в карточке каталога и главным фото товара мылило и резалось. Заменено на вырезку на
  белом фоне (как соседи по странице — стиль `ui-25p-uzel.jpg`), 800×800, +`.webp`-сосед.
  nano-banana-pro-edit из реального фото комплекта `IMG_1218.png` (4272×2848: шкаф УралИндуктор +
  трансформаторный блок + наклонная печь). `?v=1→?v=2` в 3 ссылках (карточка + главное фото + миниатюра).
- Общие кадры галерей (цех): `tranzistor-tsex-3.jpg`, `tranzistor-tsex-4.jpg` (+ `tranzistor-tsex-1/2`, `tranzistor-preobrazovatel.jpg`).

### Позиция «УИ-0.1Т-100» — `/products/induktsionnye-plavilnye-pechi/ui-0-1t-100/`
- Phero-галерея (5 слайдов):
  - 1-й слайд: `picture/products/induktsionnye-plavilnye-pechi/ui-0-1t-100/ui-0-1t-100-render-v1.png`
    (мастер 1200×896; прод-плоско `astro/public/img/ui-0-1t-100-render-v1.png?v=2`, 435 KB).
    **2026-06-06: выровнен в цех-канон v3** (был серый студийный рендер) — nano-banana-pro-edit
    от самой карточки + эталон цеха `catalog-furnace-bucket-s`, геометрия 1:1, заменён фон.
  - 2-5 слайды (реальные фото с боевого WP): `picture/products/induktsionnye-plavilnye-pechi/ui-0-1t-100/ui-0-1t-100-photo-1..5.{png,jpg}`
- Общие блоки (catalog-cta, partner, adv, best-offer) — без локальных фото.
- _Историческое:_ ранее карточка жила по длинному URL
  `/products/induktsionnoe-oborudovanie/induktsionnye-tiristornye-pechi/induktsionnaya-tiristornaya-pech-ui-0-1t-100/`
  — теперь 301 → новый короткий URL.

### О компании — `/o-company/`
**Источники:** `picture/brand/`, `picture/o-company/`, `astro/public/img/team/`
- Hero full-bleed: `picture/o-company/office-hero.jpg` (фото офиса)
- Блок «Производственная база» (2 фото): `picture/o-company/company-main.jpg` + `picture/o-company/company-secondary.jpg`
- Тёмная story-секция «14 лет работы»: `picture/o-company/company-secondary.jpg` справа с градиентным overlay
- Файлы в `design/prototypes/img/`: `o-company-office.jpg`, `o-company-main.jpg`, `o-company-secondary.jpg`
- **Блок «Команда» (12 фото):** `astro/public/img/team/*.png` — портреты
  сотрудников 211–238 px, RGBA, ~60 КБ каждое. Источник — слепок боевого
  сайта `site/contact/images/`. Имена в kebab-case без имени фамилии:
  - Дирекция: `nikolay.png` · `anton.png` · `andrey.png` *(в разметке не
    используется, оставлено в репо)*
  - Отдел продаж: `polina.png` · `raushania.png` · `olesya.png` · `anna.png`
    *(Михаил — без фото, placeholder с инициалом «М»)*
  - Инженерный: `vladimir.png` · `dmitry-d.png` · `dmitry-p.png`
  - Бухгалтерия: `julia.png` · `ekaterina.png`

### Контакты — `/kontakty/` (2026-10-11)
- Шапка: `/img/o-company-main.jpg` — здание компании с вывеской (исходник `picture/o-company/company-main.jpg`,
  807×545: для фона во весь экран мал, поэтому — фото в рамке справа от заголовка).
- Команда (перенесена сюда с «О компании»): `/img/team/*.jpg` — портреты 640×800 с логотипом в углу —
  в карточке квадратом со сдвигом вниз (лицо крупнее, логотип за кадром), на телефоне — миниатюра 96 px.

### Практикум — `/praktikum/` (2026-10-13)
- Шапка: `/praktikum/assets/hub-hero.webp` — выпуск металла (копия фото статьи «Заливка металла в формы»,
  `praktikum/zalivka-metalla-v-formy/assets/vypusk-metalla-pavlodar.webp`, 1057×1488) — справа, под тёмным градиентом.
- Обложки статей: `/praktikum/assets/*-card.webp` (900 px); схемы с подписями (неисправности, дефекты, выбивка,
  литниковая система, контроль, регенерация, аспирация, планировка) показываются целиком, без обрезки.

### Праздничные баннеры главной — `/img/holidays/` (2026-10-13)
Шапка главной в дни праздников (админка «Праздники»). Исходники — `picture/elever/` (5504×3072, имена
файлов — хеши: ниже по первым 8 символам), в медиатеке — мастер 2560×1429 JPEG; копии по ширине и
AVIF/WebP делает медиасервис. Композиция у всех одна: тёмно-синее поле слева под текст, сюжет справа.

| Праздник | Баннер | Исходник |
|---|---|---|
| Новый год (1 января) | `new-year.jpg` — ёлка из шестерён, синие шары | `1997faa6…` |
| День защитника Отечества | `defender-day.jpg` — звезда на щите, лавр | `1a4ddd35…` |
| Всемирный день стандартов | `standards-day.jpg` — монитор с моделью редуктора, детали | `42e28c35…` |
| День машиностроителя | `machine-builder-day.jpg` — станок, шестерни, подшипники | `487a87c5…` |
| Праздник Весны и Труда | `labour-day.jpg` — шестерня с ключом и цветущей веткой | `858e1284…` |
| Международный женский день | `womens-day.jpg` — тюльпаны и мимоза с серебряной лентой | `8592a465…` |
| День России | `russia-day.jpg` — флаг и серебряный город | `94562b62…` |
| День изобретателя и рационализатора | `inventor-day.jpg` — механизм и лампочка | `a3236e0d…` |
| День Победы | `victory-day.jpg` — Вечный огонь, гвоздики, георгиевская лента | `b1d01ec1…` |
| С наступающим Новым годом (31 декабря) | `new-year-eve.jpg` — подарки у ёлки, снег за окном | `c6641959…` |
| День сварщика | `welder-day.jpg` — сварщик за работой | `da1ce87f…` |
| День металлурга | `metallurgist-day.jpg` — разливка металла из ковша | `dc9dca7e…` |

### В наличии на складе — `/nalichie/`
**Источники:** `astro/public/img/nalichie/`
- **Hero full-bleed:** `astro/public/img/nalichie/nalichie-hero.jpg?v=2` (+`.webp` сосед)
  - Размер: 1920×1071 (16:9), ~367 КБ JPEG / ~211 КБ WebP. Мастер:
    `picture/nalichie/nalichie-hero-v2.png` (2752×1536).
  - Источник (ТЗ-1 #3, 2026-06-06): рабочий активный цех — пара зелёных
    тигельных индукционных печей с рабочими (центр-слева) + зелёный
    брендированный дробемёт «УРАЛ ИНДУКТОР» с циклонами и жёлтым рольгангом
    (справа), открытый освещённый пол слева под overlay-текст. Собрана
    через **nano-banana-pro-edit** из реальных фото производства:
    дробемёт `ФОТО/…/Дробеметные установки…/photo_2026-01-27_10-59-35.png`
    + индукционная печь `ФОТО/…/Тиристорные печи общее/IMG_20210125_090956.jpg`
    + канон-атмосфера прежнего hero. Было — спокойная складская площадка.
  - Используется как `background-image` в `.cat-hero__image` с тёмным overlay.
- **Карточки товаров:** изображения подтягиваются автоматически из страниц
  товара (по правилу: первое `<img>` либо `phero__main`/`phero__hero`).
  Никаких собственных ассетов для подсистемы «Наличие» НЕ ХРАНИМ —
  всегда переиспользуем те, что уже лежат для конкретного товара.
- **«Поставка под заказ»** (2026-10-10): иллюстрация по макету Евгения — векторная изометрия
  (код, не генерация; та же манера, что схема «под ключ» на главной): агрегат на раме, ящик на поддоне,
  чертёж. `/img/nalichie/order-scheme.svg`, в тёмной теме — `order-scheme-dark.svg`
  (исходники — `picture/nalichie/order-scheme(-dark).svg`).

### Категория «Оборудование ЛВМ» — `/products/oborudovanie-lvm/`
- Full-bleed hero: `picture/products/oborudovanie-lvm/lvm-line-realistic.png`
- 20 subcat-карточек: переиспользуют `lvm-line-realistic.png` (единая визуальная
  идентификация раздела).
- **Карточка «Расходники и комплектующие»** (`raskhodniki`) — отдельная картинка
  `21-raskhodniki.jpg` (600×450 +.webp, белый фон, object-fit:contain). Сюжет —
  гранулы модельного состава (зелёный воск), как на старом сайте
  (`raskhodniki-icons.png` с боевого WP, 2026-04). Источник-эталон:
  `picture/products/oborudovanie-lvm/refs/raskhodniki-icons.png`; мастер 4:3 —
  `picture/products/oborudovanie-lvm/products/21-raskhodniki.png`; прод-файлы —
  `astro/public/img/lvm-products/21-raskhodniki.jpg(+.webp)`. Используется в хабе
  `/products/oborudovanie-lvm/` и как hero страницы `…/raskhodniki/`. (2026-06-08:
  заменили ошибочный зелёный станок на расходники.)
- **Фото видов расходных материалов** (галерея на странице `…/raskhodniki/`,
  4 шт., 800×800 jpg+webp, белый фон, реальные фото с боевого WP 2026-04):
  `22-vosk-modelnyi` (зелёные гранулы), `23-vosk-kleyashchiy` (жёлтые таблетки),
  `24-vosk-remontnyi` (оранжевые таблетки), `25-smachivatel` (раствор в посуде).
  Мастера — `picture/products/oborudovanie-lvm/products/2{2..5}-*.jpg`; прод-файлы —
  `astro/public/img/lvm-products/2{2..5}-*.jpg(+.webp)`. Кликабельны в lightbox
  (data-lightbox-index 1–4, hero — 0). (2026-06-09: страница «Расходники и
  комплектующие» переименована в «Расходные материалы», добавлены 4 материала
  с описаниями со старого сайта.)
- **Новый товар «Машина для ручного литья воска под давлением» (УИ-В-140,** `mashina-ruchnogo-litya-voska`,
  2026-06-19): отдельная картинка `mashina-dlya-ruchnogo-litya-voska-pod-davleniem.png`
  (583×628, RGBA, ~360 КБ, без webp-соседа). Прод-файл — `astro/public/img/lvm-products/`.
  Используется как hub-карточка на `/products/oborudovanie-lvm/` и главное фото
  (phero + lightbox index 0) страницы товара.
- **Новый товар «Шприц-машина» (УИ-В-120С,** `shpric-mashina`, 2026-06-19): отдельная
  картинка `shpric-mashina.png` (~600 КБ, без webp-соседа). Прод-файл — `astro/public/img/lvm-products/`.
  Используется как hub-карточка на `/products/oborudovanie-lvm/` и главное фото
  (phero + lightbox index 0) страницы товара.
- **Товар «Робот для изготовления оболочек (3 головы, 6 рук)» (УИ-К-3Г6Р,**
  `robot-izgotovleniya-obolochek-3g6r`, 2026-06-19): **переиспользует** картинку
  `robot-dlya-izgotovleniya-obolochek-s-chetyrmya-golovami-i-vosmyu-rukami.png` (~330 КБ, без webp;
  имя файла осталось от первоначального 4Г8Р — по решению Евгения фото общее). Прод-файл —
  `astro/public/img/lvm-products/`. Hub-карточка (категория «Керамика · Робот») + главное фото
  (phero + lightbox index 0). _История: 2026-06-19 страница сперва создана как 4Г8Р, в тот же день
  заменена на 3Г6Р (название/спеки/описание), URL переименован `...-4g8r` → `...-3g6r`._
- **Товар «Робот для изготовления оболочек (4 головы, 8 рук)» (УИ-К-4Г8Р,**
  `robot-izgotovleniya-obolochek-4g8r`, 2026-06-19): картинка `robot-obolochek-4g8r.png` (~400 КБ,
  без webp) — копия исходника `2026-06-19 162037.png`, переименованного в kebab-case. Прод-файл —
  `astro/public/img/lvm-products/`. Hub-карточка (категория «Керамика · Робот») + главное фото
  (phero + lightbox index 0). _Добавлен отдельным товаром рядом с 3Г6Р (оба робота сосуществуют)._
- **Товар «Шестиосный робот для изготовления оболочек» (УИ-К-6О, KUKA R-2000iC/210F,**
  `shestiosnyj-robot-izgotovleniya-obolochek`, 2026-06-22): картинка
  `shestiosnyj-robot-izgotovleniya-obolochek.png` (~380 КБ, без webp) — копия исходника-скриншота
  `Снимок экрана 2026-06-22 105436.png`, переименован в kebab-case. Прод-файл —
  `astro/public/img/lvm-products/`. Hub-карточка (категория «Керамика · Робот») + главное фото
  (phero + lightbox index 0). Картинка `shestiosnyj-robot-dlya-izgotovleniya-obolochek.png` (~350 КБ,
  без webp) — реальное фото зелёного шестиосного робота-манипулятора с лого «УралИндуктор» (прислано
  Евгением 2026-06-22, заменило ошибочный кадр линии). Прежний файл `shestiosnyj-robot-izgotovleniya-obolochek.png`
  (был копией фото линии) удалён.
- **Товар «Специальная линия для изготовления оболочек» (УИ-К-Л1 / YN-GZX-600Z,**
  `specialnaya-liniya-izgotovleniya-obolochek`, 2026-06-22): картинка
  `specialnaya-liniya-dlya-izgotovleniya-obolochek-01.png` (~380 КБ, без webp). Прод-файл —
  `astro/public/img/lvm-products/`. Hub-карточка (категория «Керамика · Линия») + главное фото
  (phero + lightbox index 0). _Добавлена отдельным товаром рядом с шестиосным роботом (оба
  сосуществуют). Старый файл линии `…obolochek.png` (353 КБ) и дубль `…obolochek (2).png` — orphan._
- **Товар «Специальная машина для погружения» (УИ-К-П1,** `specialnaya-mashina-pogruzheniya`,
  2026-06-22): картинка `specialnaya-mashina-dlya-pogruzheniya.png` (~440 КБ, без webp). Прод-файл —
  `astro/public/img/lvm-products/`. Hub-карточка (категория «Керамика · Погружение») + главное фото
  (phero + lightbox index 0). Бак-пульпопровод с мешалкой для керамической суспензии (995 л, 28 об/мин).
- **Товар «Барабанный пескоструйный аппарат (только для роботов)» (УИ-К-Б1,**
  `barabannyj-peskostrujnyj-apparat`, 2026-06-22): картинка `barabannyj-peskostrujnyj-apparat.png`
  (~560 КБ, без webp). Прод-файл — `astro/public/img/lvm-products/`. Hub-карточка (категория
  «Керамика · Обсыпка») + главное фото (phero + lightbox index 0). Обсыпка/стомление в роботизированной линии.
- **Товар «Полностью автоматический котёл для депарафинизации» (УИ-Д-А1,**
  `polnostyu-avtomaticheskij-kotel-deparafinizacii`, 2026-06-22): картинка
  `polnostyu-avtomaticheskij-kotel-dlya-deparafinizacii.png` (~470 КБ, без webp). Прод-файл —
  `astro/public/img/lvm-products/`. Hub-карточка (категория «Депарафинизация») + главное фото
  (phero + lightbox index 0). Электрический автоклав вытопки воска (333 кВт, 8 МПа).
- **Товар «Система подачи парового воска» (УИ-Т-П1,** `sistema-podachi-parovogo-voska`, 2026-06-22):
  картинка `sistema-podachi-parovogo-voska.png` (~200 КБ, без webp) — копия исходника-скриншота
  `Снимок экрана 2026-06-22 125636.png`, переименован в kebab-case (зелёный пневмоцилиндр с лого,
  визуально сверено). Прод-файл — `astro/public/img/lvm-products/`. Hub-карточка («Воск · Подача») +
  главное фото (phero + lightbox index 0). Пневмодозатор расплавленного воска.
- Manager + banner-service + общие блоки из shared.

### Каталог «Дробемёты с вращающимся столом» — `/products/drobemetnoe-oborudovanie/s-vrashchayushchimsya-stolom/`
**Источники:** `picture/products/drobemetnoe-oborudovanie/`
- **Картинка-юникум подкатегории:** `card-stol.png` (4:3, версия **v=4**) —
  перегенерирована через **fal.ai · gpt-image-2-edit** (фоторендер, без логотипа
  на корпусе). Лежит в `picture/products/drobemetnoe-oborudovanie/card-stol.png`,
  на сервере — `/var/www/uralinduktor/public/img/card-stol.png?v=4`.
- **Где используется:**
  - hub-карточка «С вращающимся столом» на `/products/drobemetnoe-oborudovanie/`
    (cache-bust `?v=4`)
  - hero-фон каталога-страницы `/products/drobemetnoe-oborudovanie/s-vrashchayushchimsya-stolom/`
    (`.cat-hero__image` через `background: url('/img/card-stol.png?v=4')`)
  - все 4 pcard-карточки в pcard-grid (УИД-3512 / 3515 / 3518 / 3525) — как
    fallback, пока нет уникальных рендеров каждой модели
  - 1-й слайд phero-галереи каждой из 4 product-страниц
    (`/img/card-stol.png?v=4`). Блок `phero__thumbs` скрыт (`display: none`)
    — реальных фото с WP-сайта нет.
- **TODO:** в будущем — 4 уникальных fal.ai-рендера моделей
  (`model-uid-3512.png` … `model-uid-3525.png`) и реальные фото с боевого WP
  /из цеха для phero-галерей (`uid-3512-photo-1..N.jpg` и т.д.).

### Каталог «Дробемёты проходные подвесного типа» — `/products/drobemetnoe-oborudovanie/prokhodnye-podvesnogo-tipa/`
**Источники:** `picture/products/drobemetnoe-oborudovanie/`
- **Hero категории (цех-канон v3):** `hero-podves.png` (4:3, 1200×896, **v=2**, +`.png.webp`)
  — **AI-перерисовка реального фото `uid-podves-photo-2.png`** (зелёно-антрацитная
  подвесная установка, верхний зелёный монорельс, чёрная камера, экскаваторная стрела
  спереди, логотип УРАЛ ИНДУКТОР) в цех-канон через nano-banana-pro-edit (2026-06-08).
  Фон `.cat-hero__image` категории `…/prokhodnye-podvesnogo-tipa/` (`?v=2`).
- **`card-podves.png` (4:3, v=2) — ⚠️ С 2026-06-08 ОРФАН.** Прежний рендер; по просьбе
  Евгения ВСЕ его места переведены на реальное фото `uid-podves-photo-2.png?v=1`:
  hub-карточка `/products/drobemetnoe-oborudovanie/`, scard `/products/`, 4 pcard-обложки
  каталога, главное фото `phero__main` 4 товарных. Файлы оставлены в репо/проде, мёртвые.
- **Реальное фото-лидер серии:** `uid-podves-photo-2.png?v=1` (зелёно-антрацитная
  установка с экскаваторной стрелой) — теперь на хабе/scard/4 карточках каталога +
  главное фото `phero__main` 4 товарных. Рендер из phero-галереи убран → 4 реальных фото
  (индексы 0–3, photo-2 главный/активный). Рендер серии живёт только в hero.

- **Галерея реальных фото:** `picture/products/drobemetnoe-oborudovanie/uid-podves-gallery/` —
  4 высококачественных фотографии из локального архива заказчика
  `ФОТО/Фотографии/Дробеметное оборудование/Дробеметные установки проходные подвесного типа/`:
  - `photo_2026-01-27_11-14-131.png` → `uid-podves-photo-1.png` — **флагман**:
    длинная производственная линия с монорельсом и логотипом «УРАЛ ИНДУКТОР»
    на корпусе камеры. Самый презентабельный кадр серии.
  - `photo_2026-01-27_11-14-13.png` → `uid-podves-photo-2.png` — компактная
    установка с экскаваторной стрелой (типовое крупногабаритное изделие,
    подчёркивает целевое применение).
  - `photo_2026-01-27_11-10-41.jpg` → `uid-podves-photo-3.png` (конвертирован
    через `sips -s format png`) — крупный план монорельсового подвеса с крюками,
    передаёт принцип «монорельс O-типа».
  - `photo_2026-02-27_13-37-56.jpg` → `uid-podves-photo-4.png` (конвертирован) —
    архивное фото в синей окраске, на улице (масштаб установки).

  Все 4 — высокое разрешение, на 2 кадрах виден оригинальный логотип «УРАЛ ИНДУКТОР»
  на оборудовании. **С 2026-06-08 — 4-thumb grid из ТОЛЬКО реальных фото (рендер убран);
  главное фото = `photo-2`** (индексы 0–3: photo-2, photo-1, photo-3, photo-4) на
  **всех 4 product-страницах серии** —
  `uid-383`, `uid-384`, `uid-485`, `uid-4810`. По решению заказчика все 4 модели
  используют **одни и те же общие фото** (модели визуально похожи, отличаются
  только габаритом камеры). Lightbox по клику на любой thumb, навигация ←/→/ESC/swipe.

  **На сервере:** `/var/www/uralinduktor/public/img/uid-podves-photo-{1..4}.png`,
  cache-bust `?v=1`.

  **TODO:** в будущем — сгенерировать 4 уникальных fal.ai-рендера каждой модели
  (как для кран-серии), чтобы убрать визуальное дублирование на pcard-карточках
  каталога и hero/phero product-страниц.

### Каталог «Дробемёты для швеллера, двутавра и сорта» — `/products/drobemetnoe-oborudovanie/dlya-shvellera-i-sorta/`
**Источники:** `picture/products/drobemetnoe-oborudovanie/`
- **Картинка-юникум подкатегории:** `card-shveller.png` (4:3, 600×450, **v=5**, +`.png.webp`) —
  карточный кроп того же цех-канон-рендера, что и hero (`cat-hero-prokat.png`).
  ⚠️ **С 2026-06-08 ОРФАН — нигде в разметке не используется.** По просьбе Евгения
  все его места переведены на реальные фото. Файлы оставлены в репо/проде на случай
  возврата, формально мёртвые. Лежит в `picture/products/drobemetnoe-oborudovanie/`.
- **Где раньше использовался** (всё переведено на реальные фото 2026-06-08):
  - hub-карточка «Швеллер, двутавр и сорт» на `/products/drobemetnoe-oborudovanie/`
    + scard `/products/` → `uid-prokat-card.png?v=1` (карточный кроп, см. ниже)
  - 12 pcard-обложек каталога → `uid-prokat-card.png?v=1` (карточный кроп, см. ниже)
  - 14 product-страниц
- **Карточный кроп обложек:** `uid-prokat-card.png?v=1` (4:3, 600×450, 118 КБ +`.png.webp` 40 КБ) —
  лёгкий кроп `uid-prokat-photo-2.png` (1536×1024, 1.9 МБ) под обложки карточек.
  С 2026-06-09 все 14 обложек-cover (scard `/products/`, teaser `/…/drobemetnoe-oborudovanie/`,
  12 pcard `/…/dlya-shvellera-i-sorta/`) ссылаются на него вместо полноразмерного png —
  раньше каждая обложка тащила 1.9 МБ. Полный `uid-prokat-photo-2.png?v=3` остался только
  в галерее/лайтбоксе 12 product-страниц (phero__thumb #1). Файл — `astro/public/img/`.
  - 12 product-страниц (phero__main + галерея) → `uid-prokat-photo-1.png`; рендер
    из phero-галереи удалён (5 реальных фото, индексы 0–4). Рендер серии — только в hero.
- ⚠️ **WebP-конвенция nginx (T-PERF-7):** сосед именуется `<файл>.png.webp`
  (НЕ `<файл>.webp`!). Для card-shveller/cat-hero-prokat/uid-prokat-photo-2 webp —
  это `*.png.webp`. Если назвать `*.webp` — nginx отдаст СТАРЫЙ `*.png.webp`, и
  Chrome (Accept: webp) увидит прежнюю картинку при «обновлённом» png. Грабли 2026-06-08.

- **Hero категории (цех-канон v3):** `cat-hero-prokat.png` (4:3, 1200×896, **v=1**, +WebP) —
  AI-перерисовка реального фото `photo_2026-01-27_11-02-04.png` (зелёный «хобот»
  воздуховода, пылеуловитель, антрацит-зелёный корпус, рольганг) в цех-канон
  через nano-banana-pro-edit. Лежит в `picture/products/drobemetnoe-oborudovanie/`,
  на сервере — `/img/cat-hero-prokat.png?v=1`. Используется как hero-фон
  `.cat-hero__image` каталога-страницы `…/dlya-shvellera-i-sorta/` (заменил
  card-shveller, 2026-06-08). Канон/промт — briefs/product-image-prompt.md.

- **Галерея реальных фото:** `picture/products/drobemetnoe-oborudovanie/uid-prokat-gallery/` —
  5 высококачественных фотографий из локального архива заказчика
  `ФОТО/Фотографии/Дробеметное оборудование/Дробеметные установки для очистки швеллера, двутавра и сорта/`
  (заменили старые WP-thumbnails 300×179px на полноразмерные кадры 1.3–1.7 MB):
  - `photo_2026-01-27_11-04-18.png` → `uid-prokat-photo-1.png` — **флагман**: зелёный
    «хобот» воздуховода, шкаф управления, рольганговый конвейер, полный технологический
    контур. Используется как **главное фото `phero__main`** на всех 12 product-страницах.
  - `photo_2026-01-27_10-45-48.jpg` → `uid-prokat-photo-2.png` (**заменён 2026-06-08**,
    `?v=3`, +`.png.webp` 154 КБ) — чистый цех, teal-зелёная установка, площадка
    обслуживания, длинный рольганг. Прежний кадр (`photo_2026-01-27_11-02-04.png`,
    вид сбоку с турбинными крыльчатками) ушёл в источник hero-рендера
    `cat-hero-prokat.png` (см. выше). **Двойное назначение:** 3-й thumb phero-галереи
    на 12 товарных + **обложка 12 pcard-карточек каталога** (заменил card-shveller).
    ⚠️ png тяжёлый (1.9 МБ) — webp 154 КБ покрывает основной трафик; png-оптимизация
    карточного кропа — в техдолг.
  - `photo_2026-01-27_10-57-28.png` → `uid-prokat-photo-3.png` — компактная линия
    с рольганговым столом, акцент на роликах и приводе. Зелёно-антрацитная окраска.
  - `photo_2026-02-09_14-29-56.jpg` → `uid-prokat-photo-4.png` (конвертирован .jpg→.png
    через `sips`) — крупный план в активном цеху с надписью «УРАЛИНДУКТОР» на корпусе.
  - `photo_2026-01-27_10-59-35.png` → `uid-prokat-photo-5.png` — масштабный план
    с разными узлами установки, передаёт сложность и габариты системы.
  
  Все 5 — высокое разрешение, бренд-окраска (зелёный + антрацит), на 4 из 5
  виден оригинальный логотип «УРАЛ ИНДУКТОР» на оборудовании. Используются как
  слайды phero-галереи (**с 2026-06-08 — 5-thumb grid: только 5 реальных фото,
  рендер убран**; `photo-1` = главное фото `phero__main`)
  на **всех 12 product-страницах серии** — `uid-1500-1000`, `uid-1500-1200`,
  `uid-1700-1200`, `uid-1900-1000`, `uid-1900-1200`, `uid-2300-1200`, `uid-2300-1400`,
  `uid-2500-1000`, `uid-2500-1200`, `uid-2500-1400`, `uid-2800-1200`, `uid-3800-1700`.
  По решению заказчика все 12 моделей серии используют **одни и те же общие фото**
  (модели визуально похожи, отличаются только габаритом камеры). Lightbox по клику
  на любой thumb, навигация ←/→/ESC/swipe.
  
  **На сервере:** `/var/www/uralinduktor/public/img/uid-prokat-photo-{1..5}.png`,
  cache-bust `?v=2` (после замены WP-thumb'ов на полноразмерные 2026-05-26);
  **`uid-prokat-photo-2.png` — `?v=3`** (заменён на другой кадр 2026-06-08).
  
  **Архив:** старые низкоразрешённые WP-thumbnails сохранены в
  `picture/products/drobemetnoe-oborudovanie/uid-prokat-gallery/old-lowres-from-wp/`
  на случай если понадобятся.
  
  **Историческое:** старая страница `/uid-prokat/` (одна product-страница серии с
  таблицей 12 типоразмеров внутри) была реализована 2026-05-26 и удалена в тот же день
  при рефакторинге на 12 отдельных product-страниц. На старой странице эти 5 фото
  составляли слайды 2-6 в галерее (после рендера `card-shveller.png`). Сейчас то же
  самое назначение, но на 12 страницах одновременно.

### Каталог «Дробемёты для очистки труб» — `/products/drobemetnoe-oborudovanie/dlya-ochistki-trub/`
**Источники:** `picture/products/drobemetnoe-oborudovanie/`
- **Картинка-юникум подкатегории:** `card-truby.png` (4:3, версия **v=3**) —
  рендер дробемёта для очистки труб (брендовая зелёно-антрацитная окраска,
  коническая роликовая подача, замкнутый контур абразива).
- **Где используется:**
  - hub-карточка «Для очистки труб» на `/products/drobemetnoe-oborudovanie/`
    (cache-bust `?v=3`, новый pretty URL `…/dlya-ochistki-trub/`)
  - hero-фон каталога `/products/drobemetnoe-oborudovanie/dlya-ochistki-trub/`
    (`.cat-hero__image` через `background: url('/img/card-truby.png?v=3')`)
  - обложка всех 5 pcard-карточек в каталоге (УИДТ-20/30/50/100/150)
  - **главное фото `phero__main`** и 1-й thumb на всех 5 product-страницах
- **Галерея реальных фото:** `picture/products/drobemetnoe-oborudovanie/uid-truby-gallery/`
  (5 файлов из `ФОТО/Фотографии/Дробеметное оборудование/Дробеметные установки для очистки труб/`):
  - `photo_2026-01-27_11-44-14.png` → `uid-truby-photo-1.png`
  - `photo_2026-01-27_11-46-24.png` → `uid-truby-photo-2.png`
  - `photo_2026-01-27_11-57-59.png` → `uid-truby-photo-3.png`
  - `photo_2026-01-27_11-54-14.jpg` → `uid-truby-photo-4.png` (через `sips -s format png`)
  - `WeChat Image_20180703142938.png` → `uid-truby-photo-5.png` (архивное)
  Все 5 — thumbs 2-6 (6-thumb grid: рендер + 5 фото) на каждой из 5 product-страниц
  УИДТ-20/30/50/100/150. **На сервере:** `/var/www/uralinduktor/public/img/uid-truby-photo-{1..5}.png`,
  cache-bust `?v=1`. **TODO:** в будущем — 5 уникальных fal.ai-рендеров моделей УИДТ.

### Каталог «Дробемёты с ленточным сетчатым конвейером» — `/products/drobemetnoe-oborudovanie/s-lentochnym-konveyerom/`
**Источники:** `picture/products/drobemetnoe-oborudovanie/`
- **Картинка-юникум подкатегории:** `card-lenta.png` (4:3, версия **v=3**).
- **Где используется:**
  - hub-карточка на `/products/drobemetnoe-oborudovanie/` (новый pretty URL `…/s-lentochnym-konveyerom/`)
  - hero-фон каталога подкатегории
  - обложка 4 pcard (УИД-60/80/100/120)
  - **главное фото `phero__main`** на всех 4 product-страницах
- **Галерея реальных фото:** `picture/products/drobemetnoe-oborudovanie/uid-lenta-gallery/` (5 файлов из
  `ФОТО/Фотографии/Дробеметное оборудование/Дробеметные установки с ленточным сетчатым конвейером/`):
  - `photo_2026-01-27_12-47-46.png` → `uid-lenta-photo-1.png`
  - `photo_2026-01-27_12-50-42.png` → `uid-lenta-photo-2.png`
  - `photo_2026-01-27_12-57-11.png` → `uid-lenta-photo-3.png`
  - `photo_2026-02-27_14-03-48.jpg` → `uid-lenta-photo-4.png` (через `sips`)
  - `photo_2026-02-27_14-05-04.jpg` → `uid-lenta-photo-5.png` (через `sips`)
  Thumbs 2-6 (6-thumb grid). **На сервере:** `/var/www/uralinduktor/public/img/uid-lenta-photo-{1..5}.png`,
  cache-bust `?v=1`. **TODO:** 4 уникальных рендера моделей УИД.

### Каталог «Дробемёты с выкатным столом» — `/products/drobemetnoe-oborudovanie/s-vykatnym-stolom/`
**Источники:** `picture/products/drobemetnoe-oborudovanie/`
- **Картинка-юникум подкатегории:** `card-vykatnoy.png` (4:3, версия **v=3**).
- **Где используется:**
  - hub-карточка на `/products/drobemetnoe-oborudovanie/` (новый URL `…/s-vykatnym-stolom/`)
  - hero-фон каталога подкатегории
  - обложка 4 pcard (УИД-765/7610/7620/7630)
  - **главное фото `phero__main`** на всех 4 product-страницах
- **Галерея реальных фото:** `picture/products/drobemetnoe-oborudovanie/uid-vykatnoy-gallery/` (3 файла из
  `ФОТО/Фотографии/Дробеметное оборудование/Дробеметные установки с выкатным столом/`):
  - `photo_2026-01-27_13-15-39.png` → `uid-vykatnoy-photo-1.png` (лучшее)
  - `photo_2026-01-27_13-07-46.jpg` → `uid-vykatnoy-photo-2.png` (через `sips`)
  - `photo_2026-01-27_13-10-16.jpg` → `uid-vykatnoy-photo-3.png` (через `sips`)
  Thumbs 2-4 (4-thumb grid: рендер + 3 фото) на каждой product-странице.
  **На сервере:** `/var/www/uralinduktor/public/img/uid-vykatnoy-photo-{1..3}.png`,
  cache-bust `?v=1`. **TODO:** 4 уникальных рендера + больше фото моделей УИД-76.

### Каталог «Передвижные дробемётные машины» — `/products/drobemetnoe-oborudovanie/peredvizhnye/`
**Источники:** `picture/products/drobemetnoe-oborudovanie/`
- **Картинка-юникум подкатегории:** `card-peredvizhnoy.png` (4:3, версия **v=3**).
- **Где используется:**
  - hub-карточка на `/products/drobemetnoe-oborudovanie/` (новый URL `…/peredvizhnye/`)
  - hero-фон каталога подкатегории
  - обложка 3 pcard (BH270/550/850)
  - **главное фото `phero__main`** на всех 3 product-страницах
- **Галерея реальных фото:** `picture/products/drobemetnoe-oborudovanie/uid-peredvizhnoy-gallery/` (5 файлов из
  `ФОТО/Фотографии/Дробеметное оборудование/Передвижные дробеметные машины/`):
  - `photo_2026-02-04_15-52-50.jpg` → `uid-peredvizhnoy-photo-1.png` (через `sips`)
  - `photo_2026-02-27_14-09-59.jpg` → `uid-peredvizhnoy-photo-2.png` (через `sips`)
  - `photo_2026-02-27_14-11-01.jpg` → `uid-peredvizhnoy-photo-3.png` (через `sips`)
  - `photo_2026-02-27_14-12-17.jpg` → `uid-peredvizhnoy-photo-4.png` (через `sips`)
  - `photo_2026-02-27_14-13-11.jpg` → `uid-peredvizhnoy-photo-5.png` (через `sips`)
  Thumbs 2-6 (6-thumb grid). **На сервере:** `/var/www/uralinduktor/public/img/uid-peredvizhnoy-photo-{1..5}.png`,
  cache-bust `?v=1`. **TODO:** 3 уникальных рендера моделей BH.

---

## Парность с деплоем

В production все картинки лежат **плоско** в `/var/www/uralinduktor/public/img/`
(и `/var/www/uralinduktor/public/brand/`). HTML-страницы ссылаются на эти
плоские пути (`/img/file.png`, `/brand/leasing/file.svg`).

**Папка `picture/` — это организационная структура источников**. При деплое
файлы кладутся плоско в `img/` на сервере и в `design/prototypes/img/` локально.

### Обновление картинки

1. Положить новую версию в `picture/[нужная папка]/[понятное-имя].png`
2. Скопировать в `design/prototypes/img/[то-же-имя].png`
3. Обновить ссылку в HTML (если имя поменялось)
4. `rsync` на сервер — `/var/www/uralinduktor/public/img/`

---

*Последнее обновление: 2026-06-09*

- **Раздел «Индукционные нагреватели» — реальные фото вместо canon-рендеров (2026-06-09).**
  По просьбе Евгения весь раздел переведён на реальные снимки из
  `ФОТО/…/Индукционные нагреватели/Галлерея с фото` (не цех-канон, прямая замена, /fix).
  Все картинки 1000×750 (исходник `-Z 700` → pad на белый холст, `object-fit:cover` 4:3),
  мастера-PNG `…-photo.png` в `picture/products/induktsionnye-nagrevateli/`, прод-копии +
  WebP-соседи в `astro/public/img/`. Cache-bust `?v=2`. Карточки категорий заменены
  студийными снимками серий, главное фото моделей наследует карточку (или свой снимок).
  Миниатюры-`heater-ui-*-photo-*` (placeholder-ряды по 4) удалены из разметки.
  - **Схемы ковшей (2026-09-28, пакет V12):** `/img/kovshi/` — объёмные рендеры
    `steel-3d`, `iron-3d`, `teapot-3d` (в разрезе), `treatment-3d` и размерные схемы
    `*-dimensions` с обозначениями Φ1, Φ2, H, A, B; для стопорных — кадр узла
    `stopper-mechanism`. Стоят первой панелью на страницах пяти категорий ковшей.
    Рендеры проверены поставщиком на соосность (отчёт ПРОВЕРКА_СООСНОСТИ_V11).
  - **Исполнения ЛН (2026-09-24):** у ручных ЛН исполнение = своя страница и своё фото,
    лент миниатюр нет. `card-ruchnye` (бежевый) — только внешнее охлаждение: страницы
    ui-15ln, ui-25ln, ui-35ln. `card-ruchnye-vo` (зелёный, на колёсах) — встроенное:
    страницы ui-15ln-vo, ui-25ln-vo, ui-35ln-vo и ui-40ln, ui-60ln, ui-80ln (у этих
    трёх внешнего исполнения нет). У АВз лента осталась: раздельное исполнение первым
    кадром, моноблок вторым. Превью `astro/public/img/nagrevateli/t-*.webp` (4 шт.,
    2–5 КБ, sharp из прод-PNG) сейчас нужны только страницам АВз.
  - **Среднечастотные (АВн):** `card-srednechastotnye` ← `UI-80AVn-1`; 5 моделей —
    студия + 3 живых фото серии (`heater-avn-live-1..3`).
  - **Ручные (ЛН):** `card-ruchnye` ← `ui_ln`; обычные ЛН (6 моделей) — компактный блок.
    «Встр. охл.» (6 моделей, `ui-*-2`) — `card-ruchnye-vo` (зелёный напольный блок со
    встроенным охлаждением, фото на белом от Евгения, 2026-08-12).
  - **Закалка валов (СЗ):** `card-skaniruyushchaya-zakalka` ← `Image_2021…`; 5 моделей —
    студия + 3 живых фото (`heater-sz-live-1..3`).
  - **Высокочастотные (АВз/2-АВЗ):** подбор по типу/размеру — 15/25 малый (`nagrevatel-avz-split-s`
    ← `ui-15avz-1`), 35/40/60 средний (`nagrevatel-avz-split-m` ← `ui-60avz-1`), 80 крупный
    (`card-vysokochastotnye-30-80` ← `ui-80avz-1`), моноблоки «-2» (`nagrevatel-avz-mono` ←
    `ui-15avz-mono-1`), 2-АВЗ (`card-vysokochastotnye-30-100` ← `black_new960x960`).
  - **Сверхвысокочастотные (АВ/АВВС):** bez-ohl ← `vysokochastotnik-monoblok-500-380`,
    s-ohl ← `vysokochastotnik-500-380_`, 50-1100 ← `pg6`. Прежние canon-v3 карты bez/s-ohl
    (06.06) перезаписаны по решению Евгения.
  - ⚠️ **Не использованы (нерелевантны):** `pg001` и `pg12` (лазерные аппараты, не нагреватели),
    `IMG_3442/3443` (повёрнуты, низкое качество), пара фото «на боку» в АВн.
  - ⚠️ **Орфаны на проде:** ~180 файлов `heater-ui-<model>-photo-{1..4}` больше не используются
    в разметке — подлежат чистке при `/ship` (см. PLAN, техдолг).

- **Муфельные · Этап 3 — категория `mufelnaya-pech`: 6 картинок модификаций (2026-06-08).**
  Страница `/products/mufelnye-termicheskie-pechi/mufelnaya-pech/` наполнена 6 модификациями
  (товарные страницы T05). Картинки по канону **v5 «max»** (РЕНДЕР→ФОТО, `nano-banana-pro-edit`,
  4:3, 2K, два рефа: исходник `ФОТО/…/Муфельные печи/N.png` + цех-эталон `catalog-furnace-bucket-s`
  только для фона/зелёного, анти-контаминация). Прод 600×450 jpg q84 (75–96 KB) + WebP (22–30 KB)
  в `astro/public/img/`: `muf-mp-nizkotemp-konvektsiya`, `muf-mp-dvuhdvernaya`,
  `muf-mp-min-avtomatizatsiya`, `muf-mp-sensornaya`, `muf-mp-podyomnaya-dver` (2-я ит. —
  анти-контаминация, убран чужой тигель), `muf-mp-nastolnaya`. Мастера-2K PNG — в
  `picture/products/mufelnye-termicheskie-pechi/mufelnaya-pech/<slug>/`. Гейт пройден (три «да»).
  **НА ПРОДЕ 2026-06-08** (scoped /ship, 12 файлов в симлинк img, смоук 200, WebP по Accept).

- **Муфельные · Этап 3 — категория `mufelnye-kamernye-pechi`: 6 картинок модификаций (2026-06-08).**
  Страница `/products/mufelnye-termicheskie-pechi/mufelnye-kamernye-pechi/` перестроена по паттерну
  пилота: убран блок 12 карточек-моделей → секция «Шесть исполнений камерной печи» (6 модификаций)
  + общая таблица модельного ряда УИ-МКП; 6 товарных страниц T05. Картинки по канону **v5 «max»**
  (РЕНДЕР→ФОТО, `nano-banana-pro-edit`, 4:3, 2K, два рефа: исходник
  `ФОТО/…/Модификации фото/Муфельные камерные печи/N.png` + цех-эталон `catalog-furnace-bucket-s`
  только для фона/зелёного, анти-контаминация). Все 6 — гейт пройден с **1-й итерации** (три «да»,
  контаминации нет). Прод 600×450 jpg q84 (72–92 KB) + WebP (20–30 KB) в `astro/public/img/`:
  `muf-mkp-otdelnyj-pult` (№1), `muf-mkp-kompaktnaya` (№2), `muf-mkp-dvojnoj-mehanizm` (№3),
  `muf-mkp-vertikalnaya` (№4, кремовый верх сохранён, синее основание→зелёное),
  `muf-mkp-peremeshivanie-vozduha` (№5, сталь — без перекраски), `muf-mkp-arm` (№6, ряд из 4 печей
  + рабочее место АРМ). Мастера-2K PNG — в `picture/products/mufelnye-termicheskie-pechi/`.
  **НА ПРОДЕ 2026-06-08** (scoped /ship: 7 страниц + 12 файлов img, смоук 200, WebP по Accept).
  ⚠️ WebP-сосед именуется `<name>.jpg.webp` (nginx rewrite `try_files $uri$webp_suffix`), НЕ `<name>.webp` —
  иначе авто-отдача WebP по Accept не срабатывает (наступили на это здесь, исправлено в тот же деплой).

- **Муфельные · Этап 3 — СМЕНА ПОДХОДА: оригиналы вместо AI (2026-06-08).** Евгений отменил
  AI-цех-канон для наполнения категорий. Новый пайплайн (БЕЗ /product-image): оригинальные рендеры
  `ФОТО/…/Модификации фото/<папка>/N.png` (ПРОЗРАЧНЫЙ фон) адаптируются Pillow (`/tmp/adapt_muf.py`):
  flatten на белом → contain в 600×450 (поля 48×34, объект не режется) → jpg q84 + cwebp `.jpg.webp`.
  Эталон — `mufelnaya-vertikalnaya-pech`: 5 галерейных `muf-vertikalnaya-{1..5}.jpg` (12–17 KB + WebP
  5–8 KB) + обложка `card-muf-mufelnaya-vertikalnaya-pech.jpg` (= адаптированный №1, заменил AI Этапа 2;
  обновляет хаб раздела + каталог + сетку, имя не менял). Картинки на странице — галерея «Модификации»
  (`.muf-mods`, `object-fit:contain`). ✅ **ЗАВЕРШЕНО 2026-06-08: все 13 категорий** — обложки
  `card-muf-{slug}` × 13 (заменили AI Этапа 2) + галереи `muf-{key}-N` (оригиналы из ФОТО, у шоковой —
  реальное фото со старого сайта). AI `muf-mp-*`/`muf-mkp-*` сняты с прода и из репо (0 orphan).
  Все — jpg + WebP-сосед `.jpg.webp`. Инструмент адаптации — `/tmp/adapt_muf.py` (Pillow).

- **ХТС — 7 hub-обложек = РЕАЛЬНЫЕ ФОТО оборудования (2026-06-08, финал).**
  По повторному замечанию Евгения (AI-рендеры всё равно уводили конструкцию) обложки
  заменены на **оригинальные фотографии** реального оборудования УРАЛ ИНДУКТОР (без AI,
  конструкция 100% достоверна, экстра-реализм). Источники (скопированы в канон как
  `real-src-0X-*` для git-трассировки, т.к. ФОТО/ не в git):
  lr=`ФОТО/…/Линия регенерации ХТС/photo_2026-01-30_13-07-14.png` (полный вид линии),
  sm=old-site green photo (зелёный одноплечий смеситель), vs=`ФОТО/…/Вибростол/photo_2025-06-16` (зелёный стол),
  pt=`ФОТО/…/Пневмотранспорт/IMG_0281` (зелёный вертикальный сосуд), vr=old-site photo
  (антрацит+зелёный капот+красные моторы, белый фон), so=`ФОТО/…/Шкаф охлаждения/IMG_0256`
  (антрацит+зелёный шкаф), py=`ФОТО/…/Пылеуловитель/IMG_0891` (серый рукавный фильтр+циклон).
  **Вписаны ЦЕЛИКОМ** в 600×450 (sips fit + белая подложка `--neutral-0` #FFFFFF; CSS обложки
  = `object-fit:contain` на белом → объект не обрезается) + WebP, прод
  `astro/public/img/hts-products/0X-*.jpg` (43–95 KB). AI-версии (`tseh-*`, `tseh2-*`) — архив
  в каноне. Вёрстка не менялась. (Первый заход был crop-to-fill — срезал высокие объекты
  по краям; исправлено на fit-целиком 2026-06-08.)

- **ХТС — 7 hub-обложек ПЕРЕРИСОВАНЫ от реальных исходников старого сайта (2026-06-08).**
  Первая версия обложек (от старых AI-рендеров `products/0X-*.png`) имела сильные
  конструкционные отклонения. Переделаны от РЕАЛЬНЫХ изображений с uralinduktor.ru
  (дочерние `...-hts-2/<slug>/`): реальные фото УРАЛ ИНДУКТОР (lr, sm, vr) + OEM-
  каталожные рендеры (vs=Z29, pt=Y91, so=FTB, py=рукавный фильтр). Конструкция 1:1,
  РЕАЛЬНЫЕ цвета сохранены (антрацит/зелёный/синий/жёлтый/красный/белый — не зеленил
  насильно), экстра-реализм, чистый цех-фон. Мастера-2K `tseh2-0X-*.png`, прод
  перезаписан `astro/public/img/hts-products/0X-*.jpg` (84–100 KB) + WebP. Вёрстка
  не менялась. Старые версии `tseh-0X-*.png` остались в каноне как архив.

- **ХТС — раздел заведён в astro-пайплайн + 7 hub-обложек в цех-канон (литейные Этап 2).**
  Раздел `/products/linii-dlya-holodnotverdeyushhih-smesej-hts/` (вариант C: хаб T03b +
  7 дочерних T05) был построен в мае-2026, но его картинки лежали ТОЛЬКО в каноне
  `picture/products/linii-dlya-holodnotverdeyushhih-smesej-hts/` и никогда не попадали
  в `astro/public/img/` (раздел показывал битые картинки в локальной сборке).
  Сделано: (1) **34 готовые цех-картинки позиций** (hero+галереи) разложены
  по вложенным путям в `astro/public/img/` + WebP-соседи (`<имя>.jpg.webp`, cwebp q82):
  `/img/lr/` (lr-hero,lr-3,lr-5,lr-10,lr-15) · `/img/sm/` (sm-hero,sm-3..40, 8 шт) ·
  `/img/vs/` (vs-hero,vs-1,vs-3,vs-5,vs-8) · `/img/pt/` (pt-hero,pt-915,pt-918,pt-9116a) ·
  `/img/vr/` (vr-hero,vr-3..20, 6 шт) · `/img/so/` (so-hero,so-10,so-20,so-30) ·
  `/img/py/` (py-hero,py-1). Источники — реальные фото оборудования + цех-рендеры
  с лого «УРАЛ ИНДУКТОР» (уже были в цех-стиле). (2) **7 hub-обложек** (`/img/hts-products/0X-*.jpg`)
  были старым студийным CGI на белом фоне (`products/0X-*.png`) → перерисованы в
  цех-канон через /product-image (промт v4 «рендер→фото», nano-banana-pro-edit, 2 рефа:
  исходник-рендер + цех-эталон `catalog-furnace-bucket-s`, 2K, исходники уже зелёные;
  гейт пройден). Прод 600×450 JPEG 83–99 KB + WebP 26–38 KB. Мастера-2K и канон-версии —
  `picture/.../hts/products/tseh-0X-*.png` рядом с исходниками. Вёрстка хаба: 7 ссылок
  обложек `.png`→`.jpg`. Прототип `design/prototypes/category-hts.html` НЕ синхронизирован
  картинками (известный пробел). НЕ задеплоено (ждёт приёмки → /ship; редирект nginx
  `...-hts-2 → ...-hts`).

- **ХТС — hero раздела перерисован в цех-канон (рабочий набор линии регенерации).**
  Старый `hts-hero-realistic.png` — тёмная generic-сцена литейщика, не отражала ХТС.
  Перерисован через /product-image (nano-banana-pro-edit, 2 рефа: реальное фото линии
  `01-liniya-regeneratsii.jpg` + цех-эталон `catalog-furnace-bucket-s`, 16:9, 2K): вся
  зелёная линия регенерации (узел-регенератор, воздуховоды+циклон, шкаф-пылеуловитель с
  лого «УРАЛ ИНДУКТОР», лестницы, бадьи) в светлом современном цеху. Мастер 1920×1080 PNG
  `picture/products/linii-dlya-holodnotverdeyushhih-smesej-hts/hts-hero-realistic.png`,
  прод-копия `astro/public/img/hts-hero-realistic.png` (1600×900, 598 KB) + WebP-сосед
  `.png.webp` (122 KB) — ранее hero жил ТОЛЬКО в каноне (битый локальный билд). Вёрстка/CSS
  не менялись (тот же путь `/img/hts-hero-realistic.png`, `center right/cover`). НЕ
  задеплоено → /ship (копия в прод-`/img` через симлинк, docs/deploy-gotchas.md).

- **Запчасти (11 карточек: 4 индукционных + 7 дробемётных) — перерисованы в цех-канон v3
  (ТЗ-1 #8).** Все `card-zap-*.jpg` + WebP-соседи `card-zap-*.jpg.webp` в
  `picture/products/zapchasti/` (мастера-PNG 1K, 11 шт.) и `astro/public/img/` (прод-копии
  600×450, JPEG q82 60–76 KB / WebP 20–32 KB). Источники — фото товаров со старого
  uralinduktor.ru (`kondensatory2.png`, `PLATA-INVERTORA2.png`, `tiristor-6-.jpg` —
  индукционные; `Rabochee-koleso-1.jpg`, `napravlyayushhaya3-s-vt.png`, `Raspredelitel-drobi.jpg`,
  `lopatka-staraya.jpg`, `Vkladysh-verhnij.jpg`, `Vkladysh-bokovoj-seriya-M-1.jpg`,
  `Vkladysh-perednij-zadnij.jpg` — дробемётные; для кабеля у старого сайта товарного
  фото не было — взяли нашу текущую `card-zap-kabel.jpg` как «what to redraw»).
  Сохранены рядом как `src-*-v1.{jpg,png}`. Метод: nano-banana-pro-edit (edit от
  исходника, БЕЗ ref-tseh — для «слабых» исходников запчастей эталон-печь доминирует,
  модель брала его за основу и теряла товар; промт v3 сам описывает цех текстом).
  4 индукционных: `card-zap-kabel` (водоохлаждаемый кабель в гофре с медным наконечником
  и латунным штуцером воды), `card-zap-kondensatory` (4 конденсатора с изоляторами),
  `card-zap-platy` (зелёная плата импульсного трансформатора с двумя трансформаторами),
  `card-zap-tiristory` (3 тиристора-«шайбы»). 7 дробемётных (литой чугун, на каждом
  лого «Урал ИНДУКТОР» — модель сохранила лого исходников старого сайта, что укладывается
  в правило промта v3 «keep logos»): `card-zap-impeller` (рабочее колесо с лопастями),
  `card-zap-napravlyayushhaya` (литая втулка-направляющая), `card-zap-raspredelitel`
  (распределитель с лопастями), `card-zap-lopatki` (литой брус-лопатка), `card-zap-vkladysh-verhnij`,
  `card-zap-vkladysh-bokovoj`, `card-zap-vkladysh-perednij-zadnij`. По решению Евгения
  «стратегия A»: серии «М» и без М разделяют одну картинку (форма литой детали идентична,
  материал — нет). HTML обновлён: на хабе `/products/zapchasti/` 14 teaser-card
  дробемётных переведены с placeholder `home-cat-zapchasti.jpg` на свои `card-zap-*.jpg`
  (плюс 4 индукционных, ссылки уже были); на 14 страницах товаров дробемётных
  phero-картинка `home-cat-zapchasti.jpg?v=1` → свой `card-zap-*.jpg?v=1`. Сборка
  `npm run build` 517 стр. без ошибок. Скриншот-проверка хаба + `impeller-m` +
  `kabel-silovoj-vodoohlazhdaemyj` 1440px: вёрстка ровная, грид не поехал. НЕ задеплоено
  (деплой пачкой ТЗ-1 через /ship).

- **Запчасти — ПЕРЕДЕЛКА из реальных фото (hero + 11 карточек, v4 «на полу», 2026-06-08).**
  По просьбе Евгения раздел перерисован заново НЕ со старого сайта, а из реального фотоархива
  `ФОТО/…/Запчасти/` (разбит по категориям печи/дробемёт и позициям). Метод: nano-banana-pro-edit
  (ref-исходник = реальное фото позиции + ref-цех `catalog-furnace-bucket-s` только для фона,
  анти-контаминация), 4:3 1K, REAL-PHOTOGRAPH-промт; деталь ЛЕЖИТ на бетонном полу цеха (не висит
  в воздухе), конструкция/материал/цвет 1:1, контактная тень. Все 11 `card-zap-*.jpg` перезаписаны
  под теми же именами (хаб + товарные подхватывают автоматически; на главной card 08 =
  `card-zap-tiristory.jpg` тоже обновился) + WebP-соседи перегенерены. Прод-копии 600×450 JPEG q84
  (68–100 KB) + WebP (18–41 KB); мастера 1K `picture/products/zapchasti/card-zap-*-v4.png`.
  Источники: тиристоры `photo…11-43-31`, конденсаторы `kondensatory2`, кабель `5`, платы
  `PLATA-INVERTORA2`, импеллер `Rabochee-koleso-1`, направляющая/распределитель/лопатки/вкладыши —
  «серия М»-папки. **Hero раздела** `zapchasti-hero.jpg` перерисован: НАБОР из 3 литых деталей
  дробемёта (импеллер + распределитель + направляющая) лежат группой на полу цеха; мастер 2K
  `zapchasti-hero-v2.png` → прод 1920×1080 JPEG q74 300 KB + WebP 96 KB (создан впервые), в body.html
  `?v=2` (cache-bust). Карточки без ?v (имена сохранены, кеш картинок expires 30d). Самопроверка
  по гейту (фото/1:1/на полу/без чужого субъекта) — на всех 12. **Задеплоено на прод
  2026-06-08** (scoped: 24 картинки в симлинк img + хаб index.html для ?v=2, без --delete/
  сборки — чужая работа в дереве). Смоук: хаб 200, hero jpg 300 KB + WebP по Accept (96 KB),
  карточки 200 + WebP, hero на живой странице обновился.
  • 2026-06-08 (правка по решению Евгения): 4 ИНДУКЦИОННЫЕ карточки (тиристоры, конденсаторы,
    кабель, платы) переведены с цех-floor-рендера на ОРИГИНАЛЬНОЕ фото на белом фоне (без AI):
    реальное студийное фото из `ФОТО/…/Запчасти/Для индукционных печей/` вписано в 600×450
    (sips fit + белая подложка, kondensatory ровно 4:3 без подложки) + WebP. Масштаб без искажений.
    Мастера-источники `card-zap-{tiristory,kondensatory,kabel,platy}-orig.png` в picture/products/zapchasti/.
    7 дробемётных карточек и hero остаются в цех-каноне (v4). Прод jpg 19–76 KB.
    **Задеплоено на прод 2026-06-08** (scoped: 8 файлов в симлинк img, без --delete/сборки —
    в дереве чужая ЛГМ-сессия). Смоук: 4 jpg отдаются свежими (точные новые размеры) + WebP
    по Accept. Без ?v — у уже заходивших обновится по истечении кеша/хардрефрешем.

- **Главная, блок «Основные направления» — 3 карточки в цех-канон (2026-06-09).**
  По просьбе Евгения перерисованы 3 карточки блока (исходники-конструкции 1:1, сменён только фон/подача).
  Метод: nano-banana-pro-edit, edit от исходника + ref-цех `catalog-furnace-bucket-s`, 4:3 1K.
  (1) `card-srednechastotnye.png` (нагреватели, card 02) — белый студийный → цех-канон;
  KEEP двух юнитов, ОРАНЖЕВОЙ дверцы и лого «УРАЛ ИНДУКТОР» (старая цех-версия `card-srednechastotnye.png`
  в picture/products была отвергнута — там перекрасили дверцу в зелёный и убрали лого). Мастер
  `card-srednechastotnye-tseh.png`. Прод 600×450 PNG 118 KB + WebP 30 KB.
  (2) `card-muf-mufelnaya-pech.jpg` (муфельная, card 05) — белый студийный → цех-канон; KEEP открытой
  дверцы с камерой/кладкой/полкой + СИНЕГО корпуса (1-я генерация перекрасила в зелёный с ref-цеха —
  перегенерил с жёстким color-lock «furnace MUST stay BLUE, 2nd ref only for background»). Мастер
  `card-muf-mufelnaya-pech-tseh.png`. Прод 600×450 JPEG q82 74 KB + WebP 27 KB.
  (3) `card-zap-tiristory.jpg` (запчасти, card 08) — НОВЫЙ приём для мелкой детали: вместо пола цеха
  (v4 «на полу» был отвергнут 2026-06-08 как нереалистичный масштаб) — 3 тиристора-«шайбы» на
  СТАЛЬНОМ ВЕРСТАКЕ, макро-предметка, цех мягким боке за ними, отражения+контактные тени. Конструкция
  и маркировка 1:1. Мастер `card-zap-tiristory-v5.png`. Прод 600×450 JPEG q82 59 KB + WebP 20 KB.
  Имена served-файлов сохранены → подхватятся на хабах и страницах товаров автоматически (нагрев: хаб +
  6 страниц; муф: products + хаб; зап: products + хаб + tiristory-silovye). WebP-соседи перегенерены.
  Самопроверка глазами на всех 3 (цех-подача + конструкция 1:1). **Задеплоено на прод 2026-06-09**
  (scoped: 6 файлов в симлинк img, без --delete/сборки — HTML не менялся, имена served сохранены).
  Смоук: 4 страницы 200; 3 картинки 200 + Content-Length байт-в-байт; WebP по Accept (30/27/20 KB).
  Без ?v — у уже заходивших обновится по истечении кеша (30d) / хардрефрешем.

- **/products/zapchasti/ — карточка категории «Для индукционного оборудования» = микс-кадр (2026-06-16).**
  По просьбе Евгения: на карточке лежали только 3 тиристора, добавлены остальные позиции категории.
  Решение Евгения — НОВЫЙ отдельный файл `card-zap-induktsionnoe.jpg` (НЕ перезапись `card-zap-tiristory.jpg`,
  т.к. та живёт ещё на главной, хабе и hero страницы товара «Тиристоры силовые» — там микс был бы неверен).
  Метод: nano-banana-pro-edit, edit от мастера `card-zap-tiristory-v5.png` (тиристоры + сцена/свет 1:1) +
  3 рефа-конструкции (конденсаторы `card-zap-kondensatory-orig`, кабель `card-zap-kabel-orig`,
  платы `card-zap-platy-orig`). На стальном верстаке: тиристоры-«шайбы», электротермический конденсатор
  (керамические бушинги + медные шпильки), водоохлаждаемый кабель (медные выводы), зелёная плата. Цех-боке,
  свет сверху-слева, контактные тени. Мастер `card-zap-induktsionnoe-v1.png`. Прод 600×450 JPEG q82 76 KB +
  WebP 27 KB. Правка HTML — ТОЛЬКО `products/zapchasti/body.html` (img + alt), остальные 4 места с
  `card-zap-tiristory.jpg` не тронуты. **Задеплоено на прод 2026-06-16** (scoped: 2 картинки в симлинк
  img + `products/zapchasti/index.html`, без --delete/полной сборки). Смоук: хаб 200, JPG 200 (76281 б
  байт-в-байт), WebP по Accept 200 (27106 б), страница ссылается на новый файл, старая
  `card-zap-tiristory.jpg` 200 (страница товара «Тиристоры силовые» не задета).

- **Платы импульсных трансформаторов — главная заменена + галерея из 4 реальных фото
  (2026-06-08, /product-image без AI).** По просьбе Евгения товар
  `/products/zapchasti/plata-impulsnyh-transformatorov/` приведён в соответствие со старым
  сайтом (`uralinduktor.ru/products/zapchasti-na-indukcionnoe-oborudovanie/plata-impulsnyh-transformatorov/`).
  Это электроника (платы на белом фоне) — цех-рендер неуместен, поданы РЕАЛЬНЫЕ фото.
  ГЛАВНАЯ `card-zap-platy.jpg` переведена с бирюзовой платы инвертора на зелёную плату
  управления **МПУ-2ФК** (по выбору Евгения — выше разрешение/детальнее); это же имя
  живёт в карточке хаба `/products/zapchasti/` и в каталоге `/products/` → категорийная
  картинка обновилась везде, `?v=2` для cache-bust. Добавлена ГАЛЕРЕЯ (паттерн phero__thumbs +
  lightbox, как у нагревателей, CSS уже в `tpl/tovar-b.css`): 4 фото — МПУ-2ФК (главная),
  `zap-plata-mpu6fk.jpg` (МПУ-6ФК), `zap-plata-7.jpg` (тип «7»/HSU-7), `zap-plata-invertor.jpg`
  (бирюзовая плата инвертора, прежняя главная). Источники со старого сайта (PNG 1280×960,
  инвертор 947×960): `platy-upravleniya{3,4,6}.png`, `PLATA-INVERTORA2.png` → архив
  `picture/products/zapchasti/plata-impulsnyh-transformatorov/src-*.png`. Прод 600×450
  JPEG (62–99 KB) + WebP (15–60 KB); три платы 4:3 без искажений, инвертор ~1:1 вписан с
  белой подложкой. Сборка `npm run build` без ошибок; скриншот-проверка: на странице
  галерея (главная + 4 миниатюры, без битых), на хабе карточка категории = МПУ-2ФК.
  **Задеплоено на прод 2026-06-08.** HTML галереи + stock.json уехали РАНЬШЕ — попутно
  с чужим полным деплоем футера (`ce419d0`, пересобрал dist из общего дерева), но тот
  шёл `--exclude=img` → 8 картинок остались только локально (3 новых = 404, главная =
  старая бирюзовая под `?v=2`). Доехали отдельным scoped-rsync 8 файлов в симлинк `img`
  (additive, без `--delete`, chown www-data, 644). Смоук: 4 jpg + 4 webp → 200,
  `card-zap-platy.jpg?v=2` = 94737 B (МПУ-2ФК, байт-в-байт с локальной).
  **Cache-bump `?v=2` → `?v=3` (коммит `ec42ec7`, на проде 2026-06-08):** в коротком окне
  между деплоем футера и доливкой картинок `?v=2` успел отдать старую бирюзовую плату всем,
  кто открыл сломанную страницу тогда. Чтобы гарантировать МПУ-2ФК всем, главная переведена
  на `?v=3` в 3 HTML (страница плат: главная+thumb · хаб `/products/zapchasti/` · каталог
  `/products/`); scoped-rsync 3 index.html (img не трогали — файл уже верный). Смоук:
  3 стр. 200, все ссылаются на `?v=3`, остаток `?v=2` = 0, `card-zap-platy.jpg?v=3` = 94737 B.
  Новый URL никем не закеширован → коллизия снята. Доп.фото галереи остаются на `?v=1`
  (в окно отдавали 404, не подменённый контент — кеш чист).

- **Сталеразливочные ковши (5 карточек подкатегорий) — перерисованы в цех-канон v3
  (ТЗ-1 #5).** Все `card-kovsh-*.jpg` + WebP-соседи `card-kovsh-*.jpg.webp` в
  `picture/products/stalerozlivochnye-kovshi/` (мастера-PNG 1K) и
  `astro/public/img/` (прод-копии 600×450, JPEG q80–85 82–100 KB / WebP 23–35 KB).
  Источники — фото товаров со страницы раздела старого uralinduktor.ru
  (`Kovshi-chajnikovogo-tipa2.jpg`, `Kovshi-chajnikovogo-tipa-1.jpg`,
  `Kovshi-dlya-rasplavlennogo-chuguna-1.jpg`, `dlyakovshe1i.png` — сохранены как
  `src-*-v1.{jpg,png}` рядом). Метод: nano-banana-pro-edit (edit от исходника +
  реф цеха `catalog-furnace-bucket-s`), геометрия и палитра 1:1, заменён фон.
  Файлы: `card-kovsh-chajnikovogo-tipa` (серый ковш + красный маховик передачи,
  носик-перегородка), `card-kovsh-dlya-chuguna` (красный корпус + жёлтая траверса),
  `card-kovsh-dlya-stali` (серый чайниковый исходник с явным указанием модели
  «remove pouring spout» → плоский ободок для стопорного розлива стали),
  `card-kovsh-stopornogo-tipa` (пара чёрных ковшей со стопорными штоками и
  красными дугами-ручками), `card-kovsh-stend-sushki` (зелёный стенд сушки и
  предварительного подогрева с бежевым шкафом управления). Используются на хабе
  раздела и на всех 42 товарных страницах (каждая ссылается на картинку своей
  подкатегории — HTML не трогался, замена под тем же именем). WebP-соседи
  созданы впервые (на проде их у этих 5 карточек не было). НЕ задеплоено.

- **Сталеразливочные ковши — hero раздела перерисован (цех-канон, фото-промт v5).**
  `/img/kovshi-hero.jpg` (cat-hero страницы /products/stalerozlivochnye-kovshi/).
  Был CGI-рендер трёх ковшей; стал композит из ДВУХ реальных товаров раздела,
  помещённых в цех: слева — стенд сушки/нагрева ковша (зелёная гидроколонна, горелка
  на качающейся консоли, шкаф управления, обвязка), справа — стопорный ковш (серый
  корпус, верхняя траверса, стопорный механизм, красный маховик и рычаг). Источники:
  `ФОТО/…/Сталеразливочные ковши/steng_dlya_syski_kovshei.webp` +
  `…/Галлерея с фото/Стопорные ковши/IMAG0147.jpg`. Метод: nano-banana-pro-edit
  (2 рефа-исходника + цех-эталон `catalog-furnace-bucket-s` только для фона/зелёного,
  анти-контаминация), 16:9, 2K, REAL-PHOTOGRAPH-промт. Конструкция каждого узла 1:1.
  Мастер 2K → `picture/products/stalerozlivochnye-kovshi/kovshi-hero-v2.png`; прод
  `astro/public/img/kovshi-hero.jpg` 1920×1080 q70 (341 KB) + WebP-сосед 122 KB
  (создан впервые — у hero его не было). В body.html `?v=2` (cache-bust, имя файла
  сохранено). Скриншот-проверка страницы 1440px: вёрстка не поехала.
  **Задеплоено на прод 2026-06-08** (scoped: 2 файла напрямую в симлинк img, без
  --delete/сборки — в дереве шла чужая муфельная сессия). Смоук: jpg 200 (349 KB),
  WebP по Accept (image/webp, 125 KB), страница 200, hero на живой странице обновился.
  `?v=2` уедет со следующим полным деплоем (HTML точечно не выкладывался).

- **Муфельные печи (8 карточек-нарушителей) — выровнены в цех-канон v3.**
  Были студийные рендеры / реальное фото на белом фоне (нарушители ревизии
  docs/image-revision.md). Все `card-muf-*.jpg` (+ WebP-соседи **`card-muf-*.jpg.webp`**)
  в `picture/products/mufelnye-termicheskie-pechi/` (мастера-PNG 1K) и
  `astro/public/img/` (прод-копии 600×450, JPEG q82 35–65 KB / WebP 8–22 KB).
  Метод: nano-banana-pro-edit (edit от самой карточки + реф цеха), геометрия/цвет
  оборудования 1:1, заменён только фон. Файлы: `mufelnaya-fritovaya-pech`,
  `mufelnaya-pech-dlya-dantistov` (лёгкий лаб-верстак — настольный прибор, не цех),
  `mufelnaya-pech-dlya-ispytaniya-shokovoj-temperatury`, `mufelnaya-pech-s-2-podami`,
  `mufelnaya-pech-s-podyomnym-podom`, `mufelnaya-shahnaya-pech`,
  `mufelnaya-vertikalnaya-pech`, `vakuumnaya-mufelnaya-pech`. Используются на хабе
  каталога `/products/`, хабе раздела `mufelnye-termicheskie-pechi` и на страницах
  товаров (HTML не трогался — замена под тем же именем). Остальные 5 муфельных —
  реальные фото в цеху, не трогались.

- **Муфельные печи — Этап 1 muf.md (3 карточки категорий, планка реализма v5 «max»).**
  Перерисовка по docs/edits/muf.md из ФОТО-исходников (Модификации фото/.../1.png).
  `card-muf-mufelnye-kamernye-pechi` (был старый WP-портрет 1132×1400 без WebP),
  `card-muf-mufelnaya-pech-s-2-podami`, `card-muf-mufelnaya-shahnaya-pech`.
  Изначально сделаны по эталону Variant A (balanced) и выложены; по замечанию
  Евгения «похоже на 3D-рендер» планка поднята до v5 «max» (усиленный фото-промт
  «REAL PHOTOGRAPH, NOT a render»: полный пере-свет, фактура металла, зерно,
  реальная оптика; модель nano-banana-pro-edit, **2K**). Камерным потребовалась
  ручка анти-контаминации (модель путала короб с индукционным тиглем из цех-рефа —
  см. muf.md). Мастера-PNG 2K в `picture/products/mufelnye-termicheskie-pechi/`,
  прод-копии 600×450 JPEG q80–84 (84–90 KB) + WebP (26–36 KB) в `astro/public/img/`.
  Синий корпус→фирменный зелёный (решение Евгения), конструкция 1:1; для «с 2 подами»
  и «шахтных» блок KEEP адаптирован под их конструкцию (не chamber).

- **2026-06-08: с индукционной печи (BR-RLL) убрана градирня — `card-vacuum-indukcionnaya`
  и `vacuum-hero`.** По просьбе Евгения удалён ребристый бокс-охладитель (градирня с
  двумя вентиляторами) справа в кадре, остальное (печь, шкаф, лестница с жёлтыми
  перилами, кабель-трак, фон цеха) 1:1, освободившееся место — открытый пол цеха.
  nano-banana-pro-edit, edit от мастера (один реф, без цех-эталона — кадр уже в каноне).
  Файлы: мастер `card-vacuum-indukcionnaya.png` (2400×1792, перегенерён) → прод
  `card-vacuum-indukcionnaya.jpg` 1536×1147 (+WebP); мастер `vacuum-hero-v3.png`
  (2752×1536, новый) → прод `vacuum-hero.jpg` 1920×1071 (+WebP), `?v=3` в background-image.
  `card-vacuum-indukcionnaya` живёт в 4 местах (главная, хаб products, раздел, страница
  BR-RLL phero) — заменился везде одним файлом. Старый мастер `vacuum-hero-v2.png`
  оставлен как история (содержал градирню).

- **Вакуумное оборудование (8 карточек) — перерисованы в цех-канон v3.**
  Все `card-vacuum-*.jpg` (+ WebP-соседи **`card-vacuum-*.jpg.webp`** —
  именно `<имя>.jpg.webp`, т.к. nginx ищет `$uri.webp`, см. /etc/nginx/conf.d/webp.conf) в
  `picture/products/vakuumnoe-oborudovanie-dlya-termoobrabotki/` (мастера-PNG 2400×1792)
  и `astro/public/img/` (прод-копии 1536×1147, JPEG q82 256–328 KB / WebP 76–120 KB).
  Источники — фото товаров с живого uralinduktor.ru (по слагам, 1:1), nano-banana-pro-edit
  (edit от исходника + реф цеха). Файлы: `grafitovaya`, `grafitovaya-gorizontalnaya`,
  `dugovaya`, `indukcionnaya`, `gazovaya-zakalka`, `zakalka-maslo`, `termicheskaya`,
  `laboratornaya`. Используются на хабе раздела + на странице каждого товара (phero).
  Попутно исправлен баг: 4 страницы (индукционная, газовая закалка, закалка в масле,
  термическая) показывали плитку категории `home-cat-vakuumnoe.jpg` — переведены на свои
  `card-vacuum-*`. Hero раздела (`vacuum-hero.jpg`) и плитка на главной — не трогались.

- **Hero раздела «Вакуумное оборудование» (`vacuum-hero.jpg`) — пересобран под
  цех-канон v3 (ТЗ-1 #10, 2026-06-06).** Было — тёмный драматичный рендер (три
  тёмных сосуда с teal-акцентами), не из серии светлых v3-карточек. Стало — тот же
  светлый дневной цех, что на карточках раздела: outpaint 16:9 из мастера
  `card-vacuum-indukcionnaya` через nano-banana-pro-edit (печь+шкаф+лестница с
  жёлтыми перилами+градирня 1:1, equipment сдвинут в центр-право, слева — открытый
  пол и окна цеха под overlay-текст). Мастер
  `picture/products/vakuumnoe-oborudovanie-dlya-termoobrabotki/vacuum-hero-v2.png`
  (2752×1536) → прод `astro/public/img/vacuum-hero.jpg` 1920×1071 JPEG 321 KB +
  WebP-сосед `vacuum-hero.jpg.webp` 107 KB. `?v=2` в background-image (cache-bust).
  Скриншот-проверка до(прод)/после(локальный dist) 1440px: заголовок белый читается
  над overlay, KPI на месте, вёрстка не поехала.

*Предыдущее: 2026-06-04*

- **Корень каталога `/products/`** — общий индекс использует уже существующие
  `card-*.png/jpg` из хабов разделов. **Не дублируем картинки** — один источник правды:
  - **Стенды (2026-09-25):** раздел стендов вынесен в отдельную категорию, 14 страниц
    (хаб, газовые, электрические и 11 моделей) пока используют один кадр
    `card-kovsh-stend-sushki` с подписью «Пример конструкции». Фото пакета V8 не берём:
    это сырые снимки чужого цеха с иероглифами, канону не соответствуют. Отрисовка
    по моделям — отдельной задачей через /product-image.
  - **Электрические стенды (2026-09-25):** `card-stend-elektricheskij` — рендер от
    Евгения (`MMP/product_card_heater_1`, 1024×1024 → 1200 px jpg+webp): зелёный корпус
    с логотипом и нагревательными элементами на белом. Стоит на трёх страницах моделей,
    в их карточках, на плитке хаба и в карточке раздела на /products/. Газовые пока
    остаются на общем кадре `card-kovsh-stend-sushki`. Исходник —
    `picture/products/stendy-elektricheskij-heater-source.png`.
  - **Электрические стенды — новое фото (2026-10-05):** `card-stend-elektricheskij`
    перезаписан фотографией Евгения (`Desktop/фото new photo/Стенды`, 1500×1200, 5:4).
    **Приведён к 4:3 белыми полями по бокам, а не обрезкой:** рамки карточек на хабе
    и в категории — `aspect-ratio: 4/3` с `object-fit: cover`, и любой другой формат
    они режут (старый кадр был квадратным 1:1 — у стенда срезало верхний фланец и
    опорное кольцо, из-за этого и пришла правка). Фон фото ровно белый, поля не видны;
    на странице товара рамка 5:4 с `object-fit: contain` — там кадр тоже целиком.
    Имя файла прежнее, поэтому заменилось сразу во всех 7 местах. Стало легче:
    138 → 49 KB jpg, 51 → 30 KB webp, 1200×900. Исходник и результат —
    `picture/products/stendy-sushki-i-nagreva-kovshej/`.
  - **Имена WebP-соседей (2026-10-05):** nginx отдаёт WebP по правилу
    `try_files $uri$webp_suffix` — ищет `card-foo.jpg.webp`, то есть ДВОЙНОЕ
    расширение. Файл `card-foo.webp` он не найдёт никогда. Нашлось при замене
    фото стендов: 7 файлов из 654 были названы без двойного расширения, и у их
    карточек WebP просто не отдавался. Переименованы, на проде старые удалены.
    Выигрыш: сверхвысокочастотные 245→16 КБ и 208→12 КБ, платы 99→60, 95→50,
    63→15 КБ, запчасти 54→41 КБ, стенды 50→31 КБ. **Называй WebP-сосед
    `<имя>.<расширение>.webp`, иначе он мёртвый груз.**
  - Подкатегории печей: `card-pech-stal.png?v=3`, `card-pech-alyuminiy.png?v=3`, `card-pech-med.png?v=3`.
  - Дробемёты (9 шт.): `product-card-shotblast.png?v=7`, `card-baraban.png?v=7`,
    `card-shveller.png?v=4`, `card-stol.png?v=4`, `card-vykatnoy.png?v=3`,
    `card-lenta.png?v=3`, `card-podves.png?v=3`, `card-truby.png?v=3`, `card-peredvizhnoy.png?v=3`.
  - Системы охлаждения: `card-chillery.png?v=1`, `card-gradirni.png?v=2`.
  - Ковши: `card-kovsh-{chajnikovogo-tipa, stopornogo-tipa, dlya-stali, dlya-chuguna}.jpg`.
  - Муфельные (13 шт.): `card-muf-*.jpg`.
  - Вакуумные (8 шт.): `card-vacuum-*.jpg`.
  - Запчасти (4 шт.): `card-zap-{tiristory, kondensatory, kabel, platy}.jpg`.

*Предыдущее: 2026-06-03 (вечер)*

- **`proizvodstvo-hero-v2.png` + `.webp`** — новый hero для `/proizvodstvo/`.
  Сгенерирован nano-banana-pro-edit с фоторефом тиристорной печи
  (`ФОТО/.../Тиристорные печи общее/IMG20230726170652.jpg`). Расширенный цех,
  тиристорные шкафы 1-в-1 с фотом, по бокам дробемёты. WebP 679 KB / PNG 7.7 MB.
  На сервере: `/var/www/uralinduktor/public/img/proizvodstvo-hero-v2.png`.
  Cache-bust `?v=1`. Overlay усилен (5-ступенчатый градиент).

- **`card-gradirni-v4.png`** — карточка градирен УИГ с двумя элементами
  (верхний модуль зелёный + нижний с насосом и обвязкой). Заменила старую
  `card-gradirni.png` на 13 product-страницах
  `/products/sistemy-ohlazhdeniya/gradirni/<model>/` + хабе подкатегории.
  Cache-bust `?v=2`.

- **`card-gradirni.png?v=3` — перерисована (2026-06-16, /fix→/product-image).** По просьбе Евгения:
  конструкцию сохранить, перенести из тёмного драматичного цеха в СВЕТЛЫЙ, поверхности сделать
  новыми/глянцевыми (а не пошарпанными), сильный фотореализм. Затем вторым проходом нанесён БЕЛЫЙ
  логотип «УРАЛ ИНДУКТОР» (`brand/logo-footer-white.webp`) — маленький, в верхнем-левом УГЛУ большой
  зелёной панели бака (~16–18% ширины панели), естественный декаль, без белой подложки, через саму
  модель (не ручное наложение). Лого с альфой подложен на тёмный фон (PIL), чтобы модель видела
  белую графику. nano-banana-pro-edit, 2K,
  финал 1600×1194 (+webp-сосед). Исходники: прежняя `card-gradirni.png` (геометрия/композиция) +
  реальное фото `gradirni-gallery/gradirni-photo-1.png` (чистая глянцевая фактура). `?v=2→?v=3`
  в 33 ссылках (хабы products/ и sistemy-ohlazhdeniya/, категория gradirni — карточки+дивайдер,
  10 товарных страниц). Мастер обновлён.

- **`hero-gradirni-v1.png?v=2`** — hero подкатегории «Градирни» (16:9, 2752×1536,
  +webp-сосед), активен (фон `.cat-hero__image` в `gradirni/meta.json`). **Перерисован
  2026-06-16 (/fix→/product-image):** взята последняя удачная градирня (`card-gradirni.png`
  — чистая глянцевая, белое лого в углу) и помещена в ДРУГОЙ, более ТЁМНЫЙ цех (low-key,
  приглушённый свет, оборудование справа подсвечено, слева крупное тёмное негативное поле
  под белый текст hero — читаемость заголовка). nano-banana-pro-edit 16:9 2K. Прежний
  `?v=1` был старой потрёпанной градирней в тёмном цеху. Cache-bust `?v=1→?v=2` в meta.json.
  ⚠️ Смена inline-стиля meta.json меняет хэш inline-extracted — новый
  `inline-466eb2cf8111.css` обязателен в деплое (иначе hero без стилей); нужна ДВОЙНАЯ
  сборка, т.к. файл создаётся в public/ уже после копии public→dist.

*Предыдущее: 2026-06-02*

- **8 фото команды** в разделе «О компании» — реальные портреты сотрудников
  заменили 12 placeholder'ов. Структура: 8 карточек в team-grid + добавлен
  placeholder «Имя уточняется» (резервная позиция).

- **УВЧ-нагреватели** — заменены CGI на 2 реальных фото в галерее. Серия УВЧ
  обновлена карточками `card-sverhvysokochastotnye-100-250-bez-ohl.png` и
  `-s-ohl.png`. Старая `-v2.png` оставлена в архиве.
  • 2026-06-06: обе карточки выровнены в **цех-канон v3** (`/product-image`,
    nano-banana-pro-edit): студийный белый фон заменён на цех-холл, геометрия
    товара 1:1. 1K-мастера в `picture/products/induktsionnye-nagrevateli/`,
    прод 600×450 + WebP-соседи в `astro/public/img/`. HTML не менялся (те же
    имена; хаб + страницы ui-10ab/ui-30ab/ui-10av/ui-30av).

*Предыдущее: 2026-05-31*

- **Печи на гидравлике + тяжёлые (масса >2 т) — общая главная картинка** (2026-06-16,
  /fix, цех-канон v3). Файл `astro/public/img/pech-gidravlika-main.png` (1200×900, +`.webp`):
  зелёная гидравлическая печь — открытый бок с индуктором и гидрообвязкой + плоский фасад
  с двумя прикрученными листами; рендер nano-banana-pro-edit от реального фото
  `ФОТО/…/Тиристорные печи общее/на гидравлике/` (фасад — `IMG_20210125_090956`,
  бок — `IMG_20180403_152228`, цех — `IMG20231205141344`). Галерея — те же 4 реальных
  фото папки под общими именами `pech-gidravlika-photo-{1..4}.jpg` (+`.webp`).
  Применено главной + карточкой каталога + галереей на **10 печах** `po-stali`:
  2 «на гидравлике» (`ui-0-5t-400-na-gidravlike`, `ui-0-75t-500-na-gidravlike-proizvodstvo-rossiya`)
  и 8 тяжёлых (`ui-3t-2400`, `ui-5t-3000`, `ui-5t-4000`, `ui-6t-3600`,
  `ui-8t-4800`, `ui-10t-6000`, `ui-12t-7000`, `ui-15t-8500`). Старые заглушки
  `catalog-furnace-bucket-*` у этих 11 заменены (у незатронутых сохранены); битые
  ссылки `ui-0-1t-100-photo-*` убраны. Прежний `ui-0-5t-400-na-gidravlike-main.png` +
  его `-photo-*` — орфаны (не удалены).
  - **2026-06-16 (по меди):** тот же общий набор (`pech-gidravlika-main` + `-photo-{1..4}`)
    переиспользован на **3 тяжёлых медных печах** `po-medi` (масса загрузки >2 т):
    `ui-3t-1500m` (3000 кг), `ui-5t-2500m` (5000 кг), `ui-10t-3500m` (10000 кг) —
    главная + карточка каталога + галерея. Новых файлов не создавалось. В названиях
    по меди «гидравлики» нет (только в тексте описаний), 2Т-1000М = 2000 кг → не входит.
  - **2026-06-16 (по алюминию):** тот же общий набор переиспользован на **2 тяжёлых
    алюминиевых печах** `po-alyuminiyu` (>2 т): `ui-2-5t-1200a` (2500 кг),
    `ui-3t-1500a` (3000 кг) — главная + карточка каталога + галерея. «Гидравлики» в
    названиях нет, 2Т-900А = 2000 кг → не входит. Новых файлов нет.
- **UI-0.5T-400 на гидравлике** — главное фото `ui-0-5t-400-na-gidravlike-main.png`
  + 4 реальных фото в галерее `ui-0-5t-400-na-gidravlike-photo-{1..4}.jpg`.
  Используется на товарной странице `/products/induktsionnye-plavilnye-pechi/po-stali/ui-0-5t-400-na-gidravlike/`.
- **Hero `po-stali`** обновлён до v5 (`hero-pech-stal-v5.png`).

*Предыдущее: 2026-05-26 (вечер)*
- Добавлены 4 новые галереи для последних 4 подкатегорий дробемётов: `uid-truby-gallery/`
  (5 фото для УИДТ-20/30/50/100/150), `uid-lenta-gallery/` (5 фото для УИД-60/80/100/120),
  `uid-vykatnoy-gallery/` (3 фото для УИД-765/7610/7620/7630), `uid-peredvizhnoy-gallery/`
  (5 фото для BH270/550/850). На всех 16 product-страницах главное фото `phero__main` —
  соответствующий рендер `card-<name>.png?v=3`, реальные фото идут thumb'ами 2-N.
  4 рендера `card-truby.png` / `card-lenta.png` / `card-vykatnoy.png` / `card-peredvizhnoy.png`
  уже существовали (cache-bust поднят до `?v=3` для синхронности с хабом).

*Предыдущее: 2026-05-26*
- Добавлена галерея `uid-podves-gallery/` (4 реальных фото из локального архива
  заказчика — Дробеметные установки проходные подвесного типа) для 4 product-страниц
  серии УИД-383/384/485/4810. Картинка-юникум — `card-podves.png?v=2` как hero
  каталога, обложка pcard и **главное фото `phero__main`** на product-страницах
  (рендер 1-м слайдом, реальные фото thumb'ами 2-5 — соответствует правилу
  «main = наш сгенерированный рендер» из CLAUDE.md / отчёта по швеллер-серии).

*Предыдущее: 2026-05-25 (вторая правка)*
- Добавлены галереи реальных фото для 8 моделей УИД кранового типа
  (`uid-376-gallery/`, `uid-378-gallery/`, `uid-378e-gallery/`,
  `uid-3710-gallery/`, `uid-3710e-gallery/`, `uid-3720-gallery/`,
  `uid-3720e-gallery/`, `uid-3750-gallery/`). Используются на 8 новых
  product-страницах в галерее phero (lightbox). Количество фото варьируется
  2-4 шт. на модель — большее не доступно на боевом сайте.

*Предыдущее: 2026-05-25*
- Дробемётный хаб переделан в hub-style с 9 hub-картинками
  (`card-*.png` + `product-card-shotblast.png`), всё через `gpt-image-2-edit`
  с CAD-эталонами с боевого uralinduktor.ru.
- Добавлена страница моделей кранового типа `/products/drobemetnoe-oborudovanie/kranovogo-tipa/`
  с 9 уникальными рендерами моделей (`model-uid-*.png`) с реальных фото
  оборудования; крупные модели (3710–3750) перекрашены: корпуса в антрацит,
  акценты-двери в brand-green.
- Hero и divider дробемётов перерисованы по реальным фото из `ФОТО/дробеметы/Проходного типа/`.
- Удалён `divider-shotblast-assembly.png` (правило: 1 divider на страницу).

### Стержневые и формовочные машины — `/products/sterzhnevye-mashiny/` (2026-07-09)

- `/img/sterzh/hero.jpg` — фон cat-hero раздела и страниц-моделей (из home_fone.jpg).
- `/img/sterzh/<slug>.jpg` (+ .webp) — фоторендер каждой из 8 моделей (цех-канон, зелёные акценты, лого). Квадрат 1024², в карточках/тизерах object-fit: contain на светлой подложке.
- Источник: `Desktop/Стержневое оборудование` (имена переименованы в англ по slug).

### Термообработка и плавка алюминия — `/products/termoobrabotka-plavka-alyuminiya/` (2026-07-10)

- `/img/alum/hero.jpg` — фон cat-hero раздела (из «home hero block», 16:9).
- `/img/alum/card-alum.jpg` — карточка каталога на главной (4:3 из «home image»).
- `/img/alum/<slug>.jpg` (+ .webp) — фоторендер каждой из 7 моделей (цех-канон, зелёные акценты). ~1152×928, object-fit cover в карточках/тизерах.
- Источник: `Desktop/Термообработка и плавка алюминия` (имена переименованы в англ по slug).

### Кейс «Пермь, УИД-376» — `/proekty/perm/` (2026-10-06)

Исходники Евгения (`Desktop/PROJECT`) лежат в `picture/proekty/perm/`:
фото отгрузки и скан благодарности ПК «Термо-Деталь». Размеры взяты по
соседним кейсам раздела, чтобы десятый не выбивался:

- `/img/proekty/perm/photo-01.webp` — 1280×853, фото в герое кейса (у соседей
  ~1300 px по длинной стороне).
- `/img/proekty/cards/perm.webp` — 675×450, карточка на хабе `/proekty/`.
  У карточек раздела общая только высота 450; ширина — по кадру.
- `/img/proekty/perm/letter.png` — 894×1304, письмо в герое и в просмотрщике.
  **Письма в этом разделе — PNG и без webp-соседа**, так у всех девяти; не
  заводи им `.png.webp` в одиночку, это отдельная задача на весь раздел.
- `/img/reviews/termo-detal.webp` — 1000×1459, десятое письмо на `/otzyvy/`
  (у соседей 1000×1414; в разметке пишем настоящие размеры).
- `/img/projects/postavka-uid-376-perm.jpg` — 200×200, точка на карте главной
  (`projects-data.js` → всплывашка `projects-map.js`).
- `/files/proekty/perm/letter-original.jpg` — 281 КБ, скачиваемый оригинал.
  JPG, как у Рыбинска; у остальных PDF — исходник был PNG на 2,4 МБ.

### Крановые дробемёты УИД-376 и УИД-376Е — цеховые фото (2026-10-06)

- `/img/drobemet/uid-376/{08,09}.webp` + миниатюры `t08`, `t09` — два снимка
  установки в цеху заказчика (кабина, подвес, шкаф управления). Те же файлы
  лежат в `/img/drobemet/uid-376e/`: **галереи этих двух моделей совпадают
  файл в файл** — так было и для прежних семи кадров (сверено по md5), новые
  добавлены в обе папки.
- Размеры по соседним кадрам раздела: полный кадр webp в исходном разрешении
  960×1280 (~90 КБ), миниатюра 480×360 webp обрезкой по центру (~20 КБ).
- Разметка: лайтбокс собирает слайды из кнопок `.phero__thumb`
  (`phero-gallery.js` читает `data-full`), счётчик считает их сам — чтобы
  добавить кадр, достаточно дописать кнопку с очередным `data-lightbox-index`.
- Источник: `Desktop/PROJECT` (два jfif), исходники сложены в
  `picture/products/drobemetnoe-oborudovanie/kranovogo-tipa/`.
