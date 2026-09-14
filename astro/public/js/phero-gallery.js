/* Карусель фото в карточке товара (.phero__media).
 * Было: главное фото статичное, превью открывали лайтбокс, лента с полосой
 * прокрутки. Стало: превью переключают сцену, стрелки и свайп листают,
 * счётчик показывает позицию, клик по сцене открывает лайтбокс на текущем
 * кадре. Лайтбокс остаётся страничным скриптом: он читает data-lightbox-index
 * у .phero__main, а мы держим этот атрибут актуальным. Клики по превью
 * перехватываем на фазе захвата, чтобы страничный обработчик не открыл
 * лайтбокс вместо переключения сцены.
 */
(function () {
  'use strict';

  var media = document.querySelector('.phero__media');
  if (!media) return;
  var stage = media.querySelector('.phero__main');
  var stageImg = stage && stage.querySelector('img');
  var strip = media.querySelector('.phero__thumbs');
  var thumbs = strip ? Array.prototype.slice.call(strip.querySelectorAll('.phero__thumb')) : [];
  if (!stage || !stageImg || thumbs.length < 2) return;

  var slides = thumbs.map(function (t) {
    var img = t.querySelector('img');
    return { src: img.getAttribute('data-full') || img.getAttribute('src'), alt: img.getAttribute('alt') || '' };
  });
  var current = 0;

  // ── Элементы управления ──────────────────────────────────────
  function btn(dir) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'phero__nav phero__nav--' + (dir < 0 ? 'prev' : 'next');
    b.setAttribute('aria-label', dir < 0 ? 'Предыдущее фото' : 'Следующее фото');
    b.innerHTML = dir < 0
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
    b.addEventListener('click', function (e) { e.stopPropagation(); go(current + dir); });
    return b;
  }
  var counter = document.createElement('span');
  counter.className = 'phero__counter';
  counter.setAttribute('aria-live', 'polite');

  var frame = document.createElement('div');
  frame.className = 'phero__stage';
  stage.parentNode.insertBefore(frame, stage);
  frame.appendChild(stage);
  frame.appendChild(btn(-1));
  frame.appendChild(btn(1));
  frame.appendChild(counter);

  // ── Переключение ─────────────────────────────────────────────
  var preloaded = {};
  function preload(i) {
    var s = slides[(i + slides.length) % slides.length].src;
    if (preloaded[s]) return;
    preloaded[s] = true;
    var im = new Image(); im.src = s;
  }
  function go(i) {
    current = (i + slides.length) % slides.length;
    stageImg.classList.add('is-switching');
    stageImg.src = slides[current].src;
    stageImg.alt = slides[current].alt;
    stage.setAttribute('data-lightbox-index', String(current));
    counter.textContent = (current + 1) + ' / ' + slides.length;
    thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === current); });
    var active = thumbs[current];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    preload(current + 1); preload(current - 1);
    stageImg.addEventListener('load', function done() {
      stageImg.classList.remove('is-switching');
      stageImg.removeEventListener('load', done);
    });
  }

  // Превью: переключаем сцену, страничный лайтбокс не трогаем
  strip.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.phero__thumb') : null;
    if (!t) return;
    e.stopPropagation();
    e.preventDefault();
    go(thumbs.indexOf(t));
  }, true);

  // Клавиатура — когда фокус внутри галереи
  media.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
  });

  // Свайп по сцене (pointer events); короткий тап оставляем лайтбоксу
  var startX = null, startY = null, moved = false;
  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    startX = e.clientX; startY = e.clientY; moved = false;
  });
  stage.addEventListener('pointermove', function (e) {
    if (startX === null) return;
    if (Math.abs(e.clientX - startX) > 10) moved = true;
  });
  stage.addEventListener('pointerup', function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    startX = startY = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      go(current + (dx < 0 ? 1 : -1));
      stage.addEventListener('click', function swallow(ev) {
        ev.stopPropagation(); ev.preventDefault();
        stage.removeEventListener('click', swallow, true);
      }, true);
    }
  });

  counter.textContent = '1 / ' + slides.length;
  preload(1);
  strip.classList.add('is-carousel');
})();
