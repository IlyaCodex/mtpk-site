import { STOCK_KINDS, type StockItemView, type StockListBlock, type StockShowcaseBlock } from '@mtpk/content-model';
import type { RenderContext } from '../context.ts';
import { extra, Inline } from '../primitives/Html.tsx';
import { SectionHead, withArrow } from '../primitives/common.tsx';
import { responsiveProps } from '../primitives/images.ts';
import { isMadeInRussia } from '../catalog/rules.ts';
import { MadeBadge } from './ProductMedia.tsx';

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
/** «12 позиций» — число и слово в нужной форме. */
export const stockPositions = (n: number) => `${n}&nbsp;${plural(n, 'позиция', 'позиции', 'позиций')}`;

/** Адрес склада с фильтром по типу: страница сама выберет кнопку типа и прокрутит к списку. */
export const stockTypeHref = (list: string, key: string) => `${list}?type=${encodeURIComponent(key)}#stock-list`;

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const Chevron = ({ dir }: { dir: -1 | 1 }) => (
  <svg viewBox="0 0 24 24" {...ICON} strokeWidth={2.2}>
    <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

/** Грузовик — в стиле линий Solar (1.5). */
const Truck = () => (
  <svg viewBox="0 0 24 24" {...ICON} strokeWidth={1.5}>
    <path d="M2.5 6.5h11v10h-11z" />
    <path d="M13.5 10h4l3.5 3.5v3h-7.5" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17.5" cy="18" r="1.8" />
  </svg>
);

/** «На весь экран» — четыре уголка (Solar maximize). */
const Expand = () => (
  <svg viewBox="0 0 24 24" {...ICON}>
    <path d="M4 9V7c0-1.7 1.3-3 3-3h2M15 4h2c1.7 0 3 1.3 3 3v2M20 15v2c0 1.7-1.3 3-3 3h-2M9 20H7c-1.7 0-3-1.3-3-3v-2" />
  </svg>
);

const Camera = () => (
  <svg viewBox="0 0 24 24" {...ICON} strokeWidth={1.5}>
    <circle cx="12" cy="13" r="3" />
    <path d="M9.8 21h4.4c3.1 0 4.7 0 5.8-.7.5-.3.9-.7 1.2-1.2.8-1.1.8-2.6.8-5.7s0-4.6-.8-5.7c-.3-.5-.7-.9-1.2-1.2-.7-.5-1.6-.6-3-.7-.7 0-1.2-.5-1.4-1.1C15.5 3.7 14.6 3 13.6 3h-3.2c-1 0-1.9.7-2.1 1.6-.1.6-.7 1.1-1.3 1.1-1.4.1-2.3.2-3 .7-.5.3-.9.7-1.2 1.2C2 8.8 2 10.3 2 13.4s0 4.6.8 5.7c.3.5.7.9 1.2 1.2 1.1.7 2.7.7 5.8.7z" />
  </svg>
);

/**
 * Склад на главной: вкладки разделов (оборудование, запчасти), под ними —
 * карусель карточек типов: фото, название, «Смотреть позиции» (на страницу
 * склада с фильтром по типу). Без скрипта лента листается прокруткой;
 * вкладки и стрелки оживляет клиентский модуль stock.
 */
export function StockShowcase({ block, ctx }: { block: StockShowcaseBlock; ctx: RenderContext }) {
  const groups = block.groups ?? [];
  // на складе пусто — секции нет
  if (!groups.length) return null;
  const kinds = STOCK_KINDS.filter((k) => groups.some((g) => g.kind === k));
  const eager = ctx.eagerImages ?? [];
  return (
    <section className="stock-show" aria-label="Склад и оперативные поставки" {...extra(block.attrs, 'section')}>
      <div className="container">
        <div className="stock-show__head">
          {block.head.eyebrow !== undefined && <Inline as="div" className="stock-show__eyebrow" html={block.head.eyebrow} />}
          <Inline as="h2" className="stock-show__title" html={block.head.title} />
          {block.head.lead !== undefined && <Inline as="p" className="stock-show__lead" html={block.head.lead} />}
        </div>
        <div className="stock-show__bar">
          <div className="stock-show__tabs" role="tablist" aria-label="Раздел склада">
            {kinds.map((k, i) => (
              <button
                key={k}
                type="button"
                role="tab"
                id={`stock-tab-${k}`}
                className="stock-show__tab"
                aria-selected={i === 0}
                aria-controls={`stock-panel-${k}`}
                tabIndex={i === 0 ? 0 : -1}
                data-kind={k}
                dangerouslySetInnerHTML={{ __html: block.tabs[k] }}
              />
            ))}
          </div>
          <div className="stock-show__arrows">
            <button type="button" className="stock-show__arrow" data-dir="-1" aria-label="Предыдущие карточки">
              <Chevron dir={-1} />
            </button>
            <button type="button" className="stock-show__arrow" data-dir="1" aria-label="Следующие карточки">
              <Chevron dir={1} />
            </button>
          </div>
        </div>
        {kinds.map((k, i) => (
          <div key={k} className="stock-show__panel" role="tabpanel" id={`stock-panel-${k}`} aria-labelledby={`stock-tab-${k}`} data-kind={k} hidden={i > 0}>
            <ul className="stock-show__track">
              {groups
                .filter((g) => g.kind === k)
                .map((g) => (
                  <li key={g.key} className="stock-show__item">
                    <a className="stock-type" href={stockTypeHref(block.listHref, g.key)}>
                      <div className="stock-type__cover">
                        {g.image && (
                          <img
                            src={g.image}
                            {...responsiveProps(g.image, 'stock-type__cover')}
                            alt=""
                            {...(eager.includes(g.image) ? {} : { loading: 'lazy', decoding: 'async' })}
                          />
                        )}
                      </div>
                      <div className="stock-type__body">
                        <h3 className="stock-type__title" dangerouslySetInnerHTML={{ __html: g.title }} />
                        <span className="stock-type__note" dangerouslySetInnerHTML={{ __html: block.cardNote.replace('{count}', stockPositions(g.count)) }} />
                        <span className="stock-type__link">
                          <span dangerouslySetInnerHTML={{ __html: block.cardLink }} />
                          <span className="stock-type__link-icon" aria-hidden="true" />
                        </span>
                      </div>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {(block.note || block.more) && (
          <div className="stock-show__foot">
            {block.note && (
              <div className="stock-show__note">
                <span className="stock-show__note-icon">
                  <Truck />
                </span>
                <span>
                  <Inline as="span" className="stock-show__note-title" html={block.note.title} />
                  {block.note.text !== undefined && <Inline as="span" className="stock-show__note-text" html={block.note.text} />}
                </span>
              </div>
            )}
            {block.more && <a href={block.more.href} className="stock-show__more" dangerouslySetInnerHTML={{ __html: withArrow(block.more.label, true) }} />}
          </div>
        )}
      </div>
    </section>
  );
}

/** Сколько миниатюр фото со склада видно в карточке (остальные — за «+N», все листаются на весь экран). */
const VISIBLE_PHOTOS = 4;

/**
 * Карточка позиции склада (разметка .pcard — как в каталоге): фото с бейджами,
 * значок «на весь экран» справа вверху, миниатюры фото со склада, название,
 * характеристики, цена (из админки; нет — «по запросу»), количество и срок, «Запросить цену», «Подробнее».
 * Кадры просмотра — фото карточки и фото со склада (data-slide), группа —
 * сама карточка (data-lightbox-group): листаются только её фото.
 */
function StockCard({ item, eager }: { item: StockItemView; eager: readonly string[] }) {
  const href = item.href;
  const image = item.image;
  const meta = [item.qty != null ? `${item.qty}&nbsp;шт.` : '', item.shipping ? `отгрузка ${item.shipping}` : ''].filter(Boolean).join(' · ');
  const more = item.photos.length - VISIBLE_PHOTOS;
  const cover = (
    <>
      {item.badge !== undefined && <Inline className="pcard__badge" html={item.badge} />}
      {image && (
        <img
          src={image.src}
          {...responsiveProps(image.src, 'pcard__cover')}
          alt={image.alt}
          {...(eager.includes(image.src) ? {} : { loading: 'lazy', decoding: 'async' })}
          {...extra(image.attrs, 'img')}
          data-slide=""
          data-full={image.src}
        />
      )}
      {isMadeInRussia(href) && <MadeBadge />}
      <span className="pcard__stock-badge" aria-label="В наличии на складе">
        В наличии
      </span>
    </>
  );
  return (
    <article className="pcard stock-card" data-stock="true" data-type={item.group} data-lightbox-group="">
      {href ? (
        <a href={href} className="pcard__cover">
          {cover}
        </a>
      ) : (
        <div className="pcard__cover">{cover}</div>
      )}
      {(image || item.photos.length > 0) && (
        <button type="button" className="pcard__zoom" data-lightbox-open="" aria-label="Открыть фото на весь экран" title="На весь экран">
          <Expand />
        </button>
      )}
      {item.photos.length > 0 && (
        <div className="pcard__photos">
          <span className="pcard__photos-label">
            <Camera />
            Фото со&nbsp;склада
          </span>
          <span className="pcard__photos-list">
            {item.photos.map((p, i) => (
              <button
                key={i}
                type="button"
                className="pcard__photo"
                data-slide=""
                data-full={p.src}
                data-alt={p.alt || 'Фото со склада'}
                aria-label={`Фото со склада ${i + 1} из ${item.photos.length}`}
                hidden={i >= VISIBLE_PHOTOS}
                {...(i === VISIBLE_PHOTOS - 1 && more > 0 ? { 'data-more': `+${more}` } : {})}
              >
                <img src={p.src} {...responsiveProps(p.src, 'pcard__photo')} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </span>
        </div>
      )}
      <div className="pcard__body">
        <h3 className="pcard__title">
          {href ? <a href={href} dangerouslySetInnerHTML={{ __html: item.title }} /> : <span dangerouslySetInnerHTML={{ __html: item.title }} />}
          {item.titleNote !== undefined && ` ${item.titleNote}`}
        </h3>
        {item.origin !== undefined && <Inline as="div" className="pcard__origin" html={item.origin} />}
        {item.caption !== undefined && <Inline as="p" className="pcard__caption" html={item.caption} />}
        {item.specs.length > 0 && (
          <dl className="pcard__specs">
            {item.specs.map((s, i) => (
              <div className="pcard__spec" key={i}>
                <dt dangerouslySetInnerHTML={{ __html: s.label }} />
                <dd dangerouslySetInnerHTML={{ __html: s.value }} />
              </div>
            ))}
          </dl>
        )}
        {/* цена — одной высоты во всех карточках и прижата к низу: в ряду она на одном уровне */}
        <div className="pcard__price">
          <span className="pcard__price-label">Цена</span>
          <div className="pcard__price-value">
            {item.price ? (
              <Inline className="pcard__price-amount" html={item.price} />
            ) : (
              <span className="pcard__price-amount pcard__price-amount--ask">По&nbsp;запросу</span>
            )}
            {item.price && item.priceNote !== undefined && <Inline className="pcard__price-note" html={item.priceNote} />}
          </div>
          <Inline as="div" className="pcard__stock-meta" html={meta} />
        </div>
        <div className="pcard__actions">
          <a
            href="#leadgen"
            className="btn btn--primary btn--block js-quote-btn"
            dangerouslySetInnerHTML={{ __html: withArrow(item.price ? 'Оставить заявку' : 'Запросить цену', true) }}
          />
          {href ? (
            <a href={href} className="pcard__more" dangerouslySetInnerHTML={{ __html: withArrow('Подробнее о&nbsp;позиции', true) }} />
          ) : (
            // без страницы позиции — пустое место той же высоты: низ карточек в ряду совпадает
            <span className="pcard__more pcard__more--none" aria-hidden="true" />
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Склад на /nalichie/: заголовок ({count} — число позиций), кнопки-фильтры по
 * типам и карточки позиций. Фильтр и выбор типа по ссылке с главной
 * (?type=…) — клиентский модуль stock, фото на весь экран — модуль lightbox.
 */
export function StockList({ block, ctx }: { block: StockListBlock; ctx: RenderContext }) {
  const items = block.items ?? [];
  const groups = (block.groups ?? []).filter((g) => g.count > 0);
  const eager = ctx.eagerImages ?? [];
  const head = block.head && { ...block.head, title: block.head.title.replace('{count}', `<span data-stock-count>${stockPositions(items.length)}</span>`) };
  return (
    <section className="catalog-list stock-list" id="stock-list" {...extra(block.attrs, 'section')}>
      <div className="container">
        {head && <SectionHead head={head} />}
        {groups.length > 1 && (
          <div className="stock-filterbar">
            <span className="stock-filterbar__label" aria-hidden="true">
              Тип:
            </span>
            <div className="case__filters stock-filter" role="group" aria-label="Фильтр по типу">
              <button type="button" className="case-filter is-active" data-type="" aria-pressed="true">
                <Inline html={block.allLabel} /> ({items.length})
              </button>
              {groups.map((g) => (
                <button key={g.key} type="button" className="case-filter" data-type={g.key} aria-pressed="false">
                  <Inline html={g.title} /> ({g.count})
                </button>
              ))}
            </div>
          </div>
        )}
        {items.length > 0 ? (
          <div className="pcard-grid stock-grid">
            {items.map((item, i) => (
              <StockCard key={i} item={item} eager={eager} />
            ))}
          </div>
        ) : (
          <div className="stock-list__empty">
            <Inline as="p" html={block.empty} />
            <a href="#leadgen" className="btn btn--primary" dangerouslySetInnerHTML={{ __html: withArrow('Запросить наличие', true) }} />
          </div>
        )}
      </div>
    </section>
  );
}
