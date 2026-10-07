/**
 * Парсеры секций старой вёрстки → данные типизированных блоков.
 * Ключ — «тег.первый-класс» верхнеуровневого элемента тела страницы.
 */
import type {
  Block,
  CatalogFilter,
  CatalogListBlock,
  CategoryHeroBlock,
  FaqBlock,
  ProductCard,
  ProductGallery,
  ProductHeroBlock,
  ProductSpecBlock,
  SectionHead,
  SpecContent,
  StatsBlock,
} from '@mtpk/content-model';
import {
  attr,
  classList,
  expect,
  fail,
  hasClass,
  inner,
  kids,
  onlyAttrs,
  outer,
  parseAction,
  parseBreadcrumbs,
  restAttrs,
  type El,
} from './dom.ts';

export function parseImage(img: El) {
  expect(img, 'img');
  if (attr(img, 'class') !== undefined) fail('картинка с классом');
  const src = attr(img, 'src');
  if (src === undefined) fail('картинка без src');
  return { src, alt: attr(img, 'alt') ?? '', attrs: restAttrs(img, 'src', 'alt') };
}

export function parseSectionHead(el: El): SectionHead {
  expect(el, 'div', 's-head');
  onlyAttrs(el, []);
  const k = kids(el);
  let i = 0;
  const head: SectionHead = { title: '' };
  if (hasClass(k[i], 's-eyebrow')) {
    expect(k[i], 'div', 's-eyebrow');
    onlyAttrs(k[i], []);
    head.eyebrow = inner(k[i++]);
  }
  expect(k[i], 'h2', 's-title');
  onlyAttrs(k[i], []);
  head.title = inner(k[i++]);
  if (k[i]) {
    expect(k[i], 'p', 's-lead');
    onlyAttrs(k[i], []);
    head.lead = inner(k[i++]);
  }
  if (k[i]) fail('s-head: лишние элементы');
  return head;
}

// ── Карточка товара ───────────────────────────────────────────────────────

/**
 * Фото карточки товара → список фотографий. Разметку кнопок, номера кадров и
 * подписи компонент строит сам, поэтому здесь из неё берутся только адреса,
 * описания, плашка, подпись и вид ленты миниатюр; совпадение итоговой
 * разметки с исходной проверяет сверка в to-blocks.
 */
