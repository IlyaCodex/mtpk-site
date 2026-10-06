import { cardMatches, pluralizeModels } from '@mtpk/ui/rules';
import { $, $$ } from './dom';

/** data-атрибуты карточки — по ним фильтр сравнивает характеристики. */
function cardAttrs(card: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of Array.from(card.attributes)) if (a.name.startsWith('data-')) out[a.name] = a.value;
  return out;
}

/**
 * Фильтр каталога: выпадающие списки характеристик (диапазоны «до N», «N–M»,
 * «от M»), сброс, счётчик моделей. Карточки, не подходящие под выбор, скрываются.
 */
function initFilter(form: HTMLFormElement): void {
  const grid = form.parentElement?.querySelector<HTMLElement>('.pcard-grid');
  if (!grid) return;
  const cards = $$<HTMLElement>('.pcard', grid).map((el) => ({ el, attrs: cardAttrs(el) }));
  const count = $('[data-cf-count]', form);
  const active: Record<string, string> = {};

  const closeAll = (except?: Element) => {
    for (const d of $$('[data-cf-dropdown].is-open', form)) {
      if (d === except) continue;
      d.classList.remove('is-open');
      $('[data-cf-trigger]', d)?.setAttribute('aria-expanded', 'false');
    }
  };
  const apply = () => {
    let shown = 0;
    for (const c of cards) {
      const ok = cardMatches(c.attrs, active);
      c.el.hidden = !ok;
      c.el.style.display = ok ? '' : 'none';
      if (ok) shown++;
    }
    if (count) count.textContent = pluralizeModels(shown);
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const trigger = target?.closest('[data-cf-trigger]');
    const option = target?.closest<HTMLElement>('[data-cf-option]');
    const dropdown = target?.closest<HTMLElement>('[data-cf-dropdown]');
    if (target?.closest('[data-cf-reset]')) {
      for (const k of Object.keys(active)) delete active[k];
      for (const d of $$('[data-cf-dropdown]', form)) {
        const any = $('[data-cf-option][data-value=""]', d);
        const value = $('[data-cf-value]', d);
        if (value && any) value.textContent = any.dataset.label ?? '';
        $('[data-cf-trigger]', d)?.classList.remove('is-active');
        $$('[data-cf-option]', d).forEach((o) => o.setAttribute('aria-selected', o.dataset.value === '' ? 'true' : 'false'));
      }
      closeAll();
      return apply();
    }
    if (trigger && dropdown) {
      e.stopPropagation();
      const open = !dropdown.classList.contains('is-open');
      closeAll(dropdown);
      dropdown.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    if (option && dropdown) {
      e.stopPropagation();
      const key = dropdown.dataset.cfKey ?? '';
      const value = option.dataset.value ?? '';
      active[key] = value;
      const valueEl = $('[data-cf-value]', dropdown);
      if (valueEl) valueEl.textContent = option.dataset.label ?? '';
      $('[data-cf-trigger]', dropdown)?.classList.toggle('is-active', Boolean(value));
      $$('[data-cf-option]', dropdown).forEach((o) => o.setAttribute('aria-selected', o === option ? 'true' : 'false'));
      closeAll();
      apply();
    }
  });
  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAll());
}

for (const form of $$<HTMLFormElement>('form[data-cf-form]')) initFilter(form);
