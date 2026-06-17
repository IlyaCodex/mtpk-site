# Промт перерисовки товарных картинок

> **АКТУАЛЬНЫЙ КАНОН (решение Евгения 2026-06-05, поздн.): ЦЕХ-стиль** — см. промт v3 ниже.
> Студийный канон DMG MORI (v1/v2) отменён: большинство карточек уже в цех-стиле,
> перерисовывать всё не будем — выравниваем только нарушителей.
> Эталоны цех-канона: `picture/products/induktsionnye-plavilnye-pechi/catalog-furnace-bucket-s.png`,
> `picture/products/induktsionnye-nagrevateli/card-srednechastotnye.png`.
> Инструмент: nano-banana-pro-edit (edit от исходника, **1K** для карточек, 4:3).
> Статус: **ПРИНЯТ Евгением 2026-06-05.** Канон выдержан на 2 типах: пилот УИ-0.1Т-100
> (печь+шкаф) и тест вакуумной печи (3 юнита + густая обвязка). Упакован в скил
> `/product-image` (.claude/skills/product-image/SKILL.md). Дальше — ревизия picture/ и батч.

> Для исходников-РЕНДЕРОВ (чистый CGI/белый фон), где нужен экстра-реализм:
> режим «РЕНДЕР→ФОТО» (v4-muf) — промт и гейт приёмки в docs/edits/muf.md.
> Правило: edit-модель копирует стилистику исходника, поэтому фотореализм
> нужно требовать явно (камера/объектив/фактуры + запрет CGI-вида).

## Промт v3 — ЦЕХ-канон (рабочий)

```
Re-render this industrial equipment as an ultra-realistic professional product
photograph taken in a clean modern industrial workshop.

KEEP EXACTLY AS IN THE SOURCE IMAGE: the machine's design, geometry, proportions,
every component, panels, doors, control elements, gauges, cables, logos and labels
in their original positions, and the original colors of the equipment. The control
panel must match the source EXACTLY — do not add screens, indicator lights or
controls that are not in the source. Do not add handwheels, valves or decorative
details not visible in the source. Never invent, restore or sharpen any text.

SETTING (replace the original background completely):
- Location: spacious modern industrial workshop hall, softly blurred with shallow
  depth of field: steel roof trusses, columns, distant equipment silhouettes,
  large windows with soft daylight
- The equipment stands on a clean concrete floor, sharp and fully in focus,
  with realistic contact shadows under it
- Lighting: soft natural daylight from large windows on the upper left, subtle
  light haze in the hall depth, neutral-cool white balance, moderate contrast
- No people, no readable text or signage in the background, no clutter near
  the equipment

COMPOSITION:
- Camera: three-quarter front view, slightly above eye level
- Equipment centered, occupying 75-80% of the frame width, fully in frame
- 4:3 aspect ratio, photorealistic detail on all surfaces
```

Критерий приёмки v3: новая картинка рядом с двумя эталонами — по подаче
(фон/свет/резкость/пол) не отличить; конструкция 1:1 с исходником.

### Журнал v3

| Дата | Товар | Результат |
|---|---|---|
| 2026-06-05 | УИ-0.1Т-100 (пилот, edit от render-v1) | ✅ Принят. Цех-подача = эталон; панель/печи 1:1, косяки v1 (выдуманная панель, штурвалы, свет справа) исправлены. 1K → ui-0-1t-100-render-v3.png. |
| 2026-06-05 | Вакуумная печь (тест, фото со старого сайта, 3 юнита + обвязка) | ✅ Все юниты и цветная обвязка сохранены, подача консистентна. Канон подтверждён на сложном фото-исходнике. |
| 2026-06-16 | Дробемёт барабанного типа — батч 10 моделей (320..28) | ✅ Заменены CGI-рендеры с текстом-титром на цех-канон без текста, edit от реальных фото (ФОТО/…/барабанного типа). 8 генераций (7 одиночных + 1 общая установка на 3220/15/28). Для установки текст/бейдж убирался формулировкой «clean image surface, no badges/icons» — прямое «remove Произведено в России/флаг» даёт `422 no_media_generated`. Прод отдаёт webp по Accept → перегенерены `.webp`-соседи. |

**Уроки сессии (зашиты в скил):** рефы ужимать до ≤400 KB (тяжёлый аплоад → `storage PUT 408`);
запускать в форграунде (в фоне stderr теряется); `fetch failed` на COMPLETED = оборвалось
скачивание готовой картинки → просто повторить.

## Спецификация скила /product-image (УПАКОВАН 2026-06-05 → .claude/skills/product-image/SKILL.md)

**Вызов — два обязательных входа** (без них скил останавливается и спрашивает):

