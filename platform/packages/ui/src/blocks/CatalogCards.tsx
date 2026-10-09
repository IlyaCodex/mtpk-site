import type { CatalogCardItem, CatalogCardsBlock } from '@mtpk/content-model';
import type { RenderContext } from '../context.ts';
import { extra, Inline, RawElement } from '../primitives/Html.tsx';
import { SectionHead } from '../primitives/common.tsx';
import { responsiveProps } from '../primitives/images.ts';
import { enhanceImages, topElements } from '../primitives/images-html.ts';
import { isMadeInRussia } from '../catalog/rules.ts';
import { MadeBadge } from './ProductMedia.tsx';

/** Место обложки в сетке каждого вида (для srcset/sizes — см. PLACES). */
export const CARD_COVER_PLACE: Record<CatalogCardsBlock['design'], string> = {
  home: 'equip-card__cover',
  teaser: 'teaser-card__cover',
  lvm: 'catalog-lvm-card__cover',
  lgm: 'catalog-lgm-card__cover',
};

/**
 * Обложка карточки: копии нужной ширины (srcset), ленивая загрузка — кроме
 * первых картинок страницы. Так же оформляются картинки в блоках «HTML как есть».
 */
function Cover({ item, place, eager }: { item: CatalogCardItem; place: string; eager: readonly string[] }) {
  if (!item.image) return null;
  const a = item.imageAttrs ?? {};
  const lazy = a.loading === undefined && a.fetchpriority === undefined && !eager.includes(item.image);
  return (
    <img
      src={item.image}
      alt={item.alt}
      {...(a.srcset === undefined ? responsiveProps(item.image, place) : {})}
      {...(lazy ? { loading: 'lazy', ...(a.decoding === undefined ? { decoding: 'async' } : {}) } : {})}
      {...extra(a, 'img')}
    />
  );
}

/** «Оборудование» на главной: фото (сверху справа — «Сделано в России»), название и кнопка-стрелка. */
function HomeCard({ item, eager }: { item: CatalogCardItem; eager: readonly string[] }) {
  return (
    <a href={item.href} className="equip-card">
      <div className="equip-card__cover">
        <Cover item={item} place={CARD_COVER_PLACE.home} eager={eager} />
        {isMadeInRussia(item.href) && <MadeBadge />}
      </div>
      <div className="equip-card__body">
        <Inline as="h3" className="equip-card__title" html={item.title} />
        <span className="equip-card__go" aria-hidden="true" />
      </div>
    </a>
  );
}

/** Тизер: обложка, название, описание, «Подробнее →» (подкатегории, товары-узлы). */
function TeaserCard({ item, eager }: { item: CatalogCardItem; eager: readonly string[] }) {
  return (
    <a href={item.href} className="teaser-card">
      <div className="teaser-card__cover">
        <Cover item={item} place={CARD_COVER_PLACE.teaser} eager={eager} />
        {isMadeInRussia(item.href) && <MadeBadge />}
      </div>
      <div className="teaser-card__body">
        <Inline as="h3" className="teaser-card__title" html={item.title} />
        {item.caption !== undefined && <Inline as="p" className="teaser-card__caption" html={item.caption} />}
        <Inline className="teaser-card__more" html={`${item.linkText ?? 'Подробнее'} <span class="btn__arrow" aria-hidden="true">→</span>`} />
      </div>
    </a>
  );
}

/** Линейка ЛВМ/ЛГМ: обложка, раздел линейки, название, «Подробнее». */
function LineCard({ item, prefix, eager }: { item: CatalogCardItem; prefix: string; eager: readonly string[] }) {
  return (
    <a href={item.href} className={`${prefix}-card`}>
      <div className={`${prefix}-card__cover`}>
        <Cover item={item} place={`${prefix}-card__cover`} eager={eager} />
      </div>
      <div className={`${prefix}-card__body`}>
        {item.label !== undefined && <Inline as="div" className={`${prefix}-card__category`} html={item.label} />}
        <Inline as="h3" className={`${prefix}-card__title`} html={item.title} />
        <Inline className={`${prefix}-card__action`} html={item.linkText ?? 'Подробнее'} />
      </div>
    </a>
  );
}

/** HTML под сеткой (вводный текст, ссылки): элементы как есть, картинки — как в блоках «HTML как есть». */
function After({ html, ctx }: { html: string; ctx: RenderContext }) {
  return (
    <>
      {topElements(enhanceImages(html, ctx.eagerImages)).map((el, i) => (
        <RawElement key={i} html={el} />
      ))}
    </>
  );
}

/**
 * Карточки каталога: категории, подкатегории или товары страницы — из данных
 * каталога (items заполняет контент-сервис). Четыре вида разметки, как у
 * прежних сеток: главная, тизер, линейки ЛВМ и ЛГМ.
 */
export function CatalogCards({ block, ctx }: { block: CatalogCardsBlock; ctx: RenderContext }) {
  const items = block.items ?? [];
  // в новом разделе ещё нет опубликованных карточек — секции нет
  if (!items.length) return null;
  const eager = ctx.eagerImages ?? [];
  if (block.design === 'home') {
    return (
      <section className="equip" {...extra(block.attrs, 'section')}>
        <div className="container">
          <div className="equip__head">
            <div>
              <Inline as="h2" className="equip__title" html={block.head?.title ?? ''} />
              {block.head?.lead && <Inline as="p" className="equip__lead" html={block.head.lead} />}
            </div>
            {block.more && (
              <a href={block.more.href} className="equip__more">
                <Inline html={block.more.label} />
                <span className="equip__more-icon" aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="equip__grid">
            {items.map((item, i) => (
              <HomeCard key={i} item={item} eager={eager} />
            ))}
          </div>
          {block.after && <After html={block.after} ctx={ctx} />}
        </div>
      </section>
    );
  }
  if (block.design === 'teaser') {
    return (
      <section className="catalog-list" {...extra(block.attrs, 'section')}>
        <div className="container">
          {block.head && <SectionHead head={block.head} />}
          <div className="teaser-grid">
            {items.map((item, i) => (
              <TeaserCard key={i} item={item} eager={eager} />
            ))}
          </div>
          {block.after && <After html={block.after} ctx={ctx} />}
        </div>
      </section>
    );
  }
  const prefix = block.design === 'lvm' ? 'catalog-lvm' : 'catalog-lgm';
  return (
    <section className={prefix} {...extra(block.attrs, 'section')}>
      <div className="container">
        {block.head && <SectionHead head={block.head} />}
        <div className={`${prefix}__grid`}>
          {items.map((item, i) => (
            <LineCard key={i} item={item} prefix={prefix} eager={eager} />
          ))}
        </div>
        {block.after && <After html={block.after} ctx={ctx} />}
      </div>
    </section>
  );
}
