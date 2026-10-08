/* ============================================================
   stock-list.js — рендер карточек «Сейчас на складе» на /nalichie/.
   Источник: /data/stock.json (генерится scripts/build-stock.mjs из
   data/stock.config.json). Тот же файл питает /js/stock-badges.js.
   Целевые контейнеры на странице:
     [data-stock-grid]   — сетка карточек .pcard
     [data-stock-filter] — контейнер фильтра (.case__filters)
     [data-stock-count]  — счётчик в заголовке (число видимых позиций)
     [data-stock-empty]  — empty-state, если позиций нет
   ============================================================ */
type StockItem = {
  url: string;
  title?: string;
  category?: string;
  image?: string;
  qty?: number | null;
  shipping?: string | null;
  specs?: unknown[][] | null;
  cardHtml?: string;
};

(function () {
  'use strict';
  var grid    = document.querySelector('[data-stock-grid]');
  if (!grid) return;
  var filterEl = document.querySelector<HTMLElement>('[data-stock-filter]');
  // Внешняя обёртка-полоска с лейблом «Фильтр:» — её показываем/скрываем целиком.
  var filterBar = document.querySelector<HTMLElement>('[data-stock-filterbar]');
  var counter  = document.querySelector('[data-stock-count]');
  var emptyEl  = document.querySelector<HTMLElement>('[data-stock-empty]');

  fetch('/data/stock.json', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var items: StockItem[] = (data && Array.isArray(data.items)) ? data.items : [];

      if (!items.length) {
        if (counter) counter.textContent = '0';
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      if (emptyEl) emptyEl.hidden = true;

      // 1) Сначала рендерим карточки.
      var cards: HTMLElement[] = [];
      var fragCards = document.createDocumentFragment();
      items.forEach(function (it) {
        if (!it || !it.url) return;
        var card = renderCard(it);
        if (card) { fragCards.appendChild(card); cards.push(card); }
      });
      grid!.appendChild(fragCards);

      // 1b) Карточки дорисованы динамически — досыпаем бейдж «Сделано в России»
      //     на обложки трёх отечественных разделов (made-badges.js уже отработал
      //     первый проход до нашего fetch). Идемпотентно.
      if (typeof window.refreshMadeBadges === 'function') window.refreshMadeBadges();

      // 2) Собираем уникальные категории — порядок появления как в stock.json.
      var cats: string[] = [];
      var seenCats = Object.create(null);
      items.forEach(function (it) {
        var c = (it && it.category) ? String(it.category).trim() : '';
        if (!c) return;
        if (seenCats[c]) return;
        seenCats[c] = true;
        cats.push(c);
      });

      // 3) Если категорий ≥ 2 — рисуем фильтр. С одной категорией фильтр не нужен.
      if (filterEl && cats.length >= 2) {
        renderFilter(filterEl, cats, items.length, cards, counter);
        // hidden снимаем как с самого filterEl, так и с обёртки (лейбл «Фильтр:»)
        filterEl.hidden = false;
        if (filterBar) filterBar.hidden = false;
      } else if (counter) {
        counter.textContent = String(items.length);
      }
    })
    .catch(function () { /* нет файла — секция остаётся со скелетом-пустышкой */ });

  /* ── рендер фильтра ── */
  function renderFilter(host: HTMLElement, cats: string[], total: number, cards: HTMLElement[], counter: Element | null) {
    host.innerHTML = ''; // на случай горячей перезагрузки

    function makeBtn(label: string, cat: string, count: number) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'case-filter';
      b.setAttribute('data-cat', cat);
      b.textContent = label + ' (' + count + ')';
      return b;
    }

    var btnAll = makeBtn('Все', '', total);
    btnAll.classList.add('is-active');
    host.appendChild(btnAll);

    cats.forEach(function (c) {
      var cnt = cards.reduce(function (n, card) {
        return n + (card.getAttribute('data-stock-cat') === c ? 1 : 0);
      }, 0);
      host.appendChild(makeBtn(c, c, cnt));
    });

    host.addEventListener('click', function (e) {
      var btn = (e.target as Element).closest && (e.target as Element).closest('.case-filter');
      if (!btn || !host.contains(btn)) return;
      // активная кнопка
      host.querySelectorAll('.case-filter').forEach(function (x) { x.classList.remove('is-active'); });
      btn.classList.add('is-active');
      // фильтрация карточек
      var pick = btn.getAttribute('data-cat') || '';
      var visible = 0;
      cards.forEach(function (card) {
        var match = !pick || card.getAttribute('data-stock-cat') === pick;
        // hidden-атрибут не прячет .pcard (у класса свой display:flex,
        // авторский стиль бьёт UA-правило [hidden]) — гасим и через style.
        card.hidden = !match;
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      if (counter) counter.textContent = String(visible);
    });

    if (counter) counter.textContent = String(total);
  }

  /* ── DOM helpers ── */
  function el(tag: string, attrs?: Record<string, string> | null, children?: (Node | null)[]): HTMLElement {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class')      n.className = attrs[k];
      else if (k === 'text')  n.textContent = attrs[k];
      else                    n.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  /* ── Кнопки действий карточки (единые для fallback и каталожных) ── */
  function arrow() { return el('span', { class: 'btn__arrow', 'aria-hidden': 'true', text: '→' }); }
  function quoteBtn() {
    return el('a', { href: '#leadgen', class: 'btn btn--primary btn--block js-quote-btn' },
      [document.createTextNode('Запросить цену '), arrow()]);
  }
  function moreBtn(url: string) {
    return el('a', { href: url, class: 'pcard__more' },
      [document.createTextNode('Подробнее о позиции '), arrow()]);
  }
  // Гарантируем, что в карточке есть обе кнопки (Запросить цену + Подробнее).
  function ensureActions(card: Element, url: string) {
    var body = card.querySelector('.pcard__body') || card;
    var actions = card.querySelector('.pcard__actions');
    if (!actions) { actions = el('div', { class: 'pcard__actions' }); body.appendChild(actions); }
    if (!actions.querySelector('.js-quote-btn')) actions.insertBefore(quoteBtn(), actions.firstChild);
    if (!actions.querySelector('.pcard__more')) actions.appendChild(moreBtn(url));
  }

  function renderCard(it: StockItem): HTMLElement {
    // Приоритет 1: готовый HTML из подкатегории каталога — рендерим как в
    // подразделе товара 1-в-1 (фото, бейдж категории, специ, кнопки) и сверху
    // вешаем зелёный бейдж «В наличии».
    if (it.cardHtml) {
      var card = injectCatalogCard(it);
      if (card) return card;
    }
    // Приоритет 2 (fallback): простая карточка по полям из stock.json.
    return renderFallbackCard(it);
  }

  // Карточку забрали из родительской подкатегории, а там часть ссылок
  // относительные («uik-cht-0-5/» вместо полного адреса). На /nalichie/
  // такая ссылка разворачивалась от адреса страницы и вела на
  // /nalichie/uik-cht-0-5/ — 404. Разворачиваем их от адреса подкатегории.
  function absolutizeLinks(card: Element, url: string) {
    var base = String(url).replace(/[^/]+\/?$/, '');   // /products/a/b/c/ → /products/a/b/
    var links = card.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href');
      if (!h || /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(h)) continue;
      links[i].setAttribute('href', base + h.replace(/^\.\//, ''));
    }
  }

  function injectCatalogCard(it: StockItem): HTMLElement | null {
    var tmp = document.createElement('div');
    tmp.innerHTML = it.cardHtml!.trim();
    var card = tmp.firstElementChild as HTMLElement | null;
    if (!card || !card.classList || !card.classList.contains('pcard')) return null;
    absolutizeLinks(card, it.url);

    // Помечаем карточку для нашего слоя — нужно для data-stock-cat (фильтр)
    card.setAttribute('data-stock', 'true');
    card.setAttribute('data-stock-cat', it.category || '');

    // Зелёный бейдж «В наличии» — вешаем в pcard__cover. Если бейдж категории
    // уже есть слева — наш ставится справа (см. stock.css).
    var cover = card.querySelector('.pcard__cover');
    if (cover) {
      // защита от повторной инжекции
      if (!cover.querySelector('.pcard__stock-badge')) {
        var badge = document.createElement('a');
        badge.className = 'pcard__stock-badge';
        badge.href = '/nalichie/';
        badge.setAttribute('aria-label', 'В наличии на складе');
        badge.textContent = 'В наличии';
        cover.appendChild(badge);
      }
    }
    // Некоторые каталожные карточки (напр. ковши) не имеют кнопки «Подробнее» —
    // на /nalichie/ добавляем недостающие кнопки, не трогая исходные листинги.
    ensureActions(card, it.url);
    return card;
  }

  function renderFallbackCard(it: StockItem): HTMLElement {
    var url   = it.url;
    var title = it.title    || 'Позиция';
    var cat   = it.category || '';
    var img   = it.image    || '';
    var qty   = it.qty;
    var ship  = it.shipping;

    var coverChildren: HTMLElement[] = [];
    coverChildren.push(el('span', { class: 'pcard__stock-badge', 'aria-label': 'В наличии на складе', text: 'В наличии' }));
    if (img) {
      coverChildren.push(el('img', { src: img, alt: title, loading: 'lazy' }));
    }
    var cover = el('a', { href: url, class: 'pcard__cover' }, coverChildren);

    var bodyChildren: HTMLElement[] = [];
    if (cat) bodyChildren.push(el('div', { class: 'pcard__cat', text: cat }));
    var titleLink = el('a', { href: url, text: title });
    bodyChildren.push(el('h3', { class: 'pcard__title' }, [titleLink]));

    // Характеристики из stock.config.json (specs: [["Label","Value"], …]) —
    // для позиций без карточки в родительском каталоге (напр. категории,
    // запчасти). Рендерим той же разметкой .pcard__specs, что и у товаров.
    if (Array.isArray(it.specs) && it.specs.length) {
      var rows = it.specs.filter(function (s) { return s && s.length >= 2; }).map(function (s) {
        return el('div', { class: 'pcard__spec' }, [
          el('dt', { text: String(s[0]) }),
          el('dd', { text: String(s[1]) })
        ]);
      });
      if (rows.length) bodyChildren.push(el('dl', { class: 'pcard__specs' }, rows));
    }

    if (qty != null || ship) {
      var metaTxt = '';
      if (qty != null) metaTxt += qty + ' шт';
      if (qty != null && ship) metaTxt += ' · ';
      if (ship) metaTxt += 'отгрузка ' + ship;
      bodyChildren.push(el('div', { class: 'pcard__stock-meta', text: metaTxt }));
    }
    bodyChildren.push(el('div', { class: 'pcard__actions' }, [quoteBtn(), moreBtn(url)]));
    var body = el('div', { class: 'pcard__body' }, bodyChildren);

    var card = el('article', { class: 'pcard', 'data-stock': 'true', 'data-stock-cat': cat }, [cover, body]);
    return card;
  }
})();

export {};