```
/product-image <источник> <целевой-раздел>
```

- **источник** — откуда брать исходник для отрисовки. Принимает:
  - путь к конкретному файлу (site/, ФОТО/, picture/);
  - папку товара старого сайта: `site/products/<категория>/<подкат>/<товар>/`
    → скил берёт кандидатов из `images/`;
  - URL старого сайта uralinduktor.ru → скил маппит на путь в `site/`.
- **целевой раздел** — URL нового сайта (по structura.md), например
  `/products/induktsionnye-plavilnye-pechi/po-stali/ui-0-1t-100/`
  → из него скил выводит: папку `picture/products/<путь>/`, страницу
  `astro/src/raw-pages/<путь>/body.html` для вставки, имя файла по конвенции.

**Алгоритм скила:**

1. Разрешить источник. Несколько картинок-кандидатов в `images/` → показать
   Евгению (Read) и спросить, какую брать — БЛОКИРУЮЩИЙ вопрос, не угадывать.
2. Чеклист исходника (см. выше: целиком в кадре, ≥800px, без перекрытий).
   Не проходит → сказать и спросить другой исходник.
3. Генерация: nano-banana-pro-edit, промт v3 (цех-канон), 2K, 4:3.
4. Самопроверка: открыть результат (Read), сравнить с исходником —
   конструкция/панель/надписи 1:1; с эталонами — подача совпадает.
   Дефект → одна повторная итерация с ручкой из таблицы, потом стоп и вопрос.
5. Прод-конвейер: даунскейл 600×450, сжатие ≤100KB, WebP рядом,
   разложить в `picture/products/<путь>/` + копия в astro/public/img
   (симлинк! docs/deploy-gotchas.md), запись в picture.md.
6. Вставить на страницу (body.html целевого раздела), `scripts/shot.sh`
   до/после, показать скриншот, git-коммит. Деплой — только /ship.

**Примеры вызова:**

```
/product-image site/products/induktsionnye-nagrevateli/.../ui-40n/ /products/induktsionnye-nagrevateli/tranzistornye/ui-40n/
/product-image "ФОТО/Документы, Фотографии/Фотографии/Индукционные печи/.../photo_2026-01-27_14-44-52.jpg" /products/induktsionnye-plavilnye-pechi/po-stali/ui-0-1t-100/
```

## БАТЧ-режим: цель = категория (раздел целиком)

Если целевой раздел — категория с товарами (есть подпапки в raw-pages),
скил работает по всей категории. Пример:

```
/product-image https://uralinduktor.ru/products/vakuumnoe-oborudovanie-dlya-termoobrabotki/ /products/vakuumnoe-oborudovanie-dlya-termoobrabotki/
```

Алгоритм батча:

1. **Маппинг-таблица ДО генерации.** Скил собирает: товары целевой категории
   (подпапки raw-pages) ↔ исходники. Источник-категория:
   - есть в слепке `site/` → брать из `<товар>/images/`;
   - НЕТ в слепке (пример — вакуумка, добавлена позже) → скачать страницы
     с живого uralinduktor.ru (curl постранично), вытащить картинки товаров;
   - маппинг по слагам/названиям; неоднозначности — пометить в таблице.
2. **Один блокирующий вопрос на весь батч:** показать Евгению таблицу
   «товар → исходник (превью) → целевой файл → где заменится (grep по имени)».
   Дальше работать без вопросов по каждому товару.
3. **Замена = перезапись файла под ТЕМ ЖЕ именем** (напр. `card-vacuum-dugovaya.jpg`):
   одно имя используется и в хабе категории, и на странице товара, и в корне
   каталога — все вхождения обновляются сами, HTML не трогаем.
   ОБЯЗАТЕЛЬНО обновить и WebP-версию рядом (иначе nginx продолжит отдавать
   старую картинку браузерам с Accept: webp!). Hero категории — тоже в батч.
4. Генерация по одному товару (промт v3 + самопроверка как в одиночном режиме).
   Дефект после повторной итерации → пометить в отчёте, идти дальше, не стопорить батч.
5. Финал батча: прод-конвейер на все файлы, обновление picture.md, скриншоты
   хаба + 2 товарных страниц (shot.sh), отчёт-таблица «сделано/пропущено/вопросы»,
   ОДИН git-коммит на батч. Деплой — только /ship.

---

# Архив: студийный канон DMG MORI (v1/v2 — ОТМЕНЁН)

> Сохранено для истории. Референс был https://en.dmgmori.com/products/machines/ultrasonic.

## Принцип

Edit-модели нужно жёстко разделить KEEP (конструкция — неприкосновенна) и
CHANGE (только подача: фон/свет/тень/ракурс). Иначе модель «улучшает» оборудование —
для B2B недопустимо: заказчик сверяет картинку с реальным железом.

