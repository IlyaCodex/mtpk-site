import { $, $$ } from './dom';

const smooth = (): ScrollBehavior => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/**
 * Склад на главной: вкладки разделов (оборудование, запчасти) и стрелки
 * карусели карточек. Лента листается и без скрипта (прокрутка, свайп);
 * стрелка сдвигает её на одну карточку и гаснет у края ленты.
 */
function initShowcase(root: HTMLElement): void {
  const tabs = $$<HTMLButtonElement>('[role="tab"]', root);
  const panels = $$<HTMLElement>('[role="tabpanel"]', root);
  const prev = $<HTMLButtonElement>('.stock-show__arrow[data-dir="-1"]', root);
  const next = $<HTMLButtonElement>('.stock-show__arrow[data-dir="1"]', root);
  const track = () => $<HTMLElement>('[role="tabpanel"]:not([hidden]) .stock-show__track', root);

  const update = () => {
    const t = track();
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    if (prev) prev.disabled = t.scrollLeft <= 2;
    if (next) next.disabled = t.scrollLeft >= max - 2;
    root.classList.toggle('is-scrollable', max > 2);
  };
  const go = (dir: number) => {
    const t = track();
    const card = t?.firstElementChild as HTMLElement | null;
    if (!t || !card) return;
    const step = card.offsetWidth + Number.parseFloat(getComputedStyle(t).columnGap || '0');
    t.scrollBy({ left: dir * step, behavior: smooth() });
  };
  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));

  const select = (tab: HTMLButtonElement, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    }
    for (const p of panels) p.hidden = p.dataset.kind !== tab.dataset.kind;
    if (focus) tab.focus();
    const t = track();
    if (t) t.scrollLeft = 0;
    update();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      select(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length], true);
    });
  });
  for (const t of $$<HTMLElement>('.stock-show__track', root)) {
    let raf = 0;
    t.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
      },
      { passive: true },
    );
  }
  window.addEventListener('resize', update, { passive: true });
  update();
  root.classList.add('is-ready');
}

/**
 * Склад на /nalichie/: кнопки-фильтры по типам. Тип из адреса (?type=… —
 * ссылка из карточки на главной) выбирается сразу. Число в заголовке
 * ([data-stock-count]) — сколько позиций видно.
 */
function initList(root: HTMLElement): void {
  const buttons = $$<HTMLButtonElement>('.stock-filter [data-type]', root);
  const cards = $$<HTMLElement>('.stock-card', root);
  const counter = $('[data-stock-count]', root);
  if (!buttons.length) return;

  const plural = (n: number) => {
    const m10 = n % 10;
    const m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? 'позиция' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'позиции' : 'позиций';
  };
  const apply = (type: string) => {
    let shown = 0;
    for (const card of cards) {
      const ok = !type || card.dataset.type === type;
      card.hidden = !ok;
      // у .pcard свой display — [hidden] его не перебивает
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
    }
    for (const b of buttons) {
      const on = (b.dataset.type ?? '') === type;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    // на телефоне кнопки — одной строкой с прокруткой: выбранную держим на виду (страницу не двигаем)
    const active = buttons.find((b) => (b.dataset.type ?? '') === type);
    const strip = active?.parentElement;
    if (active && strip && strip.scrollWidth > strip.clientWidth + 1) {
      const shift = active.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - active.offsetWidth) / 2;
      strip.scrollTo({ left: strip.scrollLeft + shift, behavior: smooth() });
    }
    if (counter) counter.textContent = `${shown} ${plural(shown)}`;
  };
  for (const b of buttons) b.addEventListener('click', () => apply(b.dataset.type ?? ''));

  const wanted = new URLSearchParams(location.search).get('type') ?? '';
  if (wanted && buttons.some((b) => b.dataset.type === wanted)) apply(wanted);
}

for (const root of $$<HTMLElement>('.stock-show')) initShowcase(root);
for (const root of $$<HTMLElement>('.stock-list')) initList(root);
