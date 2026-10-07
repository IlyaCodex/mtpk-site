---
name: product-image
description: Перерисовать/заменить товарные картинки в цех-канон (v3) — один товар, категория или раздел целиком; исходники из site/, ФОТО/ или с живого uralinduktor.ru. Триггеры: «перерисуй/замени картинки», «картинки раздела/категории», «исходники на старом сайте».
---

> ЛЮБАЯ задача про товарные картинки идёт ТОЛЬКО по этому скилу (правило #9
> CLAUDE.md). Свободная формулировка Евгения = тоже этот скил, не импровизация.
> Цель — категория/раздел → раздел «БАТЧ: категория целиком» внизу.

Канон ПРИНЯТ Евгением 2026-06-05. Источник правды и история — briefs/product-image-prompt.md.
Эталоны подачи (цех): picture/products/induktsionnye-plavilnye-pechi/catalog-furnace-bucket-s.png,
picture/products/induktsionnye-nagrevateli/card-srednechastotnye.png.
Инструмент: nano-banana-pro-edit через ~/.claude/skills/my-designer/scripts/generate.mjs (edit от исходника).

Вход от Евгения: товар (URL/имя) + исходник (рендер или фото). Не дал исходник — спроси.

## 1. Подготовка

- Определи путь карточки по structura.md/URL: picture/products/<путь по URL>/.
- Исходник: если URL — скачай (`curl -sL --max-time 60 -o /tmp/src.jpg <url>`); если файл — возьми его.
- **Ужми рефы до ≤400 KB JPEG** — иначе аплоад в fal storage таймаутит (PUT 408):
  `sips -Z 1400 -s format jpeg -s formatOptions 85 <исходник> --out /tmp/ref-src.jpg`
  Эталон цеха ужми один раз так же → /tmp/ref-tseh.jpg (или переиспользуй).

## 2. Промт v3 (цех-канон) — вставлять как есть

```
Re-render this industrial equipment as an ultra-realistic professional product
photograph taken in a clean modern industrial workshop.
KEEP EXACTLY AS IN THE SOURCE IMAGE: the machine's design, geometry, proportions,
every component, panels, doors, control elements, gauges, cables, logos and labels
in their original positions, and the original colors of the equipment. The control
panel must match the source EXACTLY — do not add screens, indicator lights or
controls that are not in the source. Do not add handwheels, valves or decorative
details not visible in the source. Never invent, restore or sharpen any text.
SETTING (replace the original background completely): spacious modern industrial
workshop hall, softly blurred with shallow depth of field — steel roof trusses,
columns, distant equipment silhouettes, large windows with soft daylight. The
equipment stands on a clean concrete floor, sharp and fully in focus, with realistic
contact shadows under it. Lighting: soft natural daylight from large windows on the
upper left, subtle light haze in the hall depth, neutral-cool white balance, moderate
contrast. No people, no readable text or signage in the background, no clutter near
the equipment. COMPOSITION: camera three-quarter front view, slightly above eye
level; equipment centered, occupying 75-80% of the frame width, fully in frame;
4:3 aspect ratio, photorealistic detail on all surfaces.
```

Фото-исходник с густой обвязкой/многоюнитовый (печь+шкаф+конденсатор, шланги, фитинги):
в KEEP перечисли ВСЕ юниты и обвязку поимённо («keep ALL three units… all colored
hoses and copper pipes in their original routing») — модель иначе упрощает мелочёвку.

## 3. Генерация

```
node ~/.claude/skills/my-designer/scripts/generate.mjs \
  --model nano-banana-pro-edit --prompt "<промт v3>" \
  --ref /tmp/ref-src.jpg --ref /tmp/ref-tseh.jpg \
  --aspect 4:3 --resolution 1K \
  --out picture/products/<путь> --name <имя-kebab>
```

- **Запускай в форграунде** (не run_in_background) — иначе stderr буферизуется и реальная
  ошибка теряется; в фоне видно только «IN_QUEUE» перед смертью процесса.
- 1K хватает: карточка всё равно даунскейлится до 600×450. 2K — только если Евгений просит.
- **`fetch failed` на этапе COMPLETED** = картинка сгенерилась, оборвалось скачивание
  (слабый канал) → просто повтори запуск, со 2-3 раза скачивается. `storage PUT 408` =
  реф слишком тяжёлый, вернись к шагу 1. Долгий `IN_QUEUE` (>5 мин) = очередь fal перегружена.

## 4. Проверка глазами (Read результат)

Сверь с эталоном (ПОДАЧА) и с исходником (КОНСТРУКЦИЯ):
- Подача: цех-холл, свет сверху-слева, дымка, бетон, размытый задник, контактные тени —
  как у эталонов, «из той же серии».
- Конструкция 1:1: все узлы/юниты, цвета, панель и обвязка — как в исходнике.
  Модель НЕ должна выдумывать экраны/лампы/штурвалы/упрощать обвязку.