## Промт v1

```
Re-render this industrial machine as an ultra-realistic professional 3D product
visualization in the style of a premium machine-tool catalog.

KEEP EXACTLY AS IN THE SOURCE IMAGE: the machine's design, geometry, proportions,
every component, panels, doors, control screens, cables, logos and labels in their
original positions, and the original brand colors of the equipment. Do not add,
remove, redesign or "improve" any part of the machine.

CHANGE ONLY THE PRESENTATION:
- Background: seamless studio backdrop, very light neutral gray (#F2F3F4),
  no horizon line, no environment, no props, no people, no text
- Camera: three-quarter front view from slightly above (10-15 degrees),
  entire machine fully in frame with even margins on all sides
- Lighting: soft diffused studio light from the upper left, gentle highlights
  on metal and painted surfaces, no harsh glare
- Ground: soft realistic contact shadow directly under the machine, fading
  outward; no mirror reflection on the floor
- Finish: clean photorealistic rendering, crisp edges, fine surface detail
  (brushed metal, painted steel, glass), neutral white balance, moderate contrast
- Composition: machine centered, occupying about 75-80% of the frame width,
  4:3 aspect ratio
```

Выход: 4:3 (целевой размер карточки 600×450, генерить крупнее и даунскейлить).

## Блок для фото-исходников (вставлять между KEEP и CHANGE)

Исходники — реальные фото (двор/цех, пример: ФОТО/.../Тиристорные печи общее/),
не рендеры. Модели нужна явная команда очистки окружения:

```
SOURCE CLEANUP (the source is a real photo, not a render):
- Remove the environment completely: walls, banners, posters, branded backdrops,
  wooden pallets, straps, tools, vehicles, ground clutter, any equipment that is
  not part of this product
- Keep ALL units of the product itself (e.g., furnace body + control cabinet)
  in their exact relative positions, sizes and proportions as in the photo;
  place them directly on the studio floor
- Text, labels and gauges: reproduce only what is clearly legible in the source.
  Never invent, restore or sharpen text, logos or markings — illegible labels
  stay neutral and blurred
- Do not extend or imagine any part of the machine that is hidden or cropped
  in the source photo
```

## Чеклист отбора исходного фото (промт не спасёт плохой кадр)

- [ ] Товар в кадре ЦЕЛИКОМ (не обрезан краем кадра)
- [ ] Разрешение ≥ ~800px по длинной стороне
- [ ] Минимум перекрытий другим оборудованием/людьми
- [ ] Состав кадра = комплект поставки этой карточки (что в кадре — решает
      Евгений по каждому товару; расстановку юнитов НЕ менять — как на фото)

Пример хорошего исходника: photo_2026-01-27_14-44-52.jpg (печь + шкаф, чёткий).
Пример плохого: photo_2021-10-12_09-08-24.png (мало пикселей, печи перекрыты).

## Ручки итераций (менять ПО ОДНОЙ)

| Симптом | Правка |
|---|---|
| «Пластик», игрушечность | Finish: + `realistic material texture: micro-scratches on metal, matte powder-coated steel` |
| Белые части тонут в фоне | фон → `#ECEDEE` или сильнее контактная тень |
| Меняет конструкцию | KEEP: + `this is documentary product photography of real equipment, accuracy is critical` |
| Не тот ракурс | точнее: `front-left three-quarter view, camera at operator eye level +1 meter` |

## Журнал итераций

| Дата | Товар | Версия промта | Результат / что поменяли |
|---|---|---|---|
| 2026-06-05 | УИ-0.1Т-100 | v1 | Стиль ~8/10: фон/тень/материалы попали, «пластика» нет. Ошибки: (1) панель шкафа выдумана (гирлянда лампочек вместо 3×3 приборов с фото), (2) добавлены штурвалы-«звёздочки» на печах, (3) свет справа вместо канонного сверху-слева, камера ниже канона. → v2: в KEEP добавить «panel must match source EXACTLY, do not add lights/screens/controls» и «do not add handwheels/valves/details not in source»; в CHANGE: «light from the UPPER LEFT, shadows to lower right», «camera slightly above, 10-15 degrees». Рендер: picture/products/induktsionnye-plavilnye-pechi/ui-0-1t-100/ui-0-1t-100-render-v1.png (2400×1792, 4.85MB — прод-конвейер потом). |

