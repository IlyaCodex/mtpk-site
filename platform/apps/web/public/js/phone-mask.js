/* ============================================================
   Телефонная маска — УралИндуктор
   По умолчанию: +7 (___) ___-__-__ (РФ и Казахстан).
   Если введён код другой страны (+998, +375, +1 …) —
   жёсткая маска снимается, номер не блокируется.
   Чистый JS, без зависимостей.
   ============================================================ */
(function () {
  'use strict';

  // Форматирование российского/казахстанского номера.
  // d — строка из цифр абонентского номера (без кода 7), максимум 10.
  // Разделители-«хвосты» не добавляются — иначе номер нельзя стереть.
  function formatRu(d) {
    d = d.slice(0, 10);
    var out = '+7';
    if (d.length === 0) return out;
    out += ' (' + d.slice(0, 3);
    if (d.length > 3) out += ') ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }

  function onInput(e) {
    var el = e.target;
    var v = el.value;

    // Иностранный код: начинается с «+» и следующая цифра не 7 → свободный ввод.
    if (/^\s*\+\s*(?!7)\d/.test(v)) {
      var cleaned = v.replace(/[^\d+()\-\s]/g, '');
      if (cleaned !== v) el.value = cleaned;
      return;
    }

    // Пустое поле или одиночный «+» — оставляем как есть (виден placeholder).
    var t = v.trim();
    if (t === '' || t === '+') return;

    // РФ / Казахстан.
    var digits = v.replace(/\D/g, '');
    if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    if (digits.charAt(0) === '7') digits = digits.slice(1);

    el.value = formatRu(digits);

    // Каретка в конец (корректно для обычного ввода слева направо).
    var end = el.value.length;
    try { el.setSelectionRange(end, end); } catch (err) {}
  }

  function init() {
    var fields = document.querySelectorAll('input[type="tel"]');
    for (var i = 0; i < fields.length; i++) {
      fields[i].addEventListener('input', onInput);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
