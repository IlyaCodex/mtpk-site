/* ============================================================
   Карта реализованных проектов — УралИндуктор
   Yandex Maps JS API 2.1, кластеризация, hover-балун.
   Данные: window.projects (js/projects-data.js).
   ============================================================ */
(function () {
  'use strict';

  var MAP_ID = 'projects-map';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // — Balloon для одиночной метки —
  function buildSinglePopup(p) {
    var img = p.image ? '<img class="pm-pop__img" src="' + esc(p.image) + '" alt="" loading="lazy">' : '';
    var meta = [];
    if (p.city) meta.push(esc(p.city));
    if (p.date) meta.push(esc(p.date));
    var metaStr = meta.length ? '<div class="pm-pop__meta">' + meta.join(' &middot; ') + '</div>' : '';
    var link = p.link ? '<a class="pm-pop__link" href="' + esc(p.link) + '">Открыть страницу проекта &rarr;</a>' : '';
    return '<div class="pm-pop">' + img +
      '<div class="pm-pop__body">' +
      '<div class="pm-pop__title">' + esc(p.name) + '</div>' +
      metaStr + link +
      '</div></div>';
  }

  // — Содержимое balloon для кластера (2+ проектов) — собираем сами из geoObjects —
  function buildClusterPopup(geoObjects) {
    var items = geoObjects.map(function (go) {
      var p = go.properties.get('projectData') || {};
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
    if (!el || !window.projects) return;

    var map = new ymaps.Map(el, {
      center: [56, 61], zoom: 5, controls: ['zoomControl']
    }, {
      suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true
    });
    map.behaviors.disable('scrollZoom');

    // Кастомный layout для balloon кластера — берёт готовый HTML из свойств кластера.
    // Используем build-override вместо `$[…|raw]` (фильтр |raw на некоторых
    // сборках Yandex Maps 2.1 не разворачивается и в попап попадает буквально
    // текст). innerHTML напрямую — детерминированно и быстро.
    var ClusterBalloonContentLayout = ymaps.templateLayoutFactory.createClass(
      '<div class="pm-cluster-pop-mount"></div>',
      {
        build: function () {
          ClusterBalloonContentLayout.superclass.build.call(this);
          var root = this.getParentElement();
          if (!root) return;
          var mount = root.querySelector('.pm-cluster-pop-mount');
          if (!mount) return;
          var html = this.getData().properties.get('balloonContent');
          mount.innerHTML = html || '';
        }
      }
    );

    var cluster = new ymaps.Clusterer({
      preset: 'islands#greenClusterIcons',
      groupByCoordinates: false,
      clusterDisableClickZoom: true,            // НЕ зумим — открываем balloon
      clusterOpenBalloonOnClick: true,
      gridSize: 80,
      // balloon
      clusterBalloonContentLayout: ClusterBalloonContentLayout,
      clusterBalloonPanelMaxMapArea: 0,
      clusterBalloonCloseButton: false,
      clusterBalloonContentLayoutWidth: 320,
      clusterBalloonContentLayoutHeight: 360,
      // hide pager — мы свой layout даём
      clusterBalloonPagerVisible: false,
      hasHint: true
    });

    // — Hover-логика (общая для placemark и cluster) —
    var closeTimer = null;
    function cancelClose() { clearTimeout(closeTimer); closeTimer = null; }
    function scheduleClose(obj) {
      cancelClose();
      closeTimer = setTimeout(function () {
        if (obj && obj.balloon) obj.balloon.close();
      }, 400);
    }

    var placemarks = [];
    window.projects.forEach(function (p) {
      if (!p.ll) return;
      var pm = new ymaps.Placemark(p.ll, {
        hintContent: p.name,
        balloonContentBody: buildSinglePopup(p),
        projectData: p  // важно: пробрасываем в кластер для buildClusterPopup
      }, {
        preset: 'islands#greenIcon',
        balloonMaxWidth: 320,
        balloonCloseButton: false,
        balloonPanelMaxMapArea: 0,
        hideIconOnBalloonOpen: false
      });
      // hover — одиночная метка
      pm.events.add('mouseenter', function () { cancelClose(); pm.balloon.open(); });
      pm.events.add('mouseleave', function () { scheduleClose(pm); });
      // клик — direct переход
      pm.events.add('click', function () {
        if (p.link) window.location.href = p.link;
      });
      placemarks.push(pm);
    });

    cluster.add(placemarks);
    map.geoObjects.add(cluster);

    // — Когда кластер формируется, подкладываем готовый HTML в его properties.balloonContent —
    function patchClusterHTML(clusterObj) {
      var gobjs = clusterObj.properties.get('geoObjects') || [];
      clusterObj.properties.set('balloonContent', buildClusterPopup(gobjs));
    }
    // делаем для всех текущих кластеров
    cluster.getClusters().forEach(patchClusterHTML);
    // и для будущих (при zoom in/out)
    cluster.events.add(['add', 'objectsupdated'], function () {
      cluster.getClusters().forEach(patchClusterHTML);
    });

    // — Hover на кластерах —
    // events на ClustererInstance с фильтром по типу target
    cluster.events.add('mouseenter', function (e) {
      var target = e.get('target');
      // target может быть Placemark (внутри кластера до раскрытия — это сам Cluster)
      // если есть метод .balloon — открываем
      if (target && target.balloon && typeof target.balloon.open === 'function') {
        cancelClose();
        target.balloon.open();
      }
    });
    cluster.events.add('mouseleave', function (e) {
      var target = e.get('target');
      if (target && target.balloon) scheduleClose(target);
    });

    // — Если курсор зашёл в открытый balloon — не закрываем; покинул — закрываем —
    map.events.add('balloonopen', function (e) {
      setTimeout(function () {
        var balloonEl = document.querySelector('#' + MAP_ID + ' [class*="balloon__layout"]');
        if (!balloonEl) return;
        balloonEl.addEventListener('mouseenter', cancelClose);
        balloonEl.addEventListener('mouseleave', function () {
          var target = e.get('target');
          if (target && target.balloon) scheduleClose(target);
        });
      }, 50);
    });
  }

  function init() {
    if (typeof ymaps === 'undefined') return;
    ymaps.ready(build);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
