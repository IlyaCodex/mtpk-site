/* ============================================================
   made-badges.js — бейдж «Сделано в России» на обложках товаров.
   Где показываем: каталоги-подкатегории (.pcard), плитки подкатегорий
   на хабе (.teaser-card), карточки категорий на главной (.cat-card) и
   карточки товара (.phero) трёх разделов — индукционные плавильные печи,
   дробемётное оборудование, системы охлаждения. Исключения: категория
   транзисторных печей (induktsionnye-plavilnye-pechi/tranzistornye) и её
   товары; категория чиллеров (sistemy-ohlazhdeniya/chillery) и её товары.

   Ставится поверх обложки СНИЗУ-СПРАВА, чтобы не пересекаться с бейджем
   «В наличии» (снизу-слева, stock-badges.js) и «Сталь / чугун» / баннером
   (сверху-слева). Стили — .made-badge в stock.css (инлайнится глобально).

   scan() идемпотентна (защита от повторной инжекции), поэтому её можно
   вызывать повторно. Экспонируется как window.refreshMadeBadges — это
   нужно /js/stock-list.js, который дорисовывает карточки .pcard в /nalichie/
   асинхронно, уже ПОСЛЕ первого прохода этого скрипта.
   ============================================================ */
(function () {
  'use strict';

  // Префиксы slug (после /products/), которым ставим бейдж.
  var ALLOW = [
    'induktsionnye-plavilnye-pechi',
    'drobemetnoe-oborudovanie',
    'sistemy-ohlazhdeniya'
  ];
  // Исключения — бейдж НЕ ставим (категория + её товары).
  var DENY = [
    'induktsionnye-plavilnye-pechi/tranzistornye',
    'sistemy-ohlazhdeniya/chillery'
  ];

  function eligible(slug) {
    slug = String(slug).replace(/^\/+|\/+$/g, '');
    var i;
    for (i = 0; i < DENY.length; i++) {
      if (slug === DENY[i] || slug.indexOf(DENY[i] + '/') === 0) return false;
    }
    for (i = 0; i < ALLOW.length; i++) {
      if (slug === ALLOW[i] || slug.indexOf(ALLOW[i] + '/') === 0) return true;
    }
    return false;
  }

  function eligibleHref(href) {
    var m = String(href || '').match(/^\/products\/(.+?)\/?$/);
    return m ? eligible(m[1]) : false;
  }

  function makeBadge() {
    var b = document.createElement('span');
    b.className = 'made-badge';
    b.setAttribute('aria-label', 'Сделано в России');
    var flag = document.createElement('span');
    flag.className = 'made-badge__flag';
    flag.setAttribute('aria-hidden', 'true');
    b.appendChild(flag);
    b.appendChild(document.createTextNode('Сделано в России'));
    return b;
  }

  // Навешиваем бейдж в обложку, если ещё нет. cover — позиционируемый контейнер.
  function pin(cover) {
    if (!cover || cover.querySelector('.made-badge')) return;
    if (getComputedStyle(cover).position === 'static') cover.style.position = 'relative';
    cover.appendChild(makeBadge());
  }

  function scan() {
    // 1) Карточки каталога (.pcard) — по href ссылки карточки. Сюда же попадают
    //    карточки, которые /nalichie/ дорисовывает динамически (повторный scan).
    document.querySelectorAll('article.pcard').forEach(function (card) {
      var a = card.querySelector('a[href^="/products/"]');
      if (!a || !eligibleHref(a.getAttribute('href'))) return;
      pin(card.querySelector('.pcard__cover'));
    });

    // 2) Плитки подкатегорий на хабе (.teaser-card) — по href плитки.
    document.querySelectorAll('a.teaser-card[href^="/products/"]').forEach(function (a) {
      if (!eligibleHref(a.getAttribute('href'))) return;
      pin(a.querySelector('.teaser-card__cover'));
    });

    // 3) Карточки категорий на главной (.cat-card) — по href карточки.
    document.querySelectorAll('a.cat-card[href^="/products/"]').forEach(function (a) {
      if (!eligibleHref(a.getAttribute('href'))) return;
      pin(a.querySelector('.cat-card__cover'));
    });

    // 4) Карточка товара (.phero) — по текущему URL.
    var main = document.querySelector('.phero__main');
    if (main && !main.querySelector('.made-badge') && eligibleHref(location.pathname)) {
      main.appendChild(makeBadge());
    }
  }

  scan();
  // Точка дорисовки для асинхронных карточек (stock-list.js на /nalichie/).
  window.refreshMadeBadges = scan;
})();
