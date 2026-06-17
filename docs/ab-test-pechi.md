# A/B-тест рекламы: старый сайт vs new.uralinduktor.ru

> **Статус: ЗАПУЩЕН.** Дата закрытия — **16.06.2026** (по решению Евгения).
> При закрытии — снять сниппет со старого сайта (см. «Как остановить»).

## Цель

Сравнить конверсию рекламного трафика Яндекс.Директа на **старых** посадочных
(WordPress `uralinduktor.ru`) против **новых** (Astro `new.uralinduktor.ru`).
Делёж 50/50 по пользователю, измерение — в **Roistat** (оба сайта пишут в один
проект `55e30c285273fb0205de07d6cfbcb9ce`).

## Как устроено

На **старом** сайте в `<head>` (выше счётчиков Roistat и Метрики) стоит инлайн-скрипт.
Он срабатывает только на 4 тестовых страницах и только для рекламного трафика
(`utm_source` / `yclid` / `gclid`). 50% пользователей он уводит на парную новую
страницу `location.replace()` **до загрузки счётчика старого сайта** — поэтому визит
на старом домене не фиксируется, и деление получается чистым (один визит на нового).
Назначение варианта липкое — cookie `ab_variant` на `.uralinduktor.ru` (один вариант
на пользователя по всем парам).

Почему не свой счётчик/редирект на стороне Roistat: ключевой приём — увести раньше,
чем отработает counter. Гарантия держится на том, что скрипт стоит **выше** сниппетов
Roistat/Метрики в исходнике `<head>`.

## 4 пары посадочных

| Старая (uralinduktor.ru) | → Новая (new.uralinduktor.ru) |
|---|---|
| `/products/induktsionnoe-oborudovanie/inductionye-tiristornye-pechi-po-stali/` | `/products/induktsionnye-plavilnye-pechi/po-stali/` |
| `/products/sistemy-ohlazhdeniya/cooling-towers/` | `/products/sistemy-ohlazhdeniya/gradirni/` |
| `/products/drobemetnoe-oborudovanie/` | `/products/drobemetnoe-oborudovanie/` |
| `/products/drobemetnoe-oborudovanie/drobometnii-ystanovki-kran-tip/` | `/products/drobemetnoe-oborudovanie/kranovogo-tipa/` |

## Скрипт (развёрнут на старом сайте, в `<head>` выше счётчиков)

```html
<!-- A/B-сплит: 4 пары посадочных. ВСТАВИТЬ ПЕРВОЙ СТРОКОЙ В <head>, ВЫШЕ Roistat и Метрики -->
<script>
(function () {
  // Карта: путь на СТАРОМ сайте (без конечного /) → полный URL на НОВОМ сайте
  var MAP = {
    '/products/induktsionnoe-oborudovanie/inductionye-tiristornye-pechi-po-stali':
      'https://new.uralinduktor.ru/products/induktsionnye-plavilnye-pechi/po-stali/',
    '/products/sistemy-ohlazhdeniya/cooling-towers':
      'https://new.uralinduktor.ru/products/sistemy-ohlazhdeniya/gradirni/',
    '/products/drobemetnoe-oborudovanie':
      'https://new.uralinduktor.ru/products/drobemetnoe-oborudovanie/',
    '/products/drobemetnoe-oborudovanie/drobometnii-ystanovki-kran-tip':
      'https://new.uralinduktor.ru/products/drobemetnoe-oborudovanie/kranovogo-tipa/'
  };

  var COOKIE = 'ab_variant'; // один вариант на пользователя по всем парам
  var SHARE  = 0.5;          // доля трафика на новый сайт

  // Работаем ТОЛЬКО на одной из 4 тестовых страниц (точное совпадение пути)
  var path = location.pathname.replace(/\/+$/, '');
  var NEW_URL = MAP[path];
  if (!NEW_URL) return; // любая другая страница — выходим, ничего не делаем

  var qs = location.search;
  function getCookie(n){var m=document.cookie.match('(^|;)\\s*'+n+'=([^;]+)');return m?m[2]:'';}

  // QA-override: ?ab_force=new / ?ab_force=old
  var force = (qs.match(/[?&]ab_force=(new|old)/) || [])[1];

  // Делим только рекламный трафик (utm_source / yclid / gclid)
  if (!force && !/[?&](utm_source|yclid|gclid)=/.test(qs)) return;

  var v = force || getCookie(COOKIE);
  if (!v) {
    v = (Math.random() < SHARE) ? 'new' : 'old';
    document.cookie = COOKIE+'='+v+';path=/;max-age=2592000;domain=.uralinduktor.ru';
  }

  if (v === 'new') {
    location.replace(NEW_URL + (qs ? qs + '&' : '?') + 'ab=new');
  }
})();
</script>
```

Параметры под правку: `SHARE` (доля на новый), `MAP` (пары страниц).
Маркер `ab=new` добавляется в URL ушедших — для фильтрации в аналитике.

## Проверка (браузер; через curl JS-редирект не виден)

DevTools → Network → ☑ Preserve log. Между заходами — инкогнито или чистить
cookie `ab_variant`.

**Должны увести на свою пару** (`?utm_source=test&ab_force=new`):
- `…/inductionye-tiristornye-pechi-po-stali/` → po-stali
- `…/sistemy-ohlazhdeniya/cooling-towers/` → gradirni
- `…/drobemetnoe-oborudovanie/` → drobemetnoe-oborudovanie
- `…/drobemetnoe-oborudovanie/drobometnii-ystanovki-kran-tip/` → kranovogo-tipa

**НЕ должны трогать** (контроль): `…/induktsionnye-tranzistornye-pechi/`,
дочерняя `…/cooling-towers/sistema-ohlazhdeniya-uig-100-gradirnya/`, главная.

Главный признак чистого деления: на варианте «new» в Network **нет** запроса к
`cloud.roistat.com` на старом домене (счётчик не успел).

## Результат в Roistat

Те же кампании теперь кормят две посадочные. Сравнивать по домену/посадочной:
конверсия визит→заявка и стоимость заявки. Заявки нового сайта привязываются к
визиту через `roistat_visit` (forms.js → send.php → поле сделки Битрикс24
`UF_CRM_1758699797`). Доп. фильтр — метка `ab=new` в URL.

## Как остановить (на 16.06.2026)

Удалить инлайн-скрипт из `<head>` старого сайта (там же, где вставляли — `header.php`
темы / плагин вставки кода). После удаления весь трафик снова идёт на старые страницы.

## Замечания

- Скрипт живёт на **старом WordPress-сайте**, его нет в этом репозитории — здесь
  только эталон + инструкция.
- Кэш WP может отдавать старую версию страницы после правок — проверять с `?cb=…`.
- В Safari клиентская cookie живёт ~7 дней (ITP) — липкость варианта до недели.
