'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CatalogFilter as FilterData, ProductCard as CardData } from '@mtpk/content-model';
import { cardMatches, detectFilterKeys, FILTER_DEFS, pluralizeModels } from './rules.ts';
import { ProductCard } from './ProductCard.tsx';

/** Фильтр, построенный по data-атрибутам карточек (известные характеристики). */
function autoFilter(cards: CardData[]): (FilterData & { auto: true }) | null {
  if (cards.length < 2) return null;
  const keys = detectFilterKeys(cards);
  if (!keys.length) return null;
  return {
    auto: true,
    ariaLabel: 'Фильтр каталога',
    dropdowns: keys.map((key) => {
      const def = FILTER_DEFS[key];
      return {
        key,
        label: `${def.label}:`,
        panelLabel: def.label,
        anyText: `${def.label} — любая`,
        anyLabel: def.anyLabel,
        options: def.ranges.map((r) => ({ value: r.v, label: r.l, text: r.l, meta: r.short })),
      };
    }),
  };
}

const RESET_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export interface GridCard {
  card: CardData;
  inStock: boolean;
  madeInRussia: boolean;
  compareUrl?: string;
}

/**
 * Сетка карточек каталога с фильтром по характеристикам: выпадающие списки,
 * диапазоны («до N», «N–M», «от M»), сброс, счётчик моделей. Если фильтр в
 * данных не задан — строится автоматически (мощность, масса, производительность).
 */
export function CatalogGrid({ filter, cards, gridAttrs }: { filter?: FilterData; cards: GridCard[]; gridAttrs?: Record<string, unknown> }) {
  const [auto, setAuto] = useState<ReturnType<typeof autoFilter>>(null);
  const [active, setActive] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  // Автофильтр появляется после загрузки — как и раньше (у страниц без готового фильтра)
  useEffect(() => {
    if (!filter) setAuto(autoFilter(cards.map((c) => c.card)));
  }, [filter, cards]);

  useEffect(() => {
    if (open === null) return;
    const close = () => setOpen(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const f = filter ?? auto;
  const visible = useMemo(() => cards.map((c) => cardMatches(c.card.attrs, active)), [cards, active]);
  const shown = visible.filter(Boolean).length;

  return (
    <>
      {f && (
        <form className="catalog-filter" aria-label={f.ariaLabel} data-filter-form="" onSubmit={(e) => e.preventDefault()}>
          {f.dropdowns.map((d) => {
            const value = active[d.key] ?? '';
            const selected = d.options.find((o) => o.value === value);
            return (
              <div className={open === d.key ? 'cf-dropdown is-open' : 'cf-dropdown'} data-cf-dropdown="" data-cf-key={d.key} key={d.key}>
                <button
                  type="button"
                  className={value ? 'cf-trigger is-active' : 'cf-trigger'}
                  aria-haspopup="listbox"
                  aria-expanded={open === d.key ? 'true' : 'false'}
                  data-cf-trigger=""
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(open === d.key ? null : d.key);
                  }}
                >
                  <span className="cf-trigger__label" dangerouslySetInnerHTML={{ __html: d.label }} />
                  <span className="cf-trigger__value" data-cf-value="">
                    {selected ? selected.label : d.anyLabel}
                  </span>
                  <span className="cf-trigger__chevron" aria-hidden="true" />
                </button>
                <div className="cf-panel" role="listbox" aria-label={d.panelLabel}>
                  {[{ value: '', label: d.anyLabel, text: d.anyText, meta: undefined }, ...d.options].map((o) => (
                    <button
                      type="button"
                      className="cf-option"
                      role="option"
                      aria-selected={o.value === value ? 'true' : 'false'}
                      data-cf-option=""
                      data-value={o.value}
                      data-label={o.label}
                      key={o.value || '*'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActive({ ...active, [d.key]: o.value });
                        setOpen(null);
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: o.text }} />
                      {o.meta !== undefined && <span className="cf-option__meta" dangerouslySetInnerHTML={{ __html: o.meta }} />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="catalog-filter__spacer" />
          {'auto' in f && (
            <div className="catalog-filter__count" data-cf-count="" aria-live="polite">
              {pluralizeModels(shown)}
            </div>
          )}
          <button type="button" className="catalog-filter__reset" aria-label="Сбросить фильтр" data-cf-reset="" onClick={() => setActive({})}>
            {RESET_ICON} Сбросить
          </button>
        </form>
      )}
      <div className="pcard-grid" {...gridAttrs}>
        {cards.map((c, i) => (
          <ProductCard key={i} {...c} hidden={!visible[i]} />
        ))}
      </div>
    </>
  );
}
