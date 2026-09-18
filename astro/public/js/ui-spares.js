/**
 * Запчасти индукционного оборудования: поиск и фильтры каталога.
 *
 * Основано на скрипте пакета V10 (01_ДЛЯ_CMS/ui-spares.js). Из него убрана
 * корзина «В заявку»: она складывала позиции в localStorage и в итоге
 * открывала письмо в почтовой программе посетителя — заявка до нас
 * не доходила. Вместо неё в разделе работает форма запроса цены, та же,
 * что у запчастей дробемётов: её открывает /js/zapchasti-catalog.js
 * по кнопкам [data-request], а отправляет send.php.
 *
 * Осталась только выборка: поиск по названию и маркировке, фильтр
 * по группе, переключатель новых позиций и раскрытие позиции по якорю.
 */
(() => {
  'use strict';
  const data = document.getElementById('catalog-data');
  if (!data) return;
  const items = JSON.parse(data.textContent);
  const templates = JSON.parse(document.getElementById('catalog-templates').textContent);

  const q = document.getElementById('parts-search');
  const g = document.getElementById('parts-group');
  const toggle = document.getElementById('new-only');

  // На странице всей номенклатуры список показан сразу, без запроса.
  const full = /\/nomenklatura(?:\.html|\/)?$/.test(location.pathname);
  const norm = v => String(v).toLowerCase().replace(/ё/g, 'е')
    .replace(/мпу/g, 'mpu').replace(/(?<=\d),(?=\d)/g, '.')
    .replace(/\s+/g, ' ').trim();

  if (q) {
    let onlyNew = false;
    const filter = () => {
      const words = norm(q.value).split(' ').filter(Boolean);
      const active = words.length || g.value || onlyNew;
      const filtered = items.filter(r =>
        (!onlyNew || r.new) && (!g.value || r.group === g.value) &&
        words.every(w => norm([r.id, r.name, r.params, r.purpose].join(' ')).includes(w)));
      const show = active || full;
      document.getElementById('search-results').hidden = !show;
      const groups = document.getElementById('catalog-groups');
      if (groups) groups.hidden = !!active;
      if (show) {
        document.getElementById('results-list').innerHTML =
          filtered.map(r => templates[r.id]).join('');
      }
      document.getElementById('no-results').hidden = filtered.length > 0;
      document.getElementById('parts-status').textContent = active
        ? `Найдено: ${filtered.length} из ${items.length}`
        : `${items.length} позиций и исполнений`;
    };

    q.addEventListener('input', filter);
    g.addEventListener('change', filter);
    toggle.addEventListener('click', () => {
      onlyNew = !onlyNew;
      toggle.setAttribute('aria-pressed', String(onlyNew));
      filter();
    });
    document.getElementById('clear-search').addEventListener('click', () => {
      q.value = ''; g.value = ''; onlyNew = false;
      toggle.setAttribute('aria-pressed', 'false');
      filter(); q.focus();
    });
    q.addEventListener('keydown', ev => { if (ev.key === 'Escape') { q.value = ''; filter(); } });
  }

  // Ссылка вида …/#item-TH-01 должна раскрывать саму позицию, а не просто
  // прокручивать к свёрнутому блоку.
  const revealHash = () => {
    try {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target && target.matches('details')) {
        target.open = true;
        target.scrollIntoView({ block: 'start' });
      }
    } catch {}
  };
  window.addEventListener('hashchange', revealHash);
  revealHash();
})();
