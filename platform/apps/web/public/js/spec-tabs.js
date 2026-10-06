/* Spec-оглавление на карточке товара («Содержание»).
   Все секции всегда видны стопкой. Поведение:
   — при скролле контента подсвечивается активный пункт оглавления
     (scrollspy через IntersectionObserver);
   — по клику на пункт — плавный скролл к его секции.
   На мобиле (≤900px) .spec__nav скрыт CSS-ом — там просто видны все секции.
   Деградация без JS / без IntersectionObserver: всё видно, ссылки-якоря работают. */
(function () {
  document.querySelectorAll('.spec').forEach(function (spec) {
    var nav = spec.querySelector('.spec__nav');
    var body = spec.querySelector('.spec__body');
    if (!nav || !body) return;

    var links = Array.prototype.slice.call(spec.querySelectorAll('.spec__nav-link'));
    var panels = Array.prototype.slice.call(body.querySelectorAll('.spec__panel'));
    if (!links.length || !panels.length) return;

    var linkById = {};
    links.forEach(function (l) {
      var href = l.getAttribute('href') || '';
      if (href.charAt(0) === '#') linkById[href.slice(1)] = l;
    });

    function setActive(id) {
      links.forEach(function (l) {
        l.classList.toggle('is-active', l === linkById[id]);
      });
    }

    // По умолчанию активна первая секция.
    setActive(panels[0].id);

    // Клик по пункту — плавный скролл к секции.
    links.forEach(function (l) {
      l.addEventListener('click', function (e) {
        var href = l.getAttribute('href') || '';
        if (href.charAt(0) !== '#') return;
        var id = href.slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(id);
        if (window.history && history.replaceState) history.replaceState(null, '', href);
      });
    });

    // Scrollspy: при скролле подсвечиваем самую верхнюю секцию,
    // попавшую в узкую зону у верха вьюпорта.
    if ('IntersectionObserver' in window) {
      var ratios = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          ratios[en.target.id] = en.isIntersecting;
        });
        var bestId = null;
        for (var i = 0; i < panels.length; i++) {
          if (ratios[panels[i].id]) { bestId = panels[i].id; break; }
        }
        if (bestId) setActive(bestId);
      }, {
        // зона срабатывания — полоса между 20% и 30% высоты вьюпорта от верха
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      });
      panels.forEach(function (p) { io.observe(p); });
    }
  });
})();
