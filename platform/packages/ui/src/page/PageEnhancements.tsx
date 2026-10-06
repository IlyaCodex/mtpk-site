'use client';

import { useEffect } from 'react';
import { readCompare, subscribeCompare, toggleCompare } from '../catalog/compare-store.ts';
import { maskPhone } from '../forms/phone.ts';
import { addQuoteItem, clearQuoteItems, getQuoteItems, mergeTaskText, subscribeQuote } from '../forms/quote-store.ts';

/** Формы заявок: React-формы и старые из блоков «HTML как есть» — у всех есть data-form. */
const LEAD_FORM = 'form[data-form]';
/** Старые формы (обрабатывает public/js/forms.js). */
const LEGACY_FORM = 'form.js-lead-form';

function headerOffset(): number {
  const h = document.querySelector<HTMLElement>('.header-shell');
  return (h ? h.offsetHeight : 0) + 16;
}

function formIn(section: Element | null): HTMLFormElement | null {
  if (!section) return null;
  return section.matches(LEAD_FORM) ? (section as HTMLFormElement) : section.querySelector<HTMLFormElement>(LEAD_FORM);
}

/**
 * Скролл к форме заявки внутри секции — не к началу секции: у секций длинный
 * вводный текст, и форма уезжала бы за край экрана. Поправка на липкую шапку,
 * фокус на первое поле. true — форма найдена.
 */
export function scrollToForm(section: Element | null): boolean {
  const form = formIn(section);
  if (!form) return false;
  const y = form.getBoundingClientRect().top + window.scrollY - headerOffset();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'instant' : 'smooth' });
  form
    .querySelector<HTMLElement>('input:not([type="hidden"]):not([aria-hidden="true"]),textarea,select,button')
    ?.focus({ preventScroll: true });
  return true;
}

/** Название позиции для «Запросить цену»: заголовок карточки или страницы товара. */
function quoteName(btn: Element): string {
  const el = btn.closest('.pcard')?.querySelector('.pcard__title') ?? document.querySelector('.phero__title');
  return el?.textContent?.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

function scrollToQuoteForm() {
  const task = document.querySelector(`${LEAD_FORM} textarea[name="task"]`);
  const section = task?.closest('.leadgen') ?? task?.closest('section') ?? document.getElementById('leadgen');
  if (scrollToForm(section ?? null)) return;
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else location.hash = 'leadgen';
}

// ── «К сравнению» в карточках блоков «HTML как есть» ─────────────────────

const CMP_ICON =
  '<svg class="cmp-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M4 8h16M7 8l-3 6h6zM17 8l-3 6h6z"/></svg>';

function paintCompare(btn: HTMLElement, active: boolean) {
  btn.classList.toggle('is-active', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.innerHTML = `${CMP_ICON}<span>${active ? 'В сравнении' : 'К сравнению'}</span>`;
}

function cardUrl(card: Element): string {
  const a = card.querySelector('.pcard__title a, a.pcard__cover, a[href^="/products/"]');
  let href = a?.getAttribute('href') ?? '';
  if (!href) return '';
  if (!href.startsWith('/')) href = location.pathname.replace(/[^/]*$/, '') + href;
  return href.replace(/\/?$/, '/');
}

/** Кнопки сравнения в карточках, которые не рендерит React (у React-карточек они уже есть). */
function mountLegacyCompare(sections: string[]): () => void {
  const path = location.pathname.replace(/\/?$/, '/');
  if (!sections.includes(path)) return () => {};
  const buttons: HTMLElement[] = [];
  const selected = () => readCompare()?.items ?? [];
  for (const card of document.querySelectorAll('.pcard')) {
    if (card.querySelector('[data-compare]')) continue;
    const url = cardUrl(card);
    const box = card.querySelector('.pcard__actions') ?? card.querySelector('.pcard__body');
    if (!url || !box) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cmp-btn';
    btn.dataset.compare = url;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCompare(url);
    });
    paintCompare(btn, selected().includes(url));
    box.appendChild(btn);
    buttons.push(btn);
  }
  if (!buttons.length) return () => {};
  return subscribeCompare(() => {
    const items = selected();
    for (const b of buttons) paintCompare(b, items.includes(b.dataset.compare ?? ''));
  });
}

/**
 * Поведение страницы, общее для всех блоков (перенос quote-form.js,
 * scroll-to-form.js и маски телефона для старых форм):
 *  - «Запросить цену» (.js-quote-btn) копит позиции и ведёт к форме заявки;
 *  - ссылка-якорь на секцию с формой скроллит к самой форме;
 *  - маска телефона в формах блоков «HTML как есть»;
 *  - кнопки «К сравнению» в их карточках.
 */
export function PageEnhancements({ compareSections }: { compareSections: string[] }) {
  useEffect(() => {
    const w = window as Window & { uiScrollToForm?: typeof scrollToForm };
    w.uiScrollToForm = scrollToForm;

    // поля «Задача» старых форм; React-формы подписываются на позиции сами
    const syncLegacyTasks = (items: string[]) => {
      for (const ta of document.querySelectorAll<HTMLTextAreaElement>(`${LEGACY_FORM} textarea[name="task"]`)) {
        ta.value = mergeTaskText(ta.value, items);
      }
    };
    syncLegacyTasks(getQuoteItems());
    const unsubscribeQuote = subscribeQuote(syncLegacyTasks);

    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const quote = target.closest('.js-quote-btn');
      if (quote) {
        e.preventDefault();
        const name = quoteName(quote);
        if (name) addQuoteItem(name);
        scrollToQuoteForm();
        return;
      }
      const a = target.closest('a[href]');
      const href = a?.getAttribute('href') ?? '';
      if (href.length < 2 || !href.startsWith('#')) return;
      const section = document.getElementById(href.slice(1));
      if (!section || !formIn(section)) return;
      if (scrollToForm(section)) {
        e.preventDefault();
        history.replaceState(null, '', href);
      }
    };
    // успешная отправка старой формы → forms.js делает form.reset()
    const onReset = (e: Event) => {
      if (e.target instanceof Element && e.target.matches(LEGACY_FORM)) clearQuoteItems();
    };
    // маска телефона; у React-полей своя, повторное применение ничего не меняет
    const onInput = (e: Event) => {
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
    };
    document.addEventListener('click', onClick);
    document.addEventListener('reset', onReset);
    document.addEventListener('input', onInput);
    const unmountCompare = mountLegacyCompare(compareSections);
    return () => {
      unsubscribeQuote();
      unmountCompare();
      document.removeEventListener('click', onClick);
      document.removeEventListener('reset', onReset);
      document.removeEventListener('input', onInput);
    };
  }, [compareSections]);

  return null;
}