Не похоже или выдумало детали → правь ОДНОЙ ручкой, перегенери. Брак Евгению не показывай.

| Симптом | Ручка |
|---|---|
| Упростило/выкинуло обвязку, фитинги | KEEP: перечислить узлы поимённо + «do not simplify any pipes or fittings» |
| Выдумало контролы на панели | KEEP: «control panel must match source EXACTLY, do not add screens/lights/controls» |
| Свет не сверху-слева | CHANGE: «light strictly from the UPPER LEFT, soft shadows to lower right» |
| Слишком студийно, мало цеха | усилить SETTING: «visible workshop depth, roof trusses and windows clearly behind» |
| Игрушечность/пластик | + «realistic material texture: brushed metal, matte powder-coated steel, micro detail» |
| Похоже на 3D-рендер (CGI-вид) | переписать на ФОТО: «Make this a REAL PHOTOGRAPH, NOT a 3D render; re-light and photographically re-render the SAME equipment: powder-coated steel texture, micro-scratches, dust, ambient occlusion, soft window light, DSLR 35mm f/4, fine film grain» + AVOID «smooth plastic CGI, even surfaces, fake studio gloss». Рендерить в 2K — фактура живее при даунскейле |
| Выдумало ЧУЖОЙ субъект (скопировало печь/тигель/ковш из 2-го рефа) | KEEP: «equipment is EXACTLY the <тип> from the FIRST reference» + «the SECOND reference is ONLY for background and color — do NOT copy any equipment/crucible/coil/shape from it». Риск выше у простых одноюнитовых на усиленном фото-промте |

## 5. Прод-конвейер (один проход, после приёмки картинки)

Цель карточки: **600×450, ≤100 KB**. WebP/AVIF и уменьшенные копии делает медиасервис платформы сам (по Accept и ?w=).
```
sips -z 450 600 <render>.png --out <card>.png            # точный 600×450 (ген уже 4:3)
pngquant --quality=65-85 --force --output <card>.png <card>.png   # фото-PNG; если >100KB → JPEG q82
```
- Исходник — в picture/products/<путь по URL>/<имя>.png (архив картинок проекта).
- Запиши в picture.md (страница, блок, источник, дата).
- На сайт: загрузи в медиатеку платформы (S3) — админка «Медиатека» (папка img/…) или
  PUT /admin/v1/objects/img/<путь> медиасервиса. Новая обложка товара — в админке:
  «Каталог продукции» → товар → «В каталоге» (обложка) / «Страница товара» (фото).
- Контроль: выведи вес до/после; снимок страницы — cd platform && npm run checks -- --visual --only=<адрес>
  (до замены — с --save).

## 6. Финал

git commit (товар + версия канона) + отметка в PLAN.md. История промта/итераций — в
журнал briefs/product-image-prompt.md. Запутался/Евгений поправил дважды — /clear, новая сессия.

## БАТЧ: категория целиком (режим А)

Вход: целевая категория нового сайта + источник (категория старого сайта /
site/ / папка). Пример запроса Евгения: «перерисовать картинки на
new.uralinduktor.ru/products/<категория>/, исходники по названиям на
uralinduktor.ru/products/<категория>/, внутри карточек тоже заменить».

1. МАППИНГ-ТАБЛИЦА ДО ГЕНЕРАЦИИ. Товары категории — в админке «Каталог продукции»
   (или GET /admin/v1/catalog/tree контент-сервиса). Исходники: site/<...>/images/,
   а если категории нет в слепке — скачать страницы живого uralinduktor.ru
   (curl) и вытащить картинки товаров. Маппинг по слагам/названиям.
2. ОДИН блокирующий вопрос на весь батч: показать Евгению таблицу
   «товар → исходник → целевой файл → где заменится (grep по имени)».
   После «ок» — без вопросов по каждому товару.
3. Замена = перезапись в медиатеке под ТЕМ ЖЕ адресом (/img/…/card-*.jpg): одно имя
   живёт в карточке, на странице товара и в корне каталога — заменится везде, страницы
   не трогать. Копии WebP/AVIF медиасервис пересоздаст сам. Hero категории — тоже в батч.
4. По каждому товару: шаги 1–4 скила (промт v3, самопроверка). Дефект после
   одной повторной итерации → пометить в отчёте, идти дальше, батч не стопорить.
5. Финал: прод-конвейер на все файлы (шаг 5), picture.md, скриншоты хаба +
   2 товарных страниц, отчёт-таблица «сделано/пропущено», ОДИН git-коммит.

## Батч (выравнивание нарушителей, шаг 4 задачи в PLAN)

Ревизия picture/products/ → список карточек НЕ в цех-каноне (студийные/белый фон/чужая подача).
Эталон цеха ужать один раз. Гнать по одной карточке шагами 1–5, копить в один коммит пачкой.
Состав кадра (что в комплекте) по каждому товару — решает Евгений; расстановку юнитов с
исходника НЕ менять.
