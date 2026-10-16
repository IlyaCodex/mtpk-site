import { maskPhone } from '@mtpk/ui/browser/phone';
import { addQuoteItem } from '@mtpk/ui/browser/quote-store';
import { $, $$, delegate, reducedMotion } from './dom';

/** Формы заявок: у всех есть data-form (у старых из «HTML как есть» — ещё и .js-lead-form). */
const LEAD_FORM = 'form[data-form], form.js-lead-form';

function headerOffset(): number {
  return ($('.header-shell')?.offsetHeight ?? 0) + 16;
}

function formIn(section: Element | null): HTMLFormElement | null {
  if (!section) return null;
  return section.matches(LEAD_FORM) ? (section as HTMLFormElement) : section.querySelector<HTMLFormElement>(LEAD_FORM);
}

/**
 * Скролл к форме заявки внутри секции — не к началу секции (там длинный
 * вводный текст, и форма уезжала бы за край экрана). Поправка на липкую шапку,
 * фокус на первое поле. true — форма найдена.
 */
export function scrollToForm(section: Element | null): boolean {
  const form = formIn(section);
  if (!form) return false;
  const y = form.getBoundingClientRect().top + window.scrollY - headerOffset();
  window.scrollTo({ top: Math.max(0, y), behavior: reducedMotion() ? 'instant' : 'smooth' });
  $<HTMLElement>('input:not([type="hidden"]):not([aria-hidden="true"]),textarea,select,button', form)?.focus({ preventScroll: true });
  return true;
}

/** «Запросить цену»: название позиции — заголовок карточки или страницы товара. */
function quoteName(btn: Element): string {
  const el = btn.closest('.pcard')?.querySelector('.pcard__title') ?? $('.phero__title');
  return el?.textContent?.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

function scrollToQuoteForm(): void {
  const task = $(`:is(${LEAD_FORM}) textarea[name="task"]`);
  const section = task?.closest('.leadgen') ?? task?.closest('section') ?? document.getElementById('leadgen');
  if (scrollToForm(section ?? null)) return;
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else location.hash = 'leadgen';
}

/**
 * Значение контакта в карточке (номер, почта) — в одну строку и целиком: если не влезает по ширине
 * (почту коллтрекинг Mango подменяет длинной info+…@, номер — своим), шрифт уменьшается до влезания.
 * Сразу, после подмены (MutationObserver), загрузки шрифтов и смены ширины окна.
 */
const FIT_VALUES = '.kt-method__value, a.bo-item__value';

function fitValue(el: HTMLElement): void {
  el.style.removeProperty('font-size');
  let size = Number.parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth + 1 && size > 12) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
}

function initFitValues(): void {
  const values = $$(FIT_VALUES);
  if (!values.length) return;
  const run = () => values.forEach(fitValue);
  run();
  // наблюдаем только текст: своя правка размера (атрибут style) повторно наблюдатель не будит
  const observer = new MutationObserver(run);
  for (const el of values) observer.observe(el, { childList: true, characterData: true, subtree: true });
  void document.fonts?.ready.then(run);
  let timer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 150);
  });
}

/** Карта под «щитом» активна, пока курсор над ней: увели — щит снова на месте. */
function unlockMap(shield: HTMLElement): void {
  shield.classList.add('is-hidden');
  shield.closest('.geo__map')?.addEventListener('mouseleave', () => shield.classList.remove('is-hidden'), { once: true });
}

/**
 * Поведение страницы, общее для всех блоков: «Запросить цену» копит позиции
 * и ведёт к форме заявки; якорь на секцию с формой скроллит к самой форме;
 * маска телефона во всех полях type=tel; карта-виджет за «щитом» (.geo__map-shield:
 * колесо мыши над ней прокручивает страницу) — по клику или Enter; значения контактов
 * в карточках — по ширине (после подмены коллтрекингом).
 */
export function initPage(): void {
  (window as Window & { uiScrollToForm?: typeof scrollToForm }).uiScrollToForm = scrollToForm;

  delegate('click', '.js-quote-btn', (btn, e) => {
    e.preventDefault();
    const name = quoteName(btn);
    if (name) addQuoteItem(name);
    scrollToQuoteForm();
  });

  delegate('click', 'a[href^="#"]', (a, e) => {
    const href = a.getAttribute('href') ?? '';
    if (href.length < 2) return;
    const section = document.getElementById(href.slice(1));
    if (!section || !formIn(section)) return;
    if (scrollToForm(section)) {
      e.preventDefault();
      history.replaceState(null, '', href);
    }
  });

  initFitValues();

  delegate('click', '.geo__map-shield', (shield) => unlockMap(shield));
  delegate('keydown', '.geo__map-shield', (shield, e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    unlockMap(shield);
  });

  // маска +7 (___) ___-__-__; иностранный код — свободный ввод
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.type !== 'tel') return;
    const next = maskPhone(el.value);
    if (next === null || next === el.value) return;
    el.value = next;
    try {
      el.setSelectionRange(next.length, next.length);
    } catch {
      /* поле без выделения */
    }
  });
}
