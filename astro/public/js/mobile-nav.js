/* ============================================================
   Мобильное меню — выдвижной drawer для устройств ≤1024px.
   Триггер: [data-nav-toggle], контейнер: [data-nav-drawer].
   Закрытие: [data-nav-close], клик по ссылке внутри, Esc.
   ============================================================ */
(function () {
  'use strict';

  var btn = document.querySelector('[data-nav-toggle]');
  var drawer = document.querySelector('[data-nav-drawer]');
  var closeBtn = document.querySelector('[data-nav-close]');
  if (!btn || !drawer) return;

  function open() {
    document.body.classList.add('nav-open');
    drawer.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
  }
  function close() {
    document.body.classList.remove('nav-open');
    drawer.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  drawer.addEventListener('click', function (e) {
    // Раскрытие/сворачивание группы (Каталог / Услуги)
    var acc = e.target.closest('[data-drawer-acc]');
    if (acc) {
      var item = acc.closest('.nav-drawer__item');
      var isOpen = item.classList.toggle('is-open');
      acc.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      return;
    }
    // Клик по реальной ссылке (верхний уровень или подпункт) — закрываем меню
    if (e.target.closest('.nav-drawer__link, .nav-drawer__sublink')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
