/* ============================================================
   Мобильное меню — выдвижной drawer для устройств ≤1024px.
   Триггер: [data-nav-toggle], контейнер: [data-nav-drawer].
   Закрытие: [data-nav-close], клик по ссылке внутри, Esc.
   ============================================================ */
(function () {
  'use strict';

  var btn = document.querySelector<HTMLElement>('[data-nav-toggle]');
  var drawer = document.querySelector<HTMLElement>('[data-nav-drawer]');
  var closeBtn = document.querySelector<HTMLElement>('[data-nav-close]');
  if (!btn || !drawer) return;
  var opened = false;
  var background: { element: HTMLElement; inert: boolean }[] = [];
  drawer.inert = true;
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Мобильное меню');
  drawer.setAttribute('aria-modal', 'true');

  function focusable() {
    return Array.prototype.filter.call(drawer!.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'
    ), function (el) {
      return el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    });
  }

  function open() {
    if (opened) return;
    opened = true;
    document.body.classList.add('nav-open');
    drawer!.inert = false;
    drawer!.setAttribute('aria-hidden', 'false');
    btn!.setAttribute('aria-expanded', 'true');
    background = Array.prototype.filter.call(document.body.children, function (el) {
      return !el.contains(drawer) && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName);
    }).map(function (el) {
      var state = { element: el, inert: el.inert };
      el.inert = true;
      return state;
    });
    var first = closeBtn || focusable()[0];
    if (first) first.focus();
  }
  function close() {
    if (!opened) return;
    opened = false;
    document.body.classList.remove('nav-open');
    drawer!.setAttribute('aria-hidden', 'true');
    drawer!.inert = true;
    btn!.setAttribute('aria-expanded', 'false');
    background.forEach(function (state) { state.element.inert = state.inert; });
    background = [];
    var returnTarget = btn!.getClientRects().length ? btn : document.querySelector<HTMLElement>('.header__brand');
    if (returnTarget) returnTarget.focus();
  }

  btn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  drawer.addEventListener('click', function (e) {
    // Раскрытие/сворачивание группы (Каталог / Услуги)
    var acc = (e.target as Element).closest('[data-drawer-acc]');
    if (acc) {
      var item = acc.closest('.nav-drawer__item')!;
      var isOpen = item.classList.toggle('is-open');
      acc.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      return;
    }
    // Клик по реальной ссылке (верхний уровень или подпункт) — закрываем меню
    if ((e.target as Element).closest('.nav-drawer__link, .nav-drawer__sublink')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (!opened) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var items = focusable();
    if (!items.length) { e.preventDefault(); return; }
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !drawer!.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !drawer!.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1024) close(); });
})();

export {};
