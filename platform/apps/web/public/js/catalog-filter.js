/*
 * catalog-filter.js — фильтр по характеристикам товаров на страницах подкатегорий.
 *
 * 2 режима работы:
 *
 * 1. ГОТОВАЯ РАЗМЕТКА: если на странице есть <form data-filter-form> с
 *    dropdown'ами [data-cf-dropdown data-cf-key="<attr>"] — скрипт привязывает
 *    обработчики к существующим UI-элементам и активирует фильтрацию.
 *
 * 2. АВТО-ГЕНЕРАЦИЯ: если разметки фильтра нет, но есть карточки .pcard с
 *    data-атрибутами (data-power, data-perf, data-mass и т.п.) — скрипт сам
 *    строит HTML-фильтра по конфигу FILTER_DEFS и вставляет его перед
 *    контейнером карточек (.pcard-grid / .catalog__grid / общий родитель).
 *
 * Формат data-value опции:
 *   ""        → любая (фильтр снят для этого ключа)
 *   "up-N"    → значение ≤ N
 *   "N-M"     → N ≤ значение ≤ M
 *   "M+"      → значение ≥ M
 */
(function () {
  'use strict';

  /* Конфигурация известных атрибутов: лейбл, единица, варианты диапазонов. */
  var FILTER_DEFS = {
    mass: {
      label: 'Масса',
      anyLabel: 'любая',
      ranges: [
        { v: 'up-250',     l: 'до 250 кг',    short: '≤ 250' },
        { v: '250-1000',   l: '250 кг — 1 т', short: '250 – 1000' },
        { v: '1000-3000',  l: '1 — 3 т',      short: '1000 – 3000' },
        { v: '3000-8000',  l: '3 — 8 т',      short: '3000 – 8000' },
        { v: '8000-15000', l: '8 — 15 т',     short: '8000 – 15000' },
      ],
    },
    power: {
      label: 'Мощность',
      anyLabel: 'любая',
      ranges: [
        { v: 'up-25',    l: 'до 25 кВт',    short: '≤ 25' },
        { v: '25-100',   l: '25 — 100 кВт', short: '25 – 100' },
        { v: '100-500',  l: '100 — 500 кВт',short: '100 – 500' },
        { v: '500-1500', l: '500 — 1500 кВт', short: '500 – 1500' },
        { v: '1500+',    l: 'более 1500 кВт', short: '≥ 1500' },
      ],
    },
    perf: {
      label: 'Производительность',
      anyLabel: 'любая',
      ranges: [
        { v: 'up-1',   l: 'до 1 т/час',    short: '≤ 1' },
        { v: '1-5',    l: '1 — 5 т/час',   short: '1 – 5' },
        { v: '5-50',   l: '5 — 50 т/час',  short: '5 – 50' },
        { v: '50+',    l: 'более 50 т/час',short: '≥ 50' },
      ],
    },
  };

  /* ---------- утилиты ---------- */
  function parseRange(value) {
    if (!value) return null;
    if (value.indexOf('up-') === 0) {
      return { min: 0, max: parseFloat(value.slice(3)) };
    }
    if (value.charAt(value.length - 1) === '+') {
      return { min: parseFloat(value.slice(0, -1)), max: Infinity };
    }
    var parts = value.split('-');
    if (parts.length === 2) {
      return { min: parseFloat(parts[0]), max: parseFloat(parts[1]) };
    }
    return null;
  }
  function pluralizeModels(n) {
    var mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return n + ' модель';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return n + ' модели';
    return n + ' моделей';
  }

  /* ---------- авто-генерация HTML фильтра ---------- */
  function detectKeys(cards) {
    /* Возвращает массив атрибутов, которые встретились хотя бы у половины карточек. */
    var counts = {};
    cards.forEach(function (c) {
      var attrs = c.attributes;
      for (var i = 0; i < attrs.length; i++) {
        var name = attrs[i].name;
        if (name.indexOf('data-') !== 0) continue;
        var key = name.slice(5);
        if (FILTER_DEFS[key]) counts[key] = (counts[key] || 0) + 1;
      }
    });
    var threshold = Math.ceil(cards.length / 2);
    var keys = [];
    for (var k in counts) {
      if (counts[k] >= threshold) keys.push(k);
    }
    /* Порядок: mass → power → perf → ... */
    var order = ['mass', 'power', 'perf'];
    keys.sort(function (a, b) {
      return order.indexOf(a) - order.indexOf(b);
    });
    return keys;
  }

  function buildDropdown(key, def) {
    var dropdown = document.createElement('div');
    dropdown.className = 'cf-dropdown';
    dropdown.setAttribute('data-cf-dropdown', '');
    dropdown.setAttribute('data-cf-key', key);

    var html =
      '<button type="button" class="cf-trigger" aria-haspopup="listbox" aria-expanded="false" data-cf-trigger>' +
      '<span class="cf-trigger__label">' + def.label + ':</span>' +
      '<span class="cf-trigger__value" data-cf-value>' + def.anyLabel + '</span>' +
      '<span class="cf-trigger__chevron" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="cf-panel" role="listbox" aria-label="' + def.label + '">' +
      '<button type="button" class="cf-option" role="option" aria-selected="true" data-cf-option data-value="" data-label="' + def.anyLabel + '">' +
      '<span>' + def.label + ' — любая</span></button>';
    def.ranges.forEach(function (r) {
      html +=
        '<button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="' + r.v + '" data-label="' + r.l + '">' +
        '<span>' + r.l + '</span>' +
        '<span class="cf-option__meta">' + r.short + '</span>' +
        '</button>';
    });
    html += '</div>';
    dropdown.innerHTML = html;
    return dropdown;
  }

  function buildFilterForm(keys) {
    var form = document.createElement('form');
    form.className = 'catalog-filter';
    form.setAttribute('aria-label', 'Фильтр каталога');
    form.setAttribute('data-filter-form', '');
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    keys.forEach(function (key) {
      var def = FILTER_DEFS[key];
      if (!def) return;
      form.appendChild(buildDropdown(key, def));
    });

    var spacer = document.createElement('div');
    spacer.className = 'catalog-filter__spacer';
    form.appendChild(spacer);

    var count = document.createElement('div');
    count.className = 'catalog-filter__count';
    count.setAttribute('data-cf-count', '');
    count.setAttribute('aria-live', 'polite');
    form.appendChild(count);

    var reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'catalog-filter__reset';
    reset.setAttribute('aria-label', 'Сбросить фильтр');
    reset.setAttribute('data-cf-reset', '');
    reset.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Сбросить';
    form.appendChild(reset);

    return form;
  }

  function autoInsertFilter() {
    /* Если форма уже есть в DOM — ничего не делаем. */
    if (document.querySelector('[data-filter-form]')) return null;

    /* Ищем грид карточек или общий родитель .pcard. */
    var cards = document.querySelectorAll('.pcard');
    if (cards.length < 2) return null;

    var grid = document.querySelector('.pcard-grid') || cards[0].parentElement;
    if (!grid) return null;

    /* Определяем какие ключи имеют смысл */
    var keys = detectKeys(Array.prototype.slice.call(cards));
    if (!keys.length) return null;

    var form = buildFilterForm(keys);
    /* Помечаем, что форма создана нами — нужно самим привязать trigger toggle.
       Если форма пришла из HTML страницы (например inline-разметка печей) —
       там уже есть inline-скрипт, который привязал click к trigger; мы не
       должны вешать второй обработчик, иначе toggle отменит сам себя. */
    form.setAttribute('data-cf-self-generated', '');
    grid.parentNode.insertBefore(form, grid);
    return form;
  }

  /* ---------- основной flow ---------- */
  function init() {
    autoInsertFilter();

    var form = document.querySelector('[data-filter-form]');
    if (!form) return;

    /* Само-сгенерированная форма не имеет inline-обработчиков trigger toggle — нужно привязать.
       Готовая форма из HTML (печи) уже имеет inline-скрипт на trigger — не дублируем. */
    var selfGenerated = form.hasAttribute('data-cf-self-generated');
    var dropdowns = form.querySelectorAll('[data-cf-dropdown]');
    var resetBtn = form.querySelector('[data-cf-reset]');
    var countEl = form.querySelector('[data-cf-count]');
    var cards = document.querySelectorAll('.pcard');
    if (!cards.length) return;

    var activeFilters = {};

    function applyFilters() {
      var shown = 0;
      cards.forEach(function (card) {
        var ok = true;
        for (var key in activeFilters) {
          var f = activeFilters[key];
          if (!f) continue;
          var raw = card.getAttribute('data-' + key);
          if (raw === null || raw === '') { ok = false; break; }
          /* Точное совпадение (категориальные значения: low/cap-mid/600/110-130). */
          if (raw === f.value) continue;
          /* Числовой диапазон (up-N / N-M / M+). */
          if (f.range) {
            var val = parseFloat(raw);
            if (!isNaN(val) && val >= f.range.min && val <= f.range.max) continue;
          }
          ok = false; break;
        }
        if (ok) {
          card.removeAttribute('hidden');
          card.style.display = '';
          shown++;
        } else {
          card.setAttribute('hidden', '');
          card.style.display = 'none';
        }
      });
      if (countEl) countEl.textContent = pluralizeModels(shown);
    }

    function closeAll(except) {
      dropdowns.forEach(function (d) {
        if (d === except) return;
        d.classList.remove('is-open');
        var t = d.querySelector('[data-cf-trigger]');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }

    dropdowns.forEach(function (dropdown) {
      var key = dropdown.getAttribute('data-cf-key');
      if (!key) return;
      activeFilters[key] = null;

      var trigger = dropdown.querySelector('[data-cf-trigger]');
      var valueEl = dropdown.querySelector('[data-cf-value]');
      var options = dropdown.querySelectorAll('[data-cf-option]');

      /* Toggle dropdown по клику на trigger — только для само-сгенерированной формы.
         На странице с готовой формой (печи) inline-скрипт уже привязал toggle;
         наш повторный bind приведёт к double-toggle и фильтр не откроется. */
      if (selfGenerated) {
        trigger.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = dropdown.classList.toggle('is-open');
          trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
          if (open) closeAll(dropdown);
        });
      }

      /* Click на опцию: обновляем aria-selected, label, фильтр, закрываем. */
      options.forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          options.forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
          opt.setAttribute('aria-selected', 'true');
          var label = opt.getAttribute('data-label') || '';
          if (valueEl) valueEl.textContent = label;
          var value = opt.getAttribute('data-value') || '';
          trigger.classList.toggle('is-active', !!value);
          activeFilters[key] = value ? { value: value, range: parseRange(value) } : null;
          dropdown.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          applyFilters();
        });
      });
    });

    /* Закрыть по клику вне / Esc */
    document.addEventListener('click', function () { closeAll(null); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });

    /* Reset: сбросить все */
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        dropdowns.forEach(function (d) {
          var key = d.getAttribute('data-cf-key');
          activeFilters[key] = null;
          var t = d.querySelector('[data-cf-trigger]');
          var v = d.querySelector('[data-cf-value]');
          var opts = d.querySelectorAll('[data-cf-option]');
          opts.forEach(function (o, i) {
            o.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
          });
          if (v) v.textContent = (opts[0] && opts[0].getAttribute('data-label')) || 'любая';
          if (t) t.classList.remove('is-active');
        });
        applyFilters();
      });
    }

    applyFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
