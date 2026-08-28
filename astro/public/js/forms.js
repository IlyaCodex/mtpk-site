/* Обработка форм заявок — УралИндуктор
 * Все формы с классом .js-lead-form отправляются на /api/send.php через fetch.
 * Защита: honeypot (.hp-field), form_ts (время загрузки), source (URL).
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/send.php';
  var forms = document.querySelectorAll('form.js-lead-form');
  if (!forms.length) return;

  // ── roistat_visit ───────────────────────────────────────────
  // Кладём значение cookie roistat_visit в скрытые поля .js-roistat.
  // Roistat ставит cookie не мгновенно (≈1–2 с после загрузки),
  // поэтому пробуем в 2 с, и если пусто — ретрай ещё через 1 с.
  // (Бэкенд всё равно отбрасывает заявки быстрее 3 с как ботов,
  //  так что к моменту реальной отправки значение уже проставлено.)
  function getCookie(name) {
    var m = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
    );
    return m ? decodeURIComponent(m[1]) : '';
  }

  // ── UTM / маркетинговые метки ───────────────────────────────
  // Первое касание сохраняем на 30 дней (localStorage + cookie); при отправке
  // формы добавляем в заявку. Ключи: utm_*, yclid, gclid, fbclid + referrer/landing.
  var UTM_KEY = 'ui_marketing_trace';
  function setCookie(name, value, days) {
    var d = new Date(); d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) +
      ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function getMarketing() {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid', 'fbclid'];
    var data = {};
    try {
      var raw = localStorage.getItem(UTM_KEY) || getCookie(UTM_KEY);
      if (raw) data = JSON.parse(raw) || {};
    } catch (e) {}
    var params = null;
    try { params = new URLSearchParams(location.search); } catch (e) {}
    var changed = false;
    if (params) keys.forEach(function (k) {
      var v = params.get(k);
      if (v) { data[k] = v; changed = true; }             // новая метка перезаписывает старую
    });
    if (!data.landing_url) { data.landing_url = location.href.slice(0, 500); changed = true; }
    if (!data.referrer && document.referrer && document.referrer.indexOf(location.host) === -1) {
      data.referrer = document.referrer.slice(0, 500); changed = true;
    }
    if (changed) {
      try {
        var s = JSON.stringify(data);
        localStorage.setItem(UTM_KEY, s);
        setCookie(UTM_KEY, s, 30);
      } catch (e) {}
    }
    return data;
  }
  getMarketing(); // зафиксировать первое касание сразу при загрузке страницы

  function fillRoistat() {
    var v = getCookie('roistat_visit');
    if (!v) return false;
    document.querySelectorAll('input.js-roistat').forEach(function (el) {
      if (!el.value) el.value = v;
    });
    return true;
  }
  setTimeout(function () {
    if (!fillRoistat()) setTimeout(fillRoistat, 1000);
  }, 2000);

  forms.forEach(function (form) {
    // Проставляем timestamp загрузки формы (для time-check на бэке)
    var tsField = form.querySelector('.js-form-ts');
    if (tsField) tsField.value = String(Date.now());

    // Источник заявки — URL + заголовок формы
    var srcField = form.querySelector('.js-form-source');
    if (srcField && !srcField.value) {
      var label = form.getAttribute('data-form') || '';
      srcField.value = (label ? label + ' · ' : '') + location.pathname;
    }

    // «Прикрепить КП»: показываем имя выбранного файла на кнопке + лимит 10 МБ
    var fileInput = form.querySelector('input[type="file"]');
    var fileLabel = fileInput ? fileInput.closest('label') : null;
    var fileTextNode = null;
    var fileDefaultText = '';
    if (fileLabel) {
      for (var fi = 0; fi < fileLabel.childNodes.length; fi++) {
        var fnode = fileLabel.childNodes[fi];
        if (fnode.nodeType === 3 && fnode.textContent.trim()) { fileTextNode = fnode; break; }
      }
    }
    function resetFileBtn() {
      if (!fileTextNode) return;
      fileTextNode.textContent = fileDefaultText;
      if (fileLabel) fileLabel.classList.remove('is-attached');
    }
    if (fileInput && fileTextNode) {
      fileDefaultText = fileTextNode.textContent;
      fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        if (f && f.size > 10 * 1024 * 1024) {
          fileInput.value = '';
          f = null;
          showStatus(form.querySelector('.js-form-status'), 'error',
            'Файл больше 10 МБ — приложите файл поменьше');
        }
        if (f) {
          var nm = f.name;
          if (nm.length > 28) nm = nm.slice(0, 15) + '…' + nm.slice(-9);
          fileTextNode.textContent = ' ' + nm;
          if (fileLabel) fileLabel.classList.add('is-attached');
        } else {
          resetFileBtn();
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector('[type="submit"]');
      var status = form.querySelector('.js-form-status');

      // Нативная HTML5-валидация (required, type=email и т.д.) с подсказками браузера.
      // preventDefault её глушит — поэтому вызываем вручную.
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
        return;
      }

      // phone обязателен — дополнительная проверка (минимум 6 цифр)
      var phone = form.querySelector('[name="phone"]');
      if (phone && phone.value.replace(/\D/g, '').length < 6) {
        showStatus(status, 'error', 'Укажите корректный телефон');
        if (phone.focus) phone.focus();
        return;
      }

      fillRoistat(); // финальная попытка проставить roistat_visit перед отправкой
      var fd = new FormData(form); // файл «Прикрепить КП» уходит вместе с остальными полями
      // маркетинговые метки (utm_*, yclid, gclid, fbclid, referrer, landing_url)
      var mk = getMarketing();
      Object.keys(mk).forEach(function (k) { if (mk[k]) fd.append(k, mk[k]); });
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Отправляем…';
      }
      showStatus(status, 'pending', '');

      fetch(ENDPOINT, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok, message: r.ok ? 'Заявка отправлена' : 'Ошибка отправки' }; }); })
        .then(function (data) {
          if (data.ok) {
            // Успех → уводим на полноценную страницу «Спасибо» (/spasibo/).
            // Телефон передаём в query, чтобы там показать его для проверки
            // и предзаполнить форму, если клиент захочет исправить номер.
            var phoneVal = phone ? phone.value.trim() : '';
            var url = '/spasibo/';
            if (phoneVal) url += '?phone=' + encodeURIComponent(phoneVal);
            showStatus(status, 'success', 'Заявка отправлена! Переходим…');
            window.location.assign(url);
            return; // дальше не выполняем — уходим со страницы
          } else {
            showStatus(status, 'error', data.message || 'Не удалось отправить. Позвоните: +7 (351) 211-65-97');
          }
        })
        .catch(function () {
          showStatus(status, 'error', 'Ошибка сети. Позвоните: +7 (351) 211-65-97');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtn.dataset.label) submitBtn.innerHTML = submitBtn.dataset.label;
          }
        });
    });
  });

  function showStatus(el, type, msg) {
    if (!el) {
      // нет контейнера статуса — fallback на alert при успехе/ошибке
      if (type === 'success' || type === 'error') alert(msg);
      return;
    }
    el.textContent = msg;
    el.className = 'js-form-status form-status form-status--' + type;
    el.style.display = msg ? 'block' : 'none';
  }
})();