| 2026-06-06 | Вакуумное оборудование, батч 8 шт. | v3 (цех-канон) | Категория целиком через /product-image (режим А). Исходники — фото товаров с живого uralinduktor.ru по слагам (1:1, слепка site/ для категории нет). Все 8 — многоюнитовые с густой обвязкой → в KEEP перечислены ВСЕ юниты + цветные шланги/трубы поимённо. Результат: все 8 с первого прохода в каноне, без выдумки контролов и упрощения обвязки, свет сверху-слева — правок не потребовалось. Мелочь: у горизонтальной графитовой модель закрыла открытую дверь печи (приемлемо, продукт читается). Прод-конвейер: 1536×1147 JPEG q82 256–328 KB + WebP 76–120 KB. Попутно фикс вёрстки: 4 страницы показывали плитку категории вместо своей карточки. |

| 2026-06-06 | Муфельные печи, батч 8 шт. (нарушители) | v3 (цех-канон) | Выравнивание нарушителей (docs/image-revision.md): студийные рендеры / фото на белом → цех. Метод — edit от **самой карточки** (исходники студийные, на живом сайте лучше нет) + реф цеха. Все 8 с первого прохода в каноне: конструкция/цвет/панели 1:1, без выдумки контролов, свет сверху-слева — правок 0. Дантистов (настольный лаб-прибор) — отдельный промт (лёгкий нейтральный лаб-верстак вместо тяжёлого цеха: бетонный пол под настольным прибором смотрелся бы абсурдно — решение сессии, доку это разрешает). Прод-конвейер: 600×450 JPEG q82 35–65 KB + WebP 8–22 KB. Вывод: метод «edit от карточки» работает и для студийных рендеров, не только для реальных фото. |

| 2026-06-06 | УВЧ-нагреватели, батч 2 шт. (нарушители) | v3 (цех-канон) | Выравнивание нарушителей (docs/image-revision.md): реальные фото товара на белом → цех. Метод — edit от карточки + эталон цеха `card-srednechastotnye` (тот же класс товара). В KEEP перечислены узлы поимённо: серый шкаф / зелёный дисплей / красный пистолет / синие+чёрный кабели (bez-ohl); белый блок / бордовая отделка / сенсор+красные гнёзда / пистолет со шлангом (s-ohl). Оба с первого прохода в каноне, правок 0. Прод-конвейер: 600×450 PNG (pngquant) bez-ohl 99 KB / s-ohl 82 KB + WebP 27 KB. Имена не менялись → хаб + страницы ui-10ab/30ab/10av/30av обновились без правки HTML. |

| 2026-06-06 | Индукционная плавильная печь УИ-0.1Т-100, 1 шт. (нарушитель, финал) | v3 (цех-канон) | Последний из 11 нарушителей ревизии (docs/image-revision.md). `ui-0-1t-100-render-v1.png` — серый студийный рендер (два серебристых тигля с медными катушками + зелёный шкаф управления) → цех. Метод — edit от самой карточки + эталон `catalog-furnace-bucket-s` (та же связка уже в цеху). В KEEP узлы поимённо: оба тигля + катушки, зелёный шкаф с дисплеем/кнопками/индикаторами + кабели снизу. С первого прохода в каноне, правок 0. Роль картинки — **hero/lightbox (phero__main + thumb), не карточка 600×450** → прод-конвейер адаптирован: мастер 1200×896, прод-плоско PNG 435 KB (pngquant 70-88), формат/имя сохранены (страница PNG-only, без webp-соседей — как у всех её фото). HTML: `?v=1`→`?v=2` (cache-bust) + alt thumb «студийный рендер»→«в производственном цеху». **Все 11 нарушителей цех-канона закрыты.** |

## Оптимизация перед продом (требование Евгения, 2026-06-05)

Сейчас — только рисуем и сравниваем. Но при расшивке каждая картинка перед
продом проходит конвейер (всё уже есть в проекте, собрать в один шаг скила):

1. Ресайз до целевого размера карточки **600×450** (генерим крупнее → даунскейл).
2. Сжатие PNG/JPEG (целевой вес карточки ≤ 100 KB).
3. **WebP-версия рядом** — nginx отдаёт её автоматически по Accept (T-PERF-7).
4. Раскладка по местам: `picture/products/<путь-по-URL>/` + запись в picture.md
   + копия в прод-папку img (символическая ссылка! см. docs/deploy-gotchas.md).
5. Контроль: вес до/после в выводе, скриншот карточки на странице (shot.sh).

В скиле /product-image это будет один шаг «оптимизируй и разложи», не ручная работа.

## Критерий приёмки пилота

Рядом три картинки: референс DMG MORI · старая наша · новая.
1) Фон/свет/тень неотличимы от референса. 2) Конструкция товара 1-в-1 со старой.
3) Стиль выдержан на 2–3 РАЗНЫХ типах товара (печь, дробемёт, ковш).
После приёмки → упаковка в скил /product-image (промт + ручки + процесс батчей).
