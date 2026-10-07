/* «Запросить цену» — накопление позиций в форме заявки (ТЗ-2 п.3).
 *
 * Клик по кнопке .js-quote-btn (в карточке категории .pcard или в phero
 * страницы товара):
 *   1) определяет название позиции (.pcard__title рядом с кнопкой,
 *      иначе .phero__title страницы);
 *   2) дозаписывает строку «Интересует <название>» в textarea[name="task"]
 *      формы заявки — НЕ перезатирая ручной текст пользователя;
 *   3) защита от дубля: одна и та же позиция не добавляется дважды;
 *   4) копит позиции в sessionStorage, чтобы они переносились между
 *      страницами товаров;
 *   5) плавно скроллит к форме.
 *
 * При загрузке страницы восстанавливает накопленные позиции в textarea.
 * После успешной отправки (forms.js вызывает form.reset()) — очищает список.
 */
(function () {
  'use strict';

  var SS_KEY = 'ui_quote_items';
  var PREFIX = 'Интересует ';

  function getItems() {
    try {
      var raw = sessionStorage.getItem(SS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function setItems(items: string[]) {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(items));
    } catch (e) { /* приватный режим / переполнение — молча игнорируем */ }
  }

  function clearItems() {
    try { sessionStorage.removeItem(SS_KEY); } catch (e) {}
  }

  // Название позиции для конкретной кнопки.
  function nameForButton(btn: Element): string {
    var el: Element | null = null;
    var card = btn.closest ? btn.closest('.pcard') : null;
    if (card) el = card.querySelector('.pcard__title');
    if (!el) el = document.querySelector('.phero__title');
    if (!el) return '';
    return el.textContent!.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Все textarea задачи на странице (форма Leadgen).
  function taskFields() {
    return document.querySelectorAll<HTMLTextAreaElement>('form.js-lead-form textarea[name="task"]');
  }

  // Перерисовать поля задачи: управляемый блок «Интересует …» сверху,
  // ручной текст пользователя — ниже (сохраняется).
  function renderTaskFields() {
    var items = getItems();
    var managed = items.map(function (n) { return PREFIX + n; });
    taskFields().forEach(function (ta) {
      var userLines = ta.value.split('\n').filter(function (ln) {
        return ln.lastIndexOf(PREFIX, 0) !== 0; // отбрасываем прежние «Интересует …»
      });
      var userText = userLines.join('\n').replace(/^\s+|\s+$/g, '');
      var parts = [];
      if (managed.length) parts.push(managed.join('\n'));
      if (userText) parts.push(userText);
      ta.value = parts.join('\n\n');
    });
  }

  // Плавный скролл к форме заявки.
  function scrollToForm() {
    var ta = document.querySelector('form.js-lead-form textarea[name="task"]');
    var section = null;
    if (ta && ta.closest) section = ta.closest('.leadgen') || ta.closest('section');
    if (!section) section = document.getElementById('leadgen');
    // Единое правило: скроллим к самой форме (см. scroll-to-form.js).
    if (window.uiScrollToForm && window.uiScrollToForm(section)) return;
    if (section) { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    location.hash = 'leadgen';
  }

  // Клик по кнопке «Запросить цену» (делегирование — ловит и динамику).
  document.addEventListener('click', function (e) {
    var btn = (e.target as Element).closest ? (e.target as Element).closest('.js-quote-btn') : null;
    if (!btn) return;
    e.preventDefault();

    var name = nameForButton(btn);
    if (name) {
      var items = getItems();
      if (items.indexOf(name) === -1) {   // дедуп
        items.push(name);
        setItems(items);
      }
      renderTaskFields();
    }
    scrollToForm();
  });

  // Успешная отправка → forms.js делает form.reset() → событие reset всплывает.
  document.addEventListener('reset', function (e) {
    var f = e.target as Element | null;
    if (f && f.classList && f.classList.contains('js-lead-form')) {
      clearItems();
    }
  });

  // Восстановление накопленного при загрузке.
  if (document.readyState !== 'loading') {
    renderTaskFields();
  } else {
    document.addEventListener('DOMContentLoaded', renderTaskFields);
  }
})();

export {};
