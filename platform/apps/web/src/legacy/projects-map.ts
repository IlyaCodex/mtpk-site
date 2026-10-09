/* ============================================================
   Карта реализованных проектов — УралИндуктор (главная, «География»).
   Yandex Maps JS API 2.1: кластеры с числом проектов (щелчок — приблизить,
   а где проекты в одной точке — список), метка проекта — по щелчку
   карточка под картой ([data-geo-card]): фото, город, название, ссылка.
   Кнопки секции: страны ([data-geo-country], видна, если у страны есть
   проекты), масштаб и «Все проекты» ([data-geo-zoom="in|out|all"]).
   Данные: window.projects (js/projects-data.js); страна — поле country,
   иначе по городу (не из списка — Россия).
   ============================================================ */
type GeoObject = { properties: { get(key: 'projectData'): Project | undefined } };
type ClusterObject = { properties: { get(key: 'geoObjects'): GeoObject[] | undefined; set(key: 'balloonContent', value: string): void } };

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

  // — Содержимое balloon для кластера (проекты в одной точке) — собираем сами из geoObjects —
  function buildClusterPopup(geoObjects: GeoObject[]): string {
    var items = geoObjects.map(function (go) {
      var p: Partial<Project> = go.properties.get('projectData') || {};
      var img = p.image ? '<img class="pm-cluster-item__img" src="' + esc(p.image) + '" alt="" loading="lazy">'
                        : '<div class="pm-cluster-item__noimg" aria-hidden="true"></div>';
      var meta = [];
      if (p.city) meta.push(esc(p.city));
      if (p.date) meta.push(esc(p.date));
      var metaStr = meta.length ? '<div class="pm-cluster-item__meta">' + meta.join(' &middot; ') + '</div>' : '';
      var href = esc(p.link || '#');
      return '<a class="pm-cluster-item" href="' + href + '">' + img +
        '<div class="pm-cluster-item__body">' +
        '<div class="pm-cluster-item__title">' + esc(p.name) + '</div>' +
        metaStr +
        '</div></a>';
    }).join('');
    var n = geoObjects.length;
    var word = (n % 10 === 1 && n % 100 !== 11) ? 'объект'
             : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'объекта' : 'объектов';
    return '<div class="pm-cluster-pop">' +
      '<div class="pm-cluster-pop__head">' + n + ' ' + word + ' в&nbsp;этой точке</div>' +
      '<div class="pm-cluster-pop__list">' + items + '</div>' +
    '</div>';
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

    // Балун кластера — готовый HTML из свойств кластера (innerHTML напрямую:
    // фильтр |raw на некоторых сборках Yandex Maps 2.1 не разворачивается).
    var ClusterBalloonContentLayout = ymaps.templateLayoutFactory.createClass(
      '<div class="pm-cluster-pop-mount"></div>',
      {
        build: function () {
          ClusterBalloonContentLayout.superclass.build.call(this);
          var mount = this.getParentElement() && this.getParentElement().querySelector('.pm-cluster-pop-mount');
          if (mount) mount.innerHTML = this.getData().properties.get('balloonContent') || '';
        }
      }
    );

    var cluster = new ymaps.Clusterer({
      preset: 'islands#greenClusterIcons',
      groupByCoordinates: false,
      clusterDisableClickZoom: false,           // щелчок — приблизить; не приближается — список
      clusterOpenBalloonOnClick: true,
      gridSize: 80,
      clusterBalloonContentLayout: ClusterBalloonContentLayout,
      clusterBalloonPanelMaxMapArea: 0,
      clusterBalloonContentLayoutWidth: 320,
      clusterBalloonContentLayoutHeight: 360,
      clusterBalloonPagerVisible: false,
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
      cluster.removeAll();
      shown = all.filter(function (x) { return !country || x.country === country; });
      cluster.add(shown.map(function (x) { return x.pm; }));
      hideCard();
      fit();
    }

    // — Когда кластер формируется, подкладываем готовый HTML в его properties.balloonContent —
    function patchClusterHTML(clusterObj: ClusterObject) {
      clusterObj.properties.set('balloonContent', buildClusterPopup(clusterObj.properties.get('geoObjects') || []));
    }
    cluster.events.add(['add', 'objectsupdated'], function () {
      cluster.getClusters().forEach(patchClusterHTML);
    });
    map.geoObjects.add(cluster);
    map.events.add('click', hideCard);

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
