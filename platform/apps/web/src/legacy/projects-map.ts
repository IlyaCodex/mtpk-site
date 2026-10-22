/* ============================================================
   Карта реализованных проектов — УралИндуктор (главная, «География»).
   Yandex Maps JS API 2.1: кластеры с числом проектов. Щелчок по кластеру:
   проекты в разных местах — приблизить к ним; в одной точке (один город:
   у таких проектов одни координаты) — «паутина»: метки расходятся вокруг
   неё, к каждой — линия от центра. Метка проекта — по щелчку карточка под
   картой ([data-geo-card]): фото, город, название, ссылка.
   Кнопки секции: страны ([data-geo-country], видна, если у страны есть
   проекты), масштаб и «Все проекты» ([data-geo-zoom="in|out|all"]).
   Данные: window.projects (js/projects-data.js); страна — поле country,
   иначе по городу (не из списка — Россия).
   ============================================================ */
/** Объекты Yandex Maps — без типов (ymaps: any в globals.d.ts). */
type YObject = any;

(function () {
  'use strict';

  var MAP_ID = 'projects-map';

  /** Города за пределами России — для проектов без поля country. */
  var COUNTRY_BY_CITY: Record<string, string> = {
    'Алматы': 'Казахстан', 'Актобе': 'Казахстан', 'Астана': 'Казахстан', 'Атырау': 'Казахстан', 'Караганда': 'Казахстан',
    'Костанай': 'Казахстан', 'Павлодар': 'Казахстан', 'Темиртау': 'Казахстан', 'Уральск': 'Казахстан',
    'Усть-Каменогорск': 'Казахстан', 'Шымкент': 'Казахстан', 'Экибастуз': 'Казахстан',
    'Ташкент': 'Узбекистан', 'Самарканд': 'Узбекистан', 'Навои': 'Узбекистан', 'Алмалык': 'Узбекистан', 'Бекабад': 'Узбекистан',
    'Бишкек': 'Кыргызстан', 'Душанбе': 'Таджикистан', 'Ереван': 'Армения', 'Минск': 'Беларусь', 'Гомель': 'Беларусь'
  };
  function countryOf(p: Project): string {
    return p.country || COUNTRY_BY_CITY[p.city || ''] || 'Россия';
  }

  function esc(s: unknown): string {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /** Кластер с проектами ближе этого (градусы, ~5 км) — одна точка: раскрывается «паутиной», а не приближением. */
  var SAME_PLACE = 0.05;

  /** Шаг между метками «паутины», px: значок метки ~26 px. */
  var SPIDER_STEP = 34;

  /**
   * Раскладка «паутины» в пикселях вокруг центра, первая метка — сверху: до 8 — по кругу, больше —
   * спиралью Архимеда (виток к витку — тот же шаг). Начало — за значком кластера, он остаётся в центре.
   */
  function spiderOffsets(n: number): [number, number][] {
    var out: [number, number][] = [];
    var i, a;
    if (n <= 8) {
      var r = Math.max(56, (SPIDER_STEP * n) / (2 * Math.PI));
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        out.push([r * Math.cos(a), r * Math.sin(a)]);
      }
      return out;
    }
    var turn = SPIDER_STEP / (2 * Math.PI);
    for (i = 0, a = 0; i < n; i++) {
      var rr = 50 + turn * a;
      out.push([rr * Math.cos(a - Math.PI / 2), rr * Math.sin(a - Math.PI / 2)]);
      a += SPIDER_STEP / rr;
    }
    return out;
  }

  function build() {
    var el = document.getElementById(MAP_ID);
    var projects = window.projects;
    if (!el || !projects) return;
    var root: ParentNode = el.closest('section') || document;
    var card = root.querySelector<HTMLElement>('[data-geo-card]');

    var map = new ymaps.Map(el, {
      center: [56, 61], zoom: 4, controls: []
    }, {
      suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true
    });
    map.behaviors.disable('scrollZoom');

    // щелчок по кластеру — свой (ниже): приблизить или раскрыть «паутиной»; балуна у кластера нет.
    // Раньше кластер с проектами в одной точке приближался до улиц (точки так и не расходились)
    // и открывал пустой балун: его содержимое подкладывалось только первым кластерам.
    var cluster = new ymaps.Clusterer({
      preset: 'islands#greenClusterIcons',
      groupByCoordinates: false,
      clusterDisableClickZoom: true,
      clusterOpenBalloonOnClick: false,
      gridSize: 80,
      hasHint: false
    });

    function hideCard() {
      if (card) card.hidden = true;
    }
    function showCard(p: Project) {
      if (!card) return;
      card.innerHTML =
        (p.image ? '<img class="geomap-card__img" src="' + esc(p.image) + '" alt="" loading="lazy">' : '') +
        '<div class="geomap-card__body">' +
          (p.city ? '<div class="geomap-card__city">' + PIN + esc(p.city) + '</div>' : '') +
          '<div class="geomap-card__title">' + esc(p.name) + '</div>' +
          (p.link ? '<a class="geomap-card__link" href="' + esc(p.link) + '">Смотреть проект <span class="geomap-card__arrow" aria-hidden="true"></span></a>' : '') +
        '</div>' +
        '<button type="button" class="geomap-card__close" aria-label="Закрыть карточку">' + CLOSE + '</button>';
      card.hidden = false;
    }
    if (card) {
      card.addEventListener('click', function (e) {
        if ((e.target as Element).closest('.geomap-card__close')) hideCard();
      });
    }

    var all = projects.filter(function (p) { return p.ll; }).map(function (p) {
      var pm = new ymaps.Placemark(p.ll, { hintContent: p.name, projectData: p }, { preset: 'islands#greenCircleDotIcon' });
      pm.events.add('click', function () { showCard(p); });
      return { pm: pm, country: countryOf(p) };
    });

    /** Видимые сейчас проекты — для «вписать» и центра на узком экране. */
    var shown = all;
    function fit() {
      var bounds = cluster.getBounds();
      if (!bounds) return;
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 }).then(function () {
        // узкая карта (телефон) вписала бы проекты на виде всего мира — тогда центр по проектам, масштаб не мельче 3
        if (map.getZoom() >= 3) return;
        var lat = 0, lon = 0;
        shown.forEach(function (x) { var ll = x.pm.geometry.getCoordinates(); lat += ll[0]; lon += ll[1]; });
        map.setCenter([lat / shown.length, lon / shown.length], 3);
      });
    }
    function show(country: string) {
      closeSpider();
      cluster.removeAll();
      shown = all.filter(function (x) { return !country || x.country === country; });
      cluster.add(shown.map(function (x) { return x.pm; }));
      hideCard();
      fit();
    }

    // — «Паутина»: проекты одной точки расходятся вокруг неё, к каждой метке — линия от центра —
    var spider = new ymaps.GeoObjectCollection();
    var spiderHub: YObject = null;
    function closeSpider() {
      if (!spiderHub) return;
      spider.removeAll();
      spiderHub = null;
    }
    function openSpider(hub: YObject, objs: YObject[]) {
      closeSpider();
      var zoom = map.getZoom();
      var projection = map.options.get('projection');
      var center = hub.geometry.getCoordinates();
      var c = projection.toGlobalPixels(center, zoom);
      var offsets = spiderOffsets(objs.length);
      // «паутина» целиком на виду: у края — сдвинуть карту (масштаб тот же); справа — кнопки карты
      var reach = 18 + Math.max.apply(null, offsets.map(function (o) { return Math.sqrt(o[0] * o[0] + o[1] * o[1]); }));
      var size = map.container.getSize();
      var view = projection.toGlobalPixels(map.getCenter(), zoom);
      var dx = Math.max(0, c[0] + reach - (view[0] + size[0] / 2 - 80)) - Math.max(0, view[0] - size[0] / 2 + 24 - (c[0] - reach));
      var dy = Math.max(0, c[1] + reach - (view[1] + size[1] / 2 - 36)) - Math.max(0, view[1] - size[1] / 2 + 24 - (c[1] - reach));
      if (dx || dy) map.setCenter(projection.fromGlobalPixels([view[0] + dx, view[1] + dy], zoom), zoom, { duration: 250 });
      offsets.forEach(function (off, i) {
        var p: Project = objs[i].properties.get('projectData');
        var ll = projection.fromGlobalPixels([c[0] + off[0], c[1] + off[1]], zoom);
        spider.add(new ymaps.Polyline([center, ll], {}, {
          strokeColor: '#4fab3a', strokeWidth: 2, strokeOpacity: 0.85, interactivityModel: 'default#transparent'
        }));
        var pm = new ymaps.Placemark(ll, { hintContent: p.name }, { preset: 'islands#greenCircleDotIcon', zIndex: 1000 });
        pm.events.add('click', function () { showCard(p); });
        spider.add(pm);
      });
      spiderHub = hub;
    }

    cluster.events.add('click', function (e: YObject) {
      var target = e.get('target');
      // щелчок по метке проекта (не кластеру) — у неё своя карточка
      if (!target || typeof target.getGeoObjects !== 'function') return;
      var objs: YObject[] = target.getGeoObjects();
      var lat = objs.map(function (o: YObject) { return o.geometry.getCoordinates()[0] as number; });
      var lon = objs.map(function (o: YObject) { return o.geometry.getCoordinates()[1] as number; });
      var box = [[Math.min.apply(null, lat), Math.min.apply(null, lon)], [Math.max.apply(null, lat), Math.max.apply(null, lon)]];
      if (box[1][0] - box[0][0] > SAME_PLACE || box[1][1] - box[0][1] > SAME_PLACE) {
        // разные места — приблизить к ним: кластер распадётся на города
        closeSpider();
        map.setBounds(box, { checkZoomRange: true, zoomMargin: 60, duration: 300 });
        return;
      }
      // одна точка — «паутина»; повторный щелчок по центру — свернуть
      if (spiderHub === target) closeSpider();
      else openSpider(target, objs);
    });
    map.geoObjects.add(spider);
    map.geoObjects.add(cluster);
    map.events.add('click', function () {
      hideCard();
      closeSpider();
    });
    // «паутина» разложена в пикселях своего масштаба — при смене масштаба сворачивается
    map.events.add('boundschange', function (e: YObject) {
      if (e.get('newZoom') !== e.get('oldZoom')) closeSpider();
    });

    // — Кнопки стран: у страны без проектов кнопки нет —
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-geo-country]')) as HTMLElement[];
    buttons.forEach(function (b) {
      var country = b.getAttribute('data-geo-country') || '';
      // кнопка видна, только если у страны есть проекты (в разметке новая страна может стоять скрытой)
      b.hidden = Boolean(country) && !all.some(function (x) { return x.country === country; });
      b.addEventListener('click', function () {
        buttons.forEach(function (x) {
          x.classList.toggle('is-active', x === b);
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        show(country);
      });
    });

    // — Масштаб и «Все проекты» —
    Array.prototype.slice.call(root.querySelectorAll('[data-geo-zoom]')).forEach(function (b: HTMLElement) {
      b.addEventListener('click', function () {
        var z = b.getAttribute('data-geo-zoom');
        if (z === 'all') fit();
        else map.setZoom(map.getZoom() + (z === 'in' ? 1 : -1), { duration: 200, checkZoomRange: true });
      });
    });

    show('');
  }

  function init() {
    if (typeof ymaps === 'undefined') return;
    ymaps.ready(build);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

import type { Project } from './globals';
