# Глобальные 301-редиректы: старый WP-сайт → новый Astro

> **Справочно: документ про старый сайт на Astro.** Папка `astro/` удалена 07.10.2026 (есть в истории git);
> сайт теперь — платформа `platform/` (Next.js, база, админка), работаем только локально. Актуальное — [`CLAUDE.md`](../CLAUDE.md).

> Дата анализа: 2026-06-18. После переезда нового сайта на основной домен
> `uralinduktor.ru` старые URL WordPress-сайта стали отдавать 404 (или
> редиректили на промежуточные URL, которых уже нет). Этот документ —
> единый источник правды по карте редиректов.
>
> **Артефакт для деплоя:** [`server/redirects-legacy.map`](../server/redirects-legacy.map)

## Проблема

- Новый сайт (Astro) — **571 URL** (по `astro/dist` sitemap).
- Старый сайт (WP) — **465 URL** (по `content-source/scrape/urls.json`, слепок 2026-05-02).
- Совпадает 1-в-1 только **24 URL**. Остальным **441** нужен редирект.
- В живом nginx уже было ~312 `location=`-редиректов, но **98 из 178 их целей
  протухли** — указывали на плоские URL вида
  `/products/induktsionnye-nagrevateli/<model>/`, которых больше нет (нагреватели
  переразбиты на категории `srednechastotnye/`, `vysokochastotnye/` и т.д.).
  Итог: старый URL → 301 → 404. Это и была причина массовых 404.

## Метод

1. Старые URL извлечены из `content-source/scrape/urls.json` (7 типов записей).
2. Новые URL — из `astro/dist/sitemap-0.xml` (источник правды, что реально живёт).
3. Сопоставление:
   - **по коду модели** — из старого длинного slug извлекается код модели
     (`ui-0-1t-100m`, `uid-376e`, `uich-005`, `uig-40t`…) и ищется новая
     терминальная страница с тем же кодом в leaf;
   - **по категории** — разделы/хабы и снятые с производства позиции ведут на
     ближайший существующий раздел/категорию;
   - **спец-маппинг** — переименованные модели (`ui-5pz→ui-5p`, `ui-70avn→ui-80avn`…);
   - **прочее** — статические страницы и то, что в принципе не сопоставимо → главная.
4. **Каждая цель проверена**: все 440 целей существуют в новом sitemap либо «/».
   Проверка на циклы (цель = чей-то источник) — 0 совпадений.

## Результат — 440 редиректов

| Группа | Кол-во | Правило |
|---|---:|---|
| Товарные карточки (по коду модели) | 157 | старый URL модели → новый URL модели |
| Переименованные модели (ручной маппинг) | 6 | `ui-{5,8,10}pz→…p`, `ui-{70,90,110}avn→…{80,100,120}avn` |
| Разделы/категории + снятые позиции | 57 | → ближайшая категория (см. ниже) |
| Выполненные проекты | 177 | `/equipment/<slug>/` → `/proekty/<slug>/` (176 точных + корень) |
| Наличие на складе | 19 | `/equipment_in_stock/*` → `/nalichie/` |
| Статические/легаси страницы | 18 | см. таблицу ниже |
| Отзывы (на новом сайте нет) | 6 | → `/` (главная) |

### Категорийные цели (57 шт.)

```
10 → /products/induktsionnye-nagrevateli/                         (снятые транзисторные УИ-…Н + хаб)
 8 → /products/oborudovanie-dlya-peschano-glinistyh-smesej-pgs/   (формовочные машины УИФ)
 8 → /products/sistemy-ohlazhdeniya/gradirni/                     (старые УИГ-100…6000 без 1:1)
 6 → /products/mufelnye-termicheskie-pechi/                       (сушильные камеры УИ-МСК)
 4 → /products/zapchasti/drobemetnoe/                             (запчасти без точного slug)
 4 → /products/induktsionnye-nagrevateli/vysokochastotnye/
 3 → /products/induktsionnye-nagrevateli/sverhvysokochastotnye/
 +  → разделы плавильных печей, дробемётов и т.д. (по 1–2)
```

### Статические/легаси страницы

| Старый URL | → Новый |
|---|---|
| `/o-kompanii/` | `/o-company/` |
| `/service/`, `/remont/` | `/uslugi/` |
| `/vypolnennye-proekty/` | `/proekty/` |
| `/plavilnye-pechi/`, `/indutsionnye-pechi-promyshlennoj-chastoty/` | `/products/induktsionnye-plavilnye-pechi/` |
| `/drobemetnye-ustanovki/` | `/products/drobemetnoe-oborudovanie/` |
| `/drobemetnye-ustanovki-s-vykatnym-stolom-serii-uid-76/` | `/products/drobemetnoe-oborudovanie/s-vykatnym-stolom/` |
| `/gradirni-rf/`, `/proizvodstvo-gradirni/` | `/products/sistemy-ohlazhdeniya/gradirni/` |
| `/oborudovanie-dlya-peschano-glinistyh-smesej-pgs/` | `/products/oborudovanie-dlya-peschano-glinistyh-smesej-pgs/` |
| `/mashiny-nepreryvnogo-litya-…-mnlz-…/` | `/products/` |

### 12 редиректов на главную «/» (сопоставление невозможно)

`/contact/`, `/kontakty/`, `/leasing/`, `/lizing/`, `/instruktsii/`, `/poisk/`,
`/reviews/` + 5 страниц отзывов. На новом сайте этих сущностей нет; контакты и
лизинг доступны блоками на главной.

## Как применить (nginx)

Файл `server/redirects-legacy.map` содержит `map $uri $legacy_redirect { … }`.
Карта работает в фазе server-rewrite — **раньше** старых `location=`-блоков,
поэтому переопределяет их (старые блоки становятся мёртвым кодом).

1. Скопировать карту на сервер и подключить на уровне `http{}` **до** `server{}`:
   ```nginx
   # в /etc/nginx/sites-available/uralinduktor, до блока server {
   include /etc/nginx/snippets/redirects-legacy.map;   # или вставить содержимое
   ```
2. Внутри `server{}` сразу после проверки `$host` добавить:
   ```nginx
   if ($legacy_redirect) { return 301 $legacy_redirect; }
   ```
3. Проверить и перезагрузить:
   ```nginx
   nginx -t && systemctl reload nginx
   ```
4. Смоук-тест (должно быть `301` → затем `200`):
   ```bash
   for u in \
     /products/induktsionnoe-oborudovanie/induktsionnye-tiristornye-pechi/induktsionnaya-tiristornaya-pech-ui-0-1t-100m/ \
     /products/induktsionnye-nagrevateli/induktsionnye-nagrevateli-1-15-i-20-50-kgts-srednechastotnye/induktsionnyj-nagrevatel-ui-70avn/ \
     /equipment/postavka-uig-40t/ \
     /equipment_in_stock/ /reviews/ /o-kompanii/ ; do
     echo "$u -> $(curl -sI "https://uralinduktor.ru$u" | awk '/^location/{print $2}')"
   done
   ```
5. Позже — удалить устаревшие `location=`-блоки из vhost (опциональная чистка).

## Регенерация

Источники: `content-source/scrape/urls.json` (старый сайт) + `astro/dist` sitemap
(новый). Логика сопоставления — model-code + категорийные правила. При изменении
структуры каталога перегенерировать карту и заново прогнать смоук-тест.
