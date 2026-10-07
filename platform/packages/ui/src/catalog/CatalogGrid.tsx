import type { CatalogFilter as FilterData, ProductCard as CardData } from '@mtpk/content-model';
import { detectFilterKeys, FILTER_DEFS, pluralizeModels } from './rules.ts';
import { ProductCard } from './ProductCard.tsx';

/** Фильтр, построенный по data-атрибутам карточек (известные характеристики). */
function autoFilter(cards: CardData[]): FilterData | null {
  if (cards.length < 2) return null;
  const keys = detectFilterKeys(cards);
  if (!keys.length) return null;
  return {
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
 * данных не задан — строится автоматически по характеристикам карточек.
 * Выбор значений и скрытие карточек — клиентский модуль catalog-filter.
 */
export function CatalogGrid({ filter, cards, gridAttrs }: { filter?: FilterData; cards: GridCard[]; gridAttrs?: Record<string, unknown> }) {
  const auto = filter ? null : autoFilter(cards.map((c) => c.card));
  const f = filter ?? auto;
  return (
    <>
      {f && (
        <form className="catalog-filter" aria-label={f.ariaLabel} data-cf-form="" data-cf-auto={auto ? '' : undefined}>
          {f.dropdowns.map((d) => (
            <div className="cf-dropdown" data-cf-dropdown="" data-cf-key={d.key} key={d.key}>
              <button type="button" className="cf-trigger" aria-haspopup="listbox" aria-expanded="false" data-cf-trigger="">
                <span className="cf-trigger__label" dangerouslySetInnerHTML={{ __html: d.label }} />
                <span className="cf-trigger__value" data-cf-value="">
                  {d.anyLabel}
                </span>
                <span className="cf-trigger__chevron" aria-hidden="true" />
              </button>
              <div className="cf-panel" role="listbox" aria-label={d.panelLabel}>
                {[{ value: '', label: d.anyLabel, text: d.anyText, meta: undefined }, ...d.options].map((o) => (
                  <button
                    type="button"
                    className="cf-option"
                    role="option"
                    aria-selected={o.value === '' ? 'true' : 'false'}
                    data-cf-option=""
                    data-value={o.value}
                    data-label={o.label}
                    key={o.value || '*'}
                  >
                    <span dangerouslySetInnerHTML={{ __html: o.text }} />
                    {o.meta !== undefined && <span className="cf-option__meta" dangerouslySetInnerHTML={{ __html: o.meta }} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="catalog-filter__spacer" />
          {(auto || f.count) && (
            <div className="catalog-filter__count" data-cf-count="" aria-live="polite">
              {pluralizeModels(cards.length)}
            </div>
          )}
          <button type="button" className="catalog-filter__reset" aria-label="Сбросить фильтр" data-cf-reset="">
            {RESET_ICON} Сбросить
          </button>
        </form>
      )}
      <div className="pcard-grid" {...gridAttrs}>
        {cards.map((c, i) => (
          <ProductCard key={i} {...c} />
        ))}
      </div>
    </>
  );
}
