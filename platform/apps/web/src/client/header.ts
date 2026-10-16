import { $, $$, delegate, inertOutside, trapTab } from './dom';

/**
 * Липкая шапка: класс is-scrolled после прокрутки (не чаще раза за кадр).
 * Её высота — в переменной --site-header-h у <html>: под шапку садятся
 * липкие элементы страницы (содержание статьи) и якоря разделов.
 */
function stickyHeader(): void {
  const shell = $('.header-shell');
  if (!shell) return;
  const root = document.documentElement;
  const measure = () => root.style.setProperty('--site-header-h', `${Math.round(shell.getBoundingClientRect().height)}px`);
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(shell);
  let queued = false;
  const update = () => {
    shell.classList.toggle('is-scrolled', window.scrollY > 8);
    queued = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/**
 * Мобильное меню (≤ 1024px): открывается кнопкой в шапке; пока открыто,
 * остальная страница недоступна, фокус ходит по кругу, Esc и ссылка закрывают.
 */
function mobileNav(): void {
  const toggle = $<HTMLButtonElement>('[data-nav-toggle]');
  const drawer = $('[data-nav-drawer]');
  if (!toggle || !drawer) return;
  const closeBtn = $<HTMLButtonElement>('[data-nav-close]', drawer);
  drawer.inert = true;
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Мобильное меню');
  drawer.setAttribute('aria-modal', 'true');
  let restore: (() => void) | null = null;

  const open = () => {
    if (restore) return;
    document.body.classList.add('nav-open');
    drawer.inert = false;
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    restore = inertOutside(drawer);
    closeBtn?.focus();
  };
  const close = () => {
    if (!restore) return;
    restore();
    restore = null;
    document.body.classList.remove('nav-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    toggle.setAttribute('aria-expanded', 'false');
    (toggle.getClientRects().length ? toggle : $('.header__brand'))?.focus();
  };

  toggle.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  drawer.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const acc = target?.closest<HTMLElement>('[data-drawer-acc]');
    if (acc) {
      const item = acc.closest('.nav-drawer__item');
      const isOpen = item?.classList.toggle('is-open') ?? false;
      acc.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      return;
    }
    if (target?.closest('.nav-drawer__link, .nav-drawer__sublink')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!restore) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else trapTab(e, drawer);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) close();
  });
}

/**
 * Мегаменю: колонка длиннее первой прокручивается внутри (site.css). Край списка, за которым есть
 * ещё пункты, растворяется — классы can-up / can-down; пересчёт при прокрутке и при открытии меню.
 */
function megaScroll(): void {
  for (const list of $$('.megamenu__col:first-child ~ .megamenu__col .megamenu__list')) {
    const update = () => {
      list.classList.toggle('can-up', list.scrollTop > 1);
      list.classList.toggle('can-down', list.scrollTop + list.clientHeight < list.scrollHeight - 1);
    };
    update();
    list.addEventListener('scroll', update, { passive: true });
    list.closest('.nav__item')?.addEventListener('mouseenter', update);
  }
}

/** Поиск: модуль с окном поиска грузится только по первому клику на «лупу» (или ?q= в адресе). */
function searchOpener(): void {
  let loading: Promise<{ openSearch: (q?: string) => void }> | null = null;
  const load = () => (loading ??= import('./search'));
  delegate('click', '[data-search-open]', (_el, e) => {
    e.preventDefault();
    void load().then((m) => m.openSearch());
  });
  const q = new URLSearchParams(location.search).get('q');
  if (q) void load().then((m) => m.openSearch(q));
}

export function initHeader(): void {
  stickyHeader();
  mobileNav();
  megaScroll();
  searchOpener();
}
