import { $$ } from './dom';

/**
 * Оглавление: подсветка раздела у верха экрана (IntersectionObserver) и
 * плавный скролл по клику. Характеристики товара (.spec__nav) и
 * контентный блок раздела (.cdoc__nav).
 */
function initSpecNav(nav: HTMLElement, linkSelector: string): void {
  const links = $$<HTMLAnchorElement>(linkSelector, nav);
  const ids = links.map((a) => (a.getAttribute('href') ?? '').replace(/^#/, '')).filter(Boolean);
  const setActive = (id: string) => {
    let current: HTMLAnchorElement | undefined;
    for (const a of links) {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on) current = a;
    }
    // длинное содержание прокручивается внутри своей карточки — текущий пункт держим на виду (страницу не двигаем)
    if (current && nav.scrollHeight > nav.clientHeight + 1) {
      const top = current.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
      const bottom = top + current.offsetHeight;
      const pad = 48;
      if (top < nav.scrollTop + pad) nav.scrollTo({ top: Math.max(0, top - pad), behavior: 'smooth' });
      else if (bottom > nav.scrollTop + nav.clientHeight - pad) nav.scrollTo({ top: bottom - nav.clientHeight + pad, behavior: 'smooth' });
    }
  };

  nav.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>(linkSelector) : null;
    const id = a?.getAttribute('href')?.replace(/^#/, '');
    const target = id ? document.getElementById(id) : null;
    if (!a || !target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id!);
    history.replaceState(null, '', `#${id}`);
  });

  if (!('IntersectionObserver' in window) || !ids.length) return;
  const visible: Record<string, boolean> = {};
  const first = document.getElementById(ids[0]);
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) visible[en.target.id] = en.isIntersecting;
      const best = ids.find((id) => visible[id]);
      if (best) setActive(best);
      // выше первого раздела (вводная часть) — ничего не подсвечено
      else if (first && first.getBoundingClientRect().top > window.innerHeight * 0.3) setActive('');
    },
    // зона срабатывания — полоса между 20% и 30% высоты экрана от верха
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
  );
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  }
}

for (const nav of $$('.spec__nav')) initSpecNav(nav, '.spec__nav-link');
for (const nav of $$('.cdoc__nav')) initSpecNav(nav, '.cdoc__nav-link');