function parseProductGallery(mk: El[]): ProductGallery {
  const mainEl = mk[0];
  if (!mainEl || !hasClass(mainEl, 'phero__main') || classList(mainEl).length !== 1) fail('phero__main');
  if (mainEl.tagName !== 'button') fail('phero__main: тег');
  const mainKids = kids(mainEl);
  let banner: string | undefined;
  let j = 0;
  if (hasClass(mainKids[j], 'phero__banner')) {
    expect(mainKids[j], 'span', 'phero__banner');
    onlyAttrs(mainKids[j], []);
    banner = inner(mainKids[j++]);
  }
  const main = parseImage(mainKids[j++]);
  if (mainKids[j]) fail('phero__main: лишнее');

  let m = 1;
  let photos: ProductGallery['photos'] = [{ src: main.src, alt: main.alt }];
  let thumbs: ProductGallery['thumbs'] = 'grid';
  if (mk[m] && hasClass(mk[m], 'phero__thumbs')) {
    const strip = mk[m++];
    expect(strip, 'div');
    if (classList(strip).includes('phero__thumbs--scroll')) thumbs = 'scroll';
    else if (/repeat\(\d+/.test(attr(strip, 'style') ?? '')) thumbs = 'row';
    photos = kids(strip).map((t) => {
      expect(t, 'button');
      const [img, ...rest] = kids(t);
      if (rest.length) fail('миниатюра: лишнее');
      const image = parseImage(img);
      const full = image.attrs?.['data-full'];
      return full ? { src: full, thumb: image.src, alt: image.alt } : { src: image.src, alt: image.alt };
    });
    if (photos[0].src !== main.src) fail('главное фото не совпадает с первой миниатюрой');
  }
  let caption: string | undefined;
  if (mk[m] && hasClass(mk[m], 'phero__caption')) {
    expect(mk[m], 'p', 'phero__caption');
    onlyAttrs(mk[m], []);
    caption = inner(mk[m++]);
  }
  if (mk[m]) fail('phero__media: лишнее');
  return {
    photos,
    banner,
    mainAlt: main.alt !== photos[0].alt ? main.alt : undefined,
    caption,
    thumbs,
    zoom: attr(mainEl, 'data-lightbox-index') !== undefined,
    mainLabel: attr(mainEl, 'aria-label') !== 'Открыть фото на весь экран' ? attr(mainEl, 'aria-label') : undefined,
  };
}

export function parseProductHero(el: El): ProductHeroBlock {
  expect(el, 'section', 'phero');
  onlyAttrs(el, []);
  const [container, ...restC] = kids(el);
  if (restC.length) fail('phero: лишнее');
  expect(container, 'div', 'container');
  onlyAttrs(container, []);
  const [nav, grid, ...restG] = kids(container);
  if (restG.length) fail('phero: лишнее в container');
  const breadcrumbs = parseBreadcrumbs(nav, 'breadcrumb breadcrumb--light');
  expect(grid, 'div', 'phero__grid');
  onlyAttrs(grid, []);
  const [mediaEl, infoEl, ...restGrid] = kids(grid);
  if (restGrid.length) fail('phero__grid: лишнее');

  // фото
  expect(mediaEl, 'div', 'phero__media');
  onlyAttrs(mediaEl, []);
  const mk = kids(mediaEl);
  const media = parseProductGallery(mk);

  // описание
  expect(infoEl, 'div', 'phero__info');
  onlyAttrs(infoEl, []);
  const ik = kids(infoEl);
  let i = 0;
  let origin: string | undefined;
  if (hasClass(ik[i], 'phero__origin')) {
    expect(ik[i], 'div', 'phero__origin');
    onlyAttrs(ik[i], []);
    origin = inner(ik[i++]);
  }
  expect(ik[i], 'h1', 'phero__title');
  onlyAttrs(ik[i], []);
  const title = inner(ik[i++]);
  const statusRow = expect(ik[i++], 'div', 'phero__status-row');
  onlyAttrs(statusRow, []);
  let status: string | undefined;
  let price: string | undefined;
  const sk = kids(statusRow);
  let s = 0;
  if (hasClass(sk[s], 'phero__status')) {
    expect(sk[s], 'span', 'phero__status');
    onlyAttrs(sk[s], []);
    status = inner(sk[s++]);
  }
  if (hasClass(sk[s], 'phero__price')) {
    expect(sk[s], 'span', 'phero__price');
    onlyAttrs(sk[s], []);
    price = inner(sk[s++]);
  }
  if (sk[s]) fail('status-row: лишнее');
  const keyEl = expect(ik[i++], 'div', 'phero__keyspecs');
  onlyAttrs(keyEl, []);
  const keyspecs = kids(keyEl).map((k) => {
    expect(k, 'div', 'phero__keyspec');
    onlyAttrs(k, []);
    const [num, label, ...rest] = kids(k);
    if (rest.length) fail('keyspec: лишнее');
    expect(num, 'div', 'phero__keyspec-num');
    expect(label, 'div', 'phero__keyspec-label');
    onlyAttrs(num, []);
    onlyAttrs(label, []);
    return { num: inner(num), label: inner(label) };
  });
  const actEl = expect(ik[i++], 'div', 'phero__actions');
  onlyAttrs(actEl, []);
  const actions = kids(actEl).map(parseAction);
  const factsEl = expect(ik[i++], 'ul', 'phero__facts');
  onlyAttrs(factsEl, []);
  const facts = kids(factsEl).map((li) => {
    expect(li, 'li');
    if (li.attrs.length) fail('факт: атрибуты');
    const [svg, span, ...rest] = kids(li);
    if (rest.length || !svg || svg.tagName !== 'svg') fail('факт: структура');
    expect(span, 'span');
    if (span.attrs.length) fail('факт: атрибуты span');
    return { icon: outer(svg), text: inner(span) };
  });
  if (ik[i]) fail('phero__info: лишнее');
  return { type: 'productHero', breadcrumbs, media, origin, title, status, price, keyspecs, actions, facts };
}

// ── Характеристики ────────────────────────────────────────────────────────

function parseSpecTable(table: El): { label: string; value: string }[] {
  expect(table, 'table', 'spec-table');
  onlyAttrs(table, []);
  const [tbody, ...rest] = kids(table);
  if (rest.length) fail('spec-table: не только tbody');
  expect(tbody, 'tbody');
  if (tbody.attrs.length) fail('tbody: атрибуты');
  return kids(tbody).map((tr) => {
    expect(tr, 'tr');
    if (tr.attrs.length) fail('tr: атрибуты');
    const [th, td, ...more] = kids(tr);
    if (more.length) fail('tr: больше двух ячеек');
    expect(th, 'th');
    expect(td, 'td');
    if (th.attrs.length || td.attrs.length) fail('ячейка: атрибуты');
    return { label: inner(th), value: inner(td) };
  });
}

function parseSpecContent(el: El): SpecContent {
  try {
    if (el.tagName === 'table') return { kind: 'table', rows: parseSpecTable(el) };
    if (el.tagName === 'div' && !attr(el, 'class') && el.attrs.length === 1 && attr(el, 'style') !== undefined) {
      const [table, ...rest] = kids(el);
      if (!rest.length && table?.tagName === 'table') return { kind: 'table', rows: parseSpecTable(table), wrapStyle: attr(el, 'style') };
    }
  } catch {
    /* таблица нестандартная — оставляем как HTML */
  }
  return { kind: 'html', html: outer(el) };
}

export function parseProductSpec(el: El): ProductSpecBlock {
  expect(el, 'section', 'spec');
  onlyAttrs(el, ['aria-label']);
  const [container, ...r0] = kids(el);
  if (r0.length) fail('spec: лишнее');
  expect(container, 'div', 'container');
  onlyAttrs(container, []);
  const [layout, ...r1] = kids(container);
  if (r1.length) fail('spec: лишнее в container');
  expect(layout, 'div', 'spec__layout');
  onlyAttrs(layout, []);
  const [nav, body, ...r2] = kids(layout);
  if (r2.length) fail('spec__layout: лишнее');
  expect(nav, 'nav', 'spec__nav');
  onlyAttrs(nav, ['aria-label']);
  const [eyebrow, ...links] = kids(nav);
  expect(eyebrow, 'div', 'spec__nav-eyebrow');
  onlyAttrs(eyebrow, []);
  const navItems = links.map((a) => {
    expect(a, 'a', 'spec__nav-link');
    onlyAttrs(a, ['href']);
    return { href: attr(a, 'href')!, label: inner(a) };
  });
  expect(body, 'div', 'spec__body');
  onlyAttrs(body, []);
  const panels = kids(body).map((p) => {
    expect(p, 'div', 'spec__panel');
    onlyAttrs(p, ['id']);
    const [h2, ...content] = kids(p);
    expect(h2, 'h2', 'spec__title');
    onlyAttrs(h2, []);
    return { id: attr(p, 'id') ?? '', title: inner(h2), content: content.map(parseSpecContent) };
  });
  return {
    type: 'productSpec',
    ariaLabel: attr(el, 'aria-label') ?? '',
    navAriaLabel: attr(nav, 'aria-label') ?? '',
    navEyebrow: inner(eyebrow),
    nav: navItems,
    panels,
  };
}

// ── Обложка категории ─────────────────────────────────────────────────────

function parseQuickCard(card: El): NonNullable<CategoryHeroBlock['quickCard']> {
  expect(card, 'div', 'hero-quick-card');
  onlyAttrs(card, ['id']);
  const [badge, title, subtitle, form, ...rest] = kids(card);
  if (rest.length) fail('quick-card: лишнее');
  for (const [e, t, c] of [
    [badge, 'div', 'hero-quick-card__badge'],
    [title, 'h2', 'hero-quick-card__title'],
    [subtitle, 'p', 'hero-quick-card__subtitle'],
  ] as const) {
    expect(e, t, c);
    onlyAttrs(e, []);
  }
  expect(form, 'form', 'hero-quick-card__form js-lead-form');
  onlyAttrs(form, ['data-form']);
  const fk = kids(form);
  const sig = fk.map((e) => `${e.tagName}.${classList(e).join('.')}`).join(' ');
  if (sig !== 'input.hp-field input.js-form-ts input.js-form-source input.hero-quick-card__input button.btn.btn--primary.hero-quick-card__btn label.hero-quick-card__consent div.js-form-status') {
    fail(`quick-card: форма другого вида (${sig})`);
  }
  const phone = fk[3];
  const button = fk[4];
  const consent = fk[5];
  const [check, span, ...r] = kids(consent);
  if (r.length || check?.tagName !== 'input' || span?.tagName !== 'span') fail('quick-card: согласие');
  const btnHtml = inner(button);
  if (!/<span class="btn__arrow">→<\/span>$/.test(btnHtml)) fail('quick-card: кнопка без стрелки');
  return {
    id: attr(card, 'id'),
    badge: inner(badge),
    title: inner(title),
    subtitle: inner(subtitle),
    formName: attr(form, 'data-form') ?? '',
    phoneLabel: attr(phone, 'aria-label') ?? 'Контактный телефон',
    buttonLabel: btnHtml.replace(/\s*<span class="btn__arrow">→<\/span>$/, '').trim(),
    consent: inner(span),
  };
}

export function parseCategoryHero(el: El): CategoryHeroBlock {
  expect(el, 'section', 'cat-hero');
  onlyAttrs(el, []);
  const [image, overlay, content, ...r0] = kids(el);
  if (r0.length) fail('cat-hero: лишнее');
  expect(image, 'div', 'cat-hero__image');
  expect(overlay, 'div', 'cat-hero__overlay');
  onlyAttrs(overlay, []);
  if (kids(image).length || kids(overlay).length) fail('cat-hero: содержимое фона');
  expect(content, 'div', 'container cat-hero__content');
  onlyAttrs(content, []);
  const [nav, next, ...r1] = kids(content);
  if (r1.length) fail('cat-hero__content: лишнее');
  const breadcrumbs = parseBreadcrumbs(nav, 'breadcrumb');
  let bodyEl: El;
  let quickCard: CategoryHeroBlock['quickCard'];
  if (hasClass(next, 'cat-hero__grid')) {
    expect(next, 'div', 'cat-hero__grid');
    onlyAttrs(next, []);
    const [b, aside, ...r2] = kids(next);
    if (r2.length) fail('cat-hero__grid: лишнее');
    bodyEl = b;
    expect(aside, 'div', 'cat-hero__aside');
    onlyAttrs(aside, []);
    const [card, ...r3] = kids(aside);
    if (r3.length) fail('cat-hero__aside: лишнее');
    quickCard = parseQuickCard(card);
  } else {
    bodyEl = next;
  }
  expect(bodyEl, 'div', 'cat-hero__body');
  onlyAttrs(bodyEl, []);
  const bk = kids(bodyEl);
  let i = 0;
  let eyebrow: string | undefined;
  let eyebrowTag: 'div' | 'span' = 'div';
  if (hasClass(bk[i], 'cat-hero__eyebrow')) {
    if (bk[i].tagName !== 'div' && bk[i].tagName !== 'span') fail('cat-hero: тег надзаголовка');
    expect(bk[i], bk[i].tagName, 'cat-hero__eyebrow');
    onlyAttrs(bk[i], []);
    eyebrowTag = bk[i].tagName as 'div' | 'span';
    eyebrow = inner(bk[i++]);
  }
  expect(bk[i], 'h1', 'cat-hero__title');
  onlyAttrs(bk[i], []);
  const title = inner(bk[i++]);
  expect(bk[i], 'p', 'cat-hero__subtitle');
  onlyAttrs(bk[i], []);
  const subtitle = inner(bk[i++]);
  let actions: CategoryHeroBlock['actions'];
  if (bk[i]) {
    expect(bk[i], 'div', 'cat-hero__actions');
    onlyAttrs(bk[i], []);
    actions = kids(bk[i++]).map(parseAction);
  }
  if (bk[i]) fail('cat-hero__body: лишнее');
  return { type: 'categoryHero', imageAttrs: restAttrs(image), breadcrumbs, eyebrow, eyebrowTag, title, subtitle, actions, quickCard };
}

// ── Каталог ───────────────────────────────────────────────────────────────

export function parseCard(article: El): ProductCard {
  expect(article, 'article', 'pcard');
  const [cover, body, ...r] = kids(article);
  if (r.length) fail('pcard: лишнее');
  expect(cover, 'a', 'pcard__cover');
  onlyAttrs(cover, ['href']);
  const href = attr(cover, 'href')!;
  const ck = kids(cover);
  let badge: string | undefined;
  let c = 0;
  if (hasClass(ck[c], 'pcard__badge')) {
    expect(ck[c], 'span', 'pcard__badge');
    onlyAttrs(ck[c], []);
    badge = inner(ck[c++]);
  }
  const image = parseImage(ck[c++]);
  if (ck[c]) fail('pcard__cover: лишнее');
  expect(body, 'div', 'pcard__body');
  onlyAttrs(body, []);
  const bk = kids(body);
  let i = 0;
  const titleEl = expect(bk[i++], 'h3', 'pcard__title');
  onlyAttrs(titleEl, []);
  const [titleLink, ...rt] = kids(titleEl);
  if (rt.length) fail('pcard__title: лишнее');
  expect(titleLink, 'a');
  onlyAttrs(titleLink, ['href']);
  if (attr(titleLink, 'class') !== undefined || attr(titleLink, 'href') !== href) fail('pcard: ссылка заголовка ≠ обложки');
  const card: ProductCard = { href, badge, image, title: inner(titleLink), specs: [], actions: [], attrs: restAttrs(article) };
  if (hasClass(bk[i], 'pcard__origin')) {
    expect(bk[i], 'div', 'pcard__origin');
    onlyAttrs(bk[i], []);
    card.origin = inner(bk[i++]);
  }
  if (hasClass(bk[i], 'pcard__caption')) {
    expect(bk[i], 'p', 'pcard__caption');
    onlyAttrs(bk[i], []);
    card.caption = inner(bk[i++]);
  }
  const dl = expect(bk[i++], 'dl', 'pcard__specs');
  onlyAttrs(dl, []);
  card.specs = kids(dl).map((s) => {
    expect(s, 'div', 'pcard__spec');
    onlyAttrs(s, []);
    const [dt, dd, ...rs] = kids(s);
    if (rs.length) fail('pcard__spec: лишнее');
    expect(dt, 'dt');
    expect(dd, 'dd');
    if (dt.attrs.length || dd.attrs.length) fail('pcard__spec: атрибуты');
    return { label: inner(dt), value: inner(dd) };
  });
  const actions = expect(bk[i++], 'div', 'pcard__actions');
  onlyAttrs(actions, []);
  card.actions = kids(actions).map(parseAction);
  if (bk[i]) fail('pcard__body: лишнее');
  return card;
}

function parseFilter(form: El): CatalogFilter {
  expect(form, 'form', 'catalog-filter');
  onlyAttrs(form, ['onsubmit', 'aria-label', 'data-filter-form']);
  const fk = kids(form);
  const reset = fk.pop();
  const spacer = fk.pop();
  expect(spacer, 'div', 'catalog-filter__spacer');
  expect(reset, 'button', 'catalog-filter__reset');
  const dropdowns = fk.map((d) => {
    expect(d, 'div', 'cf-dropdown');
    onlyAttrs(d, ['data-cf-dropdown', 'data-cf-key']);
    const [trigger, panel, ...r] = kids(d);
    if (r.length) fail('cf-dropdown: лишнее');
    expect(trigger, 'button', 'cf-trigger');
    const [lbl, val, chev, ...rt] = kids(trigger);
    if (rt.length) fail('cf-trigger: лишнее');
    expect(lbl, 'span', 'cf-trigger__label');
    expect(val, 'span', 'cf-trigger__value');
    expect(chev, 'span', 'cf-trigger__chevron');
    expect(panel, 'div', 'cf-panel');
    const options = kids(panel).map((o) => {
      expect(o, 'button', 'cf-option');
      const [t, meta, ...ro] = kids(o);
      if (ro.length) fail('cf-option: лишнее');
      expect(t, 'span');
      if (t.attrs.length) fail('cf-option: span');
      if (meta) expect(meta, 'span', 'cf-option__meta');
      return { value: attr(o, 'data-value') ?? '', label: attr(o, 'data-label') ?? '', text: inner(t), meta: meta ? inner(meta) : undefined };
    });
    const [any, ...rest] = options;
    if (!any || any.value !== '' || any.meta !== undefined) fail('cf-panel: первый пункт не «любой»');
    if (inner(val) !== any.label) fail('cf-trigger: значение ≠ «любой»');
    return { key: attr(d, 'data-cf-key') ?? '', label: inner(lbl), panelLabel: attr(panel, 'aria-label') ?? '', anyText: any.text, anyLabel: any.label, options: rest };
  });
  return { ariaLabel: attr(form, 'aria-label') ?? 'Фильтр каталога', dropdowns };
}

export function parseCatalogList(el: El): CatalogListBlock {
  expect(el, 'section', 'catalog-list');
  const [container, ...r0] = kids(el);
  if (r0.length) fail('catalog-list: лишнее');
  expect(container, 'div', 'container');
  onlyAttrs(container, []);
  const k = kids(container);
  let i = 0;
  const block: CatalogListBlock = { type: 'catalogList', cards: [], attrs: restAttrs(el) };
  if (hasClass(k[i], 's-head')) block.head = parseSectionHead(k[i++]);
  if (hasClass(k[i], 'catalog-filter')) {
    block.filter = parseFilter(k[i++]);
    // inline-скрипт выпадающих списков — поведение теперь в React-компоненте
    if (k[i]?.tagName === 'script') i++;
  }
  const grid = expect(k[i++], 'div', 'pcard-grid');
  block.gridAttrs = restAttrs(grid);
  block.cards = kids(grid).map(parseCard);
  if (k[i]) fail('catalog-list: после сетки ещё элементы');
  return block;
}

// ── Простые секции ────────────────────────────────────────────────────────

export function parseFaq(el: El): FaqBlock {
  expect(el, 'section', 'faq');
  const [container, ...r0] = kids(el);
  if (r0.length) fail('faq: лишнее');
  expect(container, 'div', 'container');
  onlyAttrs(container, []);
  const k = kids(container);
  let i = 0;
  const block: FaqBlock = { type: 'faq', items: [], attrs: restAttrs(el) };
  if (hasClass(k[i], 's-head')) block.head = parseSectionHead(k[i++]);
  const list = expect(k[i++], 'div', 'faq__list');
  onlyAttrs(list, []);
  block.items = kids(list).map((d) => {
    expect(d, 'details', 'faq__item');
    onlyAttrs(d, []);
    const [summary, answer, ...r] = kids(d);
    if (r.length) fail('faq__item: лишнее');
    expect(summary, 'summary');
    if (summary.attrs.length) fail('summary: атрибуты');
    expect(answer, 'p', 'faq__answer');
    onlyAttrs(answer, []);
    return { question: inner(summary), answer: inner(answer) };
  });
  if (k[i]) fail('faq: лишнее после списка');
  return block;
}

export function parseStats(el: El): StatsBlock {
  expect(el, 'section', 'stats');
  const [container, ...r0] = kids(el);
  if (r0.length) fail('stats: лишнее');
  expect(container, 'div', 'container');
  onlyAttrs(container, []);
  const [grid, ...r1] = kids(container);
  if (r1.length) fail('stats: лишнее в container');
  expect(grid, 'div', 'stats__grid');
  onlyAttrs(grid, []);
  const items = kids(grid).map((s) => {
    expect(s, 'div', 'stat');
    onlyAttrs(s, []);
    const sk = kids(s);
    let i = 0;
    let icon: string | undefined;
    if (hasClass(sk[i], 'stat__icon')) {
      const iconEl = expect(sk[i++], 'div', 'stat__icon');
      onlyAttrs(iconEl, []);
      const [svg, ...ri] = kids(iconEl);
      if (ri.length || svg?.tagName !== 'svg') fail('stat__icon');
      icon = outer(svg);
    }
    const body = expect(sk[i++], 'div', 'stat__body');
    onlyAttrs(body, []);
    if (sk[i]) fail('stat: лишнее');
    const [label, num, text, ...rb] = kids(body);
    if (rb.length) fail('stat__body: лишнее');
    expect(label, 'div', 'stat__label');
    expect(num, 'div', 'stat__num');
    expect(text, 'div', 'stat__text');
    return { icon, label: inner(label), num: inner(num), text: inner(text) };
  });
  return { type: 'stats', items, attrs: restAttrs(el) };
}

export function parseLightbox(el: El): Block {
  expect(el, 'div', 'lightbox');
  const total = el.childNodes.length ? Number((outer(el).match(/id="lb-total">(\d+)</) ?? [])[1] ?? 1) : 1;
  return { type: 'lightbox', label: attr(el, 'aria-label') ?? 'Галерея фото', total };
}

/** Парсеры по ключу «тег.первый-класс». */
export const PARSERS: Record<string, (el: El) => Block> = {
  'section.phero': parseProductHero,
  'section.spec': parseProductSpec,
  'section.cat-hero': parseCategoryHero,
  'section.catalog-list': parseCatalogList,
  'section.faq': parseFaq,
  'section.stats': parseStats,
  'div.lightbox': parseLightbox,
};
