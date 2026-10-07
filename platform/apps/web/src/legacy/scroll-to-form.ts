/* Скролл к форме заявки — единое правило для всего сайта.
 *
 * Кнопки «Запросить КП», «Обсудить проект», «Перезвоните мне» и т.п. ведут на
 * якоря секций (#leadgen, #contacts). Первый ребёнок такой секции — длинный
 * intro с заголовком блока, поэтому нативный переход по якорю «роняет» экран на
 * заголовок-простыню: на мобиле форма уезжает за нижний край, и пользователь не
 * понимает, что делать. Плюс sticky-шапка (.header-shell) перекрывает верх.
 *
 * Здесь — единое правило: клик по любому якорю, чья секция содержит форму
 * заявки (form.js-lead-form), скроллит не к началу секции, а к САМОЙ ФОРМЕ,
 * с поправкой на высоту шапки. Так заголовок формы и первое поле сразу видны.
 *
 * Делегирование на document — ловит и статические, и динамические ссылки.
 * window.uiScrollToForm(section) переиспользует quote-form.js (кнопка «Запросить цену»).
 */
(function () {
  'use strict';

  function formIn(section: Element | null): Element | null {
    return section ? (section.matches('form.js-lead-form') ? section : section.querySelector('form.js-lead-form')) : null;
  }

  // Высота sticky-шапки + небольшой зазор, чтобы карточка формы не липла к шапке.
  function headerOffset() {
    var h = document.querySelector<HTMLElement>('.header-shell');
    return (h ? h.offsetHeight : 0) + 16;
  }

  // Плавный скролл к форме внутри секции. true — если форма найдена.
  function scrollToForm(section: Element | null): boolean {
    var form = formIn(section);
    if (!form) return false;
    var y = form.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: reducedMotion ? 'instant' : 'smooth' });
    var firstField = form.querySelector<HTMLElement>('input:not([type="hidden"]):not([aria-hidden="true"]),textarea,select,button');
    if (firstField) firstField.focus({ preventScroll: true });
    return true;
  }
  window.uiScrollToForm = scrollToForm;

  document.addEventListener('click', function (e) {
    var a = (e.target as Element).closest ? (e.target as Element).closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '#' || href.length < 2) return;

    var section = document.getElementById(href.slice(1));
    if (!section || !formIn(section)) return; // якорь не на секцию с формой — не трогаем

    if (scrollToForm(section)) {
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, '', href);
    }
  });
})();

export {};
