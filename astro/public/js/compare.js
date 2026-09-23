/* compare.js — «Добавить к сравнению»: кнопки, панель, счётчик.
 *
 * Работает на всех страницах каталога. Ставит кнопку в карточки листинга
 * (.pcard__actions) и на странице товара (.phero__actions), хранит выбор
 * в localStorage и показывает нижнюю панель со ссылкой на /sravnenie/.
 *
 * Разметку карточек не правим: их 233 штуки и все одинаковые — кнопку
 * дорисовывает этот скрипт.
 *
 * Сравнивать можно только внутри одного раздела: у печей и чиллеров разные
 * строки характеристик, общая таблица была бы пустой сеткой. Список
 * разделов, где сравнение включено, приходит из /data/compare-sections.json
 * (1,5 КБ) — его собирает scripts/build-compare-index.mjs по тем же данным,
 * что и саму таблицу сравнения.
 */
(function () {
  'use strict';

  var KEY = 'ui_compare';
  var LIMIT = 4;                       // больше не помещается в таблицу
  var TTL = 30 * 24 * 60 * 60 * 1000;  // выбор живёт месяц
  var PAGE = '/sravnenie/';

  /* ── хранилище ───────────────────────────────────────────────────── */
  // localStorage может быть недоступен (приватный режим, запрет куки) —
  // тогда работаем «вхолостую»: кнопка не запоминает выбор, но ничего
  // не ломает.
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items) || !data.section) return null;
      if (data.ts && Date.now() - data.ts > TTL) { clear(); return null; }
      return data;
    } catch (e) { return null; }
  }

  function write(data) {
    try {
      data.ts = Date.now();
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* приватный режим — молчим */ }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function items() { var d = read(); return d ? d.items : []; }
  function has(url) { return items().indexOf(url) !== -1; }

  /* ── разделы со сравнением ───────────────────────────────────────── */
  var sectionsPromise = null;
  function sections() {
    if (!sectionsPromise) {
      sectionsPromise = fetch('/data/compare-sections.json')
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    }
    return sectionsPromise;
  }

  // Раздел страницы: для листинга — она сама, для товара — родительский путь.
  function pageSections(path) {
    var self = path.replace(/[^/]+$/, '').replace(/\/?$/, '/');
    var parent = self.replace(/[^/]+\/$/, '');
    return [path.replace(/\/?$/, '/'), parent];
  }

  /* ── кнопка ──────────────────────────────────────────────────────── */
  var ICON = '<svg class="cmp-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M12 4v16M4 8h16M7 8l-3 6h6zM17 8l-3 6h6z"/></svg>';

  function makeButton(url) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cmp-btn';
    b.setAttribute('data-compare', url);
    paint(b, has(url));
    return b;
  }

  function paint(btn, active) {
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.innerHTML = ICON + '<span>' + (active ? 'В сравнении' : 'К сравнению') + '</span>';
  }

  function repaintAll() {
    var list = items();
    [].forEach.call(document.querySelectorAll('[data-compare]'), function (b) {
      paint(b, list.indexOf(b.getAttribute('data-compare')) !== -1);
    });
  }

  /* ── расстановка кнопок ──────────────────────────────────────────── */
  function cardUrl(card) {
    var a = card.querySelector('.pcard__title a, a.pcard__cover, a[href^="/products/"]');
    if (!a) return '';
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '/') {                 // относительная ссылка в листинге
      href = location.pathname.replace(/[^/]*$/, '') + href;
    }
    return href.replace(/\/?$/, '/');
  }

  function mount(list) {
    var path = location.pathname.replace(/\/?$/, '/');
    var isSection = list.indexOf(path) !== -1;
    var isProduct = list.indexOf(path.replace(/[^/]+\/$/, '')) !== -1;

    if (isSection) {
      [].forEach.call(document.querySelectorAll('.pcard'), function (card) {
        if (card.querySelector('[data-compare]')) return;
        var url = cardUrl(card);
        if (!url) return;
        var box = card.querySelector('.pcard__actions') || card.querySelector('.pcard__body');
        if (box) box.appendChild(makeButton(url));
      });
    }
    if (isProduct) {
      var actions = document.querySelector('.phero__actions');
      if (actions && !actions.querySelector('[data-compare]')) {
        actions.appendChild(makeButton(path));
      }
    }
    return isSection || isProduct;
  }

  /* ── панель снизу ────────────────────────────────────────────────── */
  function renderPanel() {
    var data = read();
    var bar = document.getElementById('cmp-bar');
    // На самой странице сравнения панель не нужна: она только перекрывает
    // таблицу, а всё то же самое есть в её заголовке.
    var onComparePage = location.pathname.replace(/\/?$/, '/') === PAGE;
    if (onComparePage || !data || !data.items.length) { if (bar) bar.remove(); return; }

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'cmp-bar';
      bar.className = 'cmp-bar';
      document.body.appendChild(bar);
    }
    bar.innerHTML =
      '<div class="cmp-bar__inner">'
      + '<span class="cmp-bar__count">К сравнению: <b>' + data.items.length + '</b> из ' + LIMIT + '</span>'
      + '<a class="btn btn--primary cmp-bar__go" href="' + PAGE + '">Сравнить <span class="btn__arrow">→</span></a>'
      + '<button type="button" class="cmp-bar__clear">Очистить</button>'
      + '</div>';
    bar.querySelector('.cmp-bar__clear').addEventListener('click', function () {
      clear();
      repaintAll();
      renderPanel();
    });
  }

  /* ── переключение позиции ────────────────────────────────────────── */
  function toggle(url, btn) {
    var section = url.replace(/[^/]+\/$/, '');
    var data = read() || { section: section, items: [] };

    if (data.section !== section) {
      var ok = confirm('В сравнении уже есть товары из другого раздела.\n'
                     + 'Начать новое сравнение?');
      if (!ok) return;
      data = { section: section, items: [] };
    }

    var i = data.items.indexOf(url);
    if (i === -1) {
      if (data.items.length >= LIMIT) {
        alert('К сравнению можно добавить не больше ' + LIMIT + ' позиций.\n'
            + 'Уберите одну на странице сравнения.');
        return;
      }
      data.items.push(url);
    } else {
      data.items.splice(i, 1);
    }

    if (data.items.length) write(data); else clear();
    if (btn) paint(btn, data.items.indexOf(url) !== -1);
    repaintAll();
    renderPanel();
    if (window.ym && typeof window.ym === 'function' && i === -1) {
      try { window.ym(window.uiYmId || 0, 'reachGoal', 'compare_add'); } catch (e) {}
    }
  }

  /* ── старт ───────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-compare]') : null;
    if (!btn) return;
    e.preventDefault();
    toggle(btn.getAttribute('data-compare'), btn);
  });

  function init() {
    renderPanel();                       // панель нужна на любой странице
    if (!document.querySelector('.pcard, .phero__actions')) return;
    sections().then(function (list) {
      if (!list.length) return;
      mount(list);
      repaintAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // страница сравнения работает с тем же хранилищем
  window.uiCompare = { read: read, write: write, clear: clear, LIMIT: LIMIT };
})();
