# Спецификация подсистемы форм заявок — УралИндуктор / МТПК

> **Справочно: документ про старый сайт на Astro.** Папка `astro/` удалена 07.10.2026 (есть в истории git);
> сайт теперь — платформа `platform/` (Next.js, база, админка), работаем только локально. Актуальное — [`CLAUDE.md`](../CLAUDE.md).

**Живой документ.** Обновлять при любых правках форм, обработчика, защиты или аналитики.
Последнее обновление: 2026-05-29.

Связанные документы:
- [`tz-form-secrets-smtp.md`](tz-form-secrets-smtp.md) — ТЗ по выносу секретов + SMTP (Security).
- [`hosting-spec.md`](hosting-spec.md) — сервер, nginx, процедура деплоя.

---

## 1. Что это и как работает (обзор)

Все формы на сайте отправляют заявку на один серверный обработчик
`POST /api/send.php`. Обработчик рассылает заявку в **3 канала одновременно**:

1. **Email** — SMTP (PHPMailer) с ящика `noreply@uralinduktor.ru` → на `info@uralinduktor.ru`.
2. **Битрикс24** — входящий вебхук, метод **`crm.deal.add`** (новая **сделка** — заказчик
   работает только со сделками, не с лидами). Имя+телефон в `TITLE`, все данные в `COMMENTS`,
   визит Roistat в поле сделки `UF_CRM_1758699797`.
3. **Лог-страховка** — `/var/www/uralinduktor/logs/leads.log` (JSON-строка на заявку).

**Fail-safe:** заявка пишется в лог **до** попыток email/Битрикс. Если любой
внешний канал недоступен — клиент всё равно получает «успех», заявка не теряется.

---

## 2. Формы на сайте (фронтенд)

Три формы, все с классом `.js-lead-form`, реализованы как Astro-компоненты:

| Компонент | `data-form` | Где используется |
|---|---|---|
| `src/components/blocks/Leadgen.astro` | «Подбор и расчёт» | главная + категории (большая форма с именем/почтой/телефоном/задачей) |
| `src/components/blocks/BestOffer.astro` | «Лучшее предложение» | главная + страницы (блок «лучшая цена») |
| `src/components/blocks/CatalogCta.astro` | «Каталог · Лучшее предложение» | страницы каталога |

### Поля формы

Видимые (зависят от формы): `name`, `phone` (обязательны в Leadgen), `email`, `task`.

Скрытые служебные (есть во всех формах):
| Поле | Класс | Назначение |
|---|---|---|
| `company` | `.hp-field` | **honeypot** — приманка для ботов, должно остаться пустым |
| `form_ts` | `.js-form-ts` | timestamp загрузки формы (мс) — для time-check на бэке |
| `source` | `.js-form-source` | источник заявки = `data-form` + `location.pathname` |
| `roistat_visit` | `.js-roistat` | id визита Roistat из cookie (см. §5) |

### ⚠️ Honeypot прячется ГЛОБАЛЬНЫМ CSS

Правило `.hp-field { position:absolute; left:-9999px; … }` лежит в
`BaseLayout.astro` в теге **`<style is:global>`**. Без `is:global` Astro
заскоупит правило на `data-astro-cid` слоя, а honeypot-инпут живёт в
компонентах форм (другой cid) — и поле станет **видимым** над «Имя».
Это уже один раз случилось; не убирать `is:global`.

### Клиентская логика — `public/js/forms.js`

- При загрузке: проставляет `form_ts` (Date.now) и `source` в каждую форму.
- На submit: `preventDefault` → нативная HTML5-валидация (`reportValidity`) →
  доп.проверка телефона (минимум 6 цифр) → `fetch` на `/api/send.php` →
  показ статуса (`.js-form-status`: pending/success/error), сброс формы при успехе.
- Кнопка submit блокируется на время отправки («Отправляем…»).

### Маска телефона — `public/js/phone-mask.js`

Формат `+7 (XXX) XXX-XX-XX` по умолчанию; `8` → `7`. Если ввод начинается с `+`
и не с `7` — свободный ввод (иностранные номера не ломаются).

---

## 3. Защита от ботов (на бэке, `send.php`)

