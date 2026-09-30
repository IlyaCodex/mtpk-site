/* Обработка форм заявок — УралИндуктор
 * Все формы с классом .js-lead-form отправляются на /api/send.php через fetch.
 * Защита: honeypot (.hp-field), form_ts (время загрузки), source (URL).
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/send.php';
  var YM_LEGACY_COUNTER = 25228307;        // рекламный кабинет УралИндуктор3
  var YM_UIBUSINESS_COUNTER = 112991420;   // рекламный кабинет uibusiness
  var PRIMARY_YM_COUNTER = YM_UIBUSINESS_COUNTER;
  var TMR_COUNTER = 3784620;   // Top.Mail.Ru
  var forms = document.querySelectorAll('form.js-lead-form');
  if (!forms.length) return;

  function getCookie(name) {
    var m = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
    );
    if (!m) return '';
    try { return decodeURIComponent(m[1]); } catch (e) { return ''; }
  }

  // ── UTM / маркетинговые метки ───────────────────────────────
  // Последнее размеченное рекламное касание сохраняем на 30 дней
  // (localStorage + cookie) и добавляем в заявку. Новый визит с любой меткой
  // начинает чистую атрибуцию: отсутствующие click-id не наследуются от
  // предыдущей кампании, landing_url фиксируется заново.
  var UTM_KEY = 'ui_marketing_trace';
  function setCookie(name, value, days) {
    var d = new Date(); d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) +
      ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function getMarketing() {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid', 'fbclid'];
    var saved = {};
    try {
      var raw = localStorage.getItem(UTM_KEY) || getCookie(UTM_KEY);
      if (raw) saved = JSON.parse(raw) || {};
    } catch (e) {}
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    var params = null;
    try { params = new URLSearchParams(location.search); } catch (e) {}
    var hasIncomingMarketing = false;
    if (params) keys.forEach(function (k) {
      if (params.get(k)) hasIncomingMarketing = true;
    });

    var data = hasIncomingMarketing ? {} : saved;
    var changed = hasIncomingMarketing;
    if (hasIncomingMarketing) {
      keys.forEach(function (k) {
        var v = params.get(k);
        if (v) data[k] = v.slice(0, 500);
      });
      data.landing_url = location.href.slice(0, 500);
      if (document.referrer && document.referrer.indexOf(location.host) === -1) {
        data.referrer = document.referrer.slice(0, 500);
      }
    } else {
      if (!data.landing_url) {
        data.landing_url = location.href.slice(0, 500);
        changed = true;
      }
      if (!data.referrer && document.referrer && document.referrer.indexOf(location.host) === -1) {
        data.referrer = document.referrer.slice(0, 500);
        changed = true;
      }
    }

    if (changed || !Object.keys(saved).length) {
      try {
        var s = JSON.stringify(data);
        localStorage.setItem(UTM_KEY, s);
        setCookie(UTM_KEY, s, 30);
      } catch (e) {}
    }
    return data;
  }
  getMarketing(); // зафиксировать первое касание сразу при загрузке страницы

  // ── Коллтрекинг uibusiness / AImarketing ───────────────────────
  // На части страниц может ещё находиться старая ранняя инициализация B242YA,
  // которая выполнялась до готовности Метрики. Здесь есть общий страховочный
  // запуск: после получения Client ID счётчика uibusiness загружаем свежий
  // экземпляр B242YA и запрашиваем номер только из пула aimarketing.
  function startAIMarketingCallTracking() {
    var marketing = getMarketing();
    if (!/^AImarketing_/i.test(String(marketing.utm_campaign || '')) ||
        window.__uiAIMarketingCallTrackingStarted ||
        typeof window.ym !== 'function') return false;
    try {
      window.ym(YM_UIBUSINESS_COUNTER, 'getClientID', function (clientId) {
        if (!clientId || window.__uiAIMarketingCallTrackingStarted) return;

        document.querySelectorAll('a[href="tel:+73512116597"]').forEach(function (link) {
          link.classList.remove('b242ya-call-tracker');
          if (link.parentElement && link.parentElement.classList.contains('b242ya-call-tracker')) return;
          var wrapper = document.createElement('span');
          wrapper.className = 'b242ya-call-tracker';
          wrapper.style.display = 'contents';
          link.parentNode.insertBefore(wrapper, link);
          wrapper.appendChild(link);
        });

        function initialize() {
          if (window.__uiAIMarketingCallTrackingStarted ||
              typeof window.B242YAInit !== 'function') return;
          window.__uiAIMarketingCallTrackingStarted = true;
          window.B242YAInit({
            portal: 'https://uinduktor.bitrix24.ru/',
            pid: '6de41eb1d932b12cd4ec47ddc85ac1df',
            yaCounterId: YM_UIBUSINESS_COUNTER,
            callTrackingPoolName: 'aimarketing'
          });
        }

        if (typeof window.B242YAInit === 'function') {
          initialize();
          return;
        }
        if (document.getElementById('b242ya-script-aimarketing')) return;
        var script = document.createElement('script');
        script.id = 'b242ya-script-aimarketing';
        script.async = true;
        script.src = 'https://67p.b242ya.ru/static/js/b242ya.js?aimarketing-' +
          Math.floor(Date.now() / 60000);
        script.addEventListener('load', initialize, { once: true });
        document.head.appendChild(script);
      });
      return true;
    } catch (e) { return false; }
  }

  window.addEventListener('ui-analytics-started', startAIMarketingCallTracking);
  window.addEventListener('cookie-consent-accepted', function () {
    setTimeout(startAIMarketingCallTracking, 500);
  });
  // Старые HTML-страницы события ui-analytics-started не отправляют, поэтому
  // коротко ждём отложенный старт Метрики и прекращаем опрос после 15 секунд.
  var callTrackingAttempt = 0;
  var callTrackingTimer = setInterval(function () {
    callTrackingAttempt += 1;
    startAIMarketingCallTracking();
    if (window.__uiAIMarketingCallTrackingStarted || callTrackingAttempt >= 15) {
      clearInterval(callTrackingTimer);
    }
  }, 1000);

  // ── Сквозная аналитика Битрикс24 ──────────────────────────────────
  // Полный TRACE берём через официальный API трекера Битрикс24. Cookie
  // b24_trace оставляем только как fallback для старых версий трекера.
  // Client ID берём у рекламного счётчика uibusiness; _ym_uid остаётся
  // fallback, если API Метрики ещё не успел ответить.
  var primaryYmClientId = '';
  function refreshYmClientId() {
    try {
      if (typeof window.ym === 'function') {
        window.ym(PRIMARY_YM_COUNTER, 'getClientID', function (clientId) {
          if (clientId) primaryYmClientId = String(clientId).slice(0, 100);
        });
      }
    } catch (e) {}
  }
  setTimeout(refreshYmClientId, 3000);
  window.addEventListener('cookie-consent-accepted', refreshYmClientId);

  function appendAnalyticsCookies(fd) {
    var b24Trace = '';
    try {
      if (window.b24Tracker && window.b24Tracker.guest &&
          typeof window.b24Tracker.guest.getTrace === 'function') {
        b24Trace = window.b24Tracker.guest.getTrace() || '';
      }
    } catch (e) {}
    if (!b24Trace) b24Trace = getCookie('b24_trace');
    if (b24Trace) fd.append('b24_trace', b24Trace);

    refreshYmClientId();
    var ymUid = primaryYmClientId || getCookie('_ym_uid');
    if (ymUid) fd.append('_ym_uid', ymUid);
  }

  // ── Цели аналитики ───────────────────────────────────────────
  // Целей не было вообще: конверсии форм в Метрике не считались.
  // Шлём одну общую цель lead_form_submit и вторую — по имени формы
  // (data-form), чтобы разделить экспресс-звонок и полную заявку.
  function isUiBusinessPaidClick(marketing) {
    var campaign = String(marketing.utm_campaign || '').toLowerCase();
    var source = String(marketing.utm_source || '').toLowerCase();
    var medium = String(marketing.utm_medium || '').toLowerCase();
    var yclid = String(marketing.yclid || '');
    return campaign.indexOf('aimarketing_') === 0 &&
      source === 'yandex' && medium === 'cpc' && /^\d{10,40}$/.test(yclid);
  }

  function reachGoal(form) {
    var label = (form.getAttribute('data-form') || 'lead').toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    var marketing = getMarketing();
    var campaign = String(marketing.utm_campaign || '').toLowerCase();
    var source = String(marketing.utm_source || '').toLowerCase();
    // Кампании, созданные этим рекламным кабинетом, имеют стабильный префикс
    // AImarketing_. Остальные размеченные кампании Яндекс Директа относятся
    // к УралИндуктор3. Органику и прямые заходы не приписываем рекламе.
    var goalCounter = 0;
    // Счётчик uibusiness получает конверсию только после настоящего клика
    // из Директа: тестовые UTM без yclid больше не загрязняют эту цель.
    if (isUiBusinessPaidClick(marketing)) {
      goalCounter = YM_UIBUSINESS_COUNTER;
    } else if (campaign && source === 'yandex') {
      goalCounter = YM_LEGACY_COUNTER;
    }
    try {
      if (goalCounter && typeof window.ym === 'function') {
        window.ym(goalCounter, 'reachGoal', 'lead_form_submit', {
          form: label,
          ad_account: goalCounter === YM_UIBUSINESS_COUNTER ? 'uibusiness' : 'uralinduktor3'
        });
      }
    } catch (e) {}
    try {
      if (window._tmr && typeof window._tmr.push === 'function') {
        window._tmr.push({ type: 'reachGoal', id: TMR_COUNTER, goal: 'lead_form_submit' });
      }
    } catch (e) {}
  }

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

      var fd = new FormData(form); // файл «Прикрепить КП» уходит вместе с остальными полями
      // маркетинговые метки (utm_*, yclid, gclid, fbclid, referrer, landing_url)
      var mk = getMarketing();
      Object.keys(mk).forEach(function (k) { if (mk[k]) fd.append(k, mk[k]); });
      appendAnalyticsCookies(fd); // b24_trace + _ym_uid для сквозной аналитики
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
            reachGoal(form);
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