Последовательность (всё до отправки в каналы):
1. **Метод** — только POST (иначе 405).
2. **Origin/Referer** — хост должен быть из `ALLOWED_HOSTS`
   (`new.uralinduktor.ru`, `uralinduktor.ru`), иначе 403.
3. **Honeypot** — если `company` непусто → тихо «успех», ничего не шлём.
4. **Time-check** — заполнение быстрее `MIN_FILL_SECONDS` (3 с) → тихо «успех».
5. **Rate-limit** — ≤ `RATE_LIMIT_MAX` (5) заявок за `RATE_LIMIT_WINDOW` (60 с)
   с одного IP (файлы в `/tmp/uralinduktor-ratelimit`), иначе 429.
6. **Валидация** — телефон ≥ 6 цифр (иначе 422); email если задан — проверка формата.

Без капчи (сознательно — не ломаем UX).

---

## 4. Секреты и безопасность сервера

Реквизиты — НЕ в коде, а в файле вне web-root:
`/var/www/uralinduktor/config/secrets.php` (возвращает массив).

| Объект | Владелец : права |
|---|---|
| `config/` | `root:www-data` `750` |
| `config/secrets.php` | `root:www-data` `640` |
| `logs/` | `www-data:www-data` `750` |
| `logs/leads.log` | `www-data:www-data` `640` |
| `api/send.php` | `www-data:www-data` `640` |
| `api/lib/PHPMailer/*` | `www-data:www-data` файлы `640`, каталог `750` |

Ключи `secrets.php`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`ssl`/`tls`),
`SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (= `SMTP_USER`, важно для SPF/DKIM),
`MAIL_TO` (`info@uralinduktor.ru`), `B24_WEBHOOK`.

**Железные правила (Security):** значения секретов заполняет только пользователь
через `sudo nano` на сервере; в чат/историю/файлы проекта не попадают; после
заполнения файл не читать (`cat`/Read) — проверять только `php -l` и `ls -l`.

**Почта:** SMTP с TLS, `verify_peer` не отключать. `From` = аутентифицированный ящик.
**Битрикс:** `CURLOPT_SSL_VERIFYPEER => true` (не отключать).

**nginx defense-in-depth** (в vhost `sites-available/uralinduktor`, 443-блок):
```nginx
location ~ ^/(config|logs)/ { deny all; access_log off; return 404; }
location ~ ^/api/.*\.log$  { deny all; access_log off; return 404; }
```
Без этого `/config/`, `/logs/` отдавали бы SPA-fallback (200 с index.html) —
не утечка содержимого, но Security требует жёсткий 404.

**PHPMailer:** ставится вручную (без composer), 3 файла из официального релиза,
версия фиксирована, `const VERSION` сверяется с тегом скачивания (целостность).
Текущая версия: 6.9.3.

---

## 5. Roistat — захват визита

Roistat ставит cookie `roistat_visit` **не мгновенно** (≈1–2 с после загрузки).
Логика (в `forms.js`):
1. Через **2 с** после загрузки читаем cookie → кладём в скрытые `.js-roistat`.
2. Если cookie ещё пуста — **ретрай через 1 с** (т.е. на 3-й секунде).
3. На submit — финальная попытка `fillRoistat()` перед отправкой.

Бэкенд (`send.php`) читает `roistat_visit` из POST, пишет в лог (поле `roistat`),
в письмо («Roistat visit: …») и в **сделку** Битрикс — в выделенное поле
**`UF_CRM_1758699797`** (поле «roistat» сущности «Сделка»), плюс дублирует в `COMMENTS`.

> ⚠️ Поля `roistat`/`qlead`/`spam` существуют на **сделке** (не на лиде). На лиде их нет —
> `crm.lead.*` их не видит. Запись подтверждена: создаём сделку → читаем поле обратно → значение на месте.
> Прочие UF-поля сделки (если понадобятся): `UF_CRM_1763370435` (date «Дата qlead»),
> `UF_CRM_1765197898`, `UF_CRM_1774329648` (string).

Сам **счётчик Roistat** размещается в контейнере аналитики (см. §6) — именно он
и ставит cookie `roistat_visit`.

---

## 6. Аналитика — контейнер скриптов

`src/components/Analytics.astro` подключается в конце `<body>` на всех страницах
(через `BaseLayout.astro`). **Подключены (2026-05-29):**
- **Roistat counter** — projectId `55e30c285273fb0205de07d6cfbcb9ce`;
- **Яндекс.Метрика** — counter `25228307` (webvisor, clickmap, trackLinks, accurateTrackBounce).

**Как заполнить:** вставить коды между соответствующими маркерами в
`Analytics.astro`, затем пересобрать (`npm run build`) и задеплоить статику.

> ⚠️ Каждый сторонний `<script>` помечать `is:inline` — иначе Astro попытается
> его собрать/обработать и сломает (особенно код с `document.write`).
> Пример: `<script is:inline> …код счётчика… </script>`.

---

## 7. Карта файлов

| Файл | Роль |
|---|---|
| `astro/src/components/blocks/{Leadgen,BestOffer,CatalogCta}.astro` | разметка форм |
| `astro/src/components/Analytics.astro` | контейнер Roistat + Метрика |
| `astro/src/layouts/BaseLayout.astro` | honeypot/status CSS (`is:global`), подключение скриптов и Analytics |
| `astro/public/js/forms.js` | submit-логика, honeypot/ts/source, захват roistat_visit |
| `astro/public/js/phone-mask.js` | маска телефона |
| `server/api/send.php` | обработчик (исходник; деплой → `/var/www/uralinduktor/api/send.php`) |
| `server/…` → `/var/www/uralinduktor/config/secrets.php` | секреты (только на сервере) |
| `/var/www/uralinduktor/logs/leads.log` | лог-страховка заявок |
| `/var/www/uralinduktor/api/lib/PHPMailer/` | PHPMailer 6.9.3 |

---

## 8. Деплой и проверка

**Статика** (Astro): `rsync` из `dist/` в `/var/www/uralinduktor-astro/`
**с `--exclude=img`** (там симлинк на реальные картинки). См. `hosting-spec.md`.

**Обработчик:** `rsync server/api/send.php → /var/www/uralinduktor/api/`,
затем `chmod 640`, `php -l`.

**Кэш:** HTML и `/js/*` отдаются `no-cache` (правки видны сразу). `/css/*`
кэшируется на 7 дней — при правке CSS поднимать `?v=` у ссылки в `BaseLayout`.

**Чек-лист проверки после изменений форм:**
- honeypot-поле не видно над «Имя» (CSS `.hp-field` глобальный);
- `/config/secrets.php`, `/logs/leads.log`, `/api/leads.log` → 404;
- тестовая заявка → `{"ok":true}`, строка в `leads.log`, письмо на `info@`, лид в Битрикс;
- `roistat_visit` из cookie попадает в лог/письмо/лид;
- после теста удалить тестовую строку из лога, тестовый лид из Битрикс, тестовое письмо.

---

## 9. История изменений

- **2026-05-29 (поздн.)** — Битрикс переведён с `crm.lead.add` на **`crm.deal.add`**
  (создаётся сделка), `roistat_visit` пишется в поле сделки `UF_CRM_1758699797` (проверено
  записью+чтением). Причина: кастомные поля roistat/qlead/spam живут на сделке, не на лиде.
- **2026-05-29** — вынос секретов в `config/secrets.php` (root:www-data 640),
  PII-лог в `logs/` (640), PHPMailer 6.9.3, SMTP вместо `mail()`, nginx deny для
  `config|logs`/`api/*.log`. Подключены: Битрикс24 (crm.lead.add), захват
  `roistat_visit` (2 с + ретрай), контейнер `Analytics.astro` под Roistat/Метрику.
  Honeypot переведён на `is:global` (был виден над «Имя»). В `Analytics.astro`
  подключены счётчики Roistat (`55e30c…b9ce`) и Яндекс.Метрики (`25228307`).
- **Ранее** — базовые формы (honeypot + rate-limit + time-check + origin-check),
  умная маска телефона (+7 / иностранные), обязательные имя+телефон в Leadgen,
  fix скролл-якорей и ссылок футера.
