import type { ProductHeroBlock } from '@mtpk/content-model';
import { priceHtml } from '@mtpk/content-kit/stock';
import { Inline, RawElement } from '../primitives/Html.tsx';
import { ActionLink, Breadcrumbs } from '../primitives/common.tsx';
import { CompareButton } from '../catalog/Compare.tsx';
import { isMadeInRussia, productSlug } from '../catalog/rules.ts';
import { sectionOf, type RenderContext } from '../context.ts';
import { ProductMedia } from './ProductMedia.tsx';

/** Кнопка заявки: при показанной цене — «Оставить заявку», как в карточках «Наличия». */
const ASK_PRICE = /^Запросить(?:\s|&nbsp;)+цену$/;

/**
 * Карточка товара (первый экран страницы модели): крошки, фото с галереей,
 * название, статус и цена, ключевые характеристики, кнопки, факты.
 * Позиция на складе — статус «В наличии · отгрузка…» и бейдж на фото; у позиции с ценой
 * (админка «Наличие на складе») — её цена. Иначе — цена товара (поле «Цена, ₽» в его карточке),
 * крупно, с пояснением рядом («базовая комплектация»); нет цены — надпись «Цена — по запросу».
 */
export function ProductHero({ block, ctx }: { block: ProductHeroBlock; ctx: RenderContext }) {
  const slug = productSlug(ctx.path);
  const stock = slug ? ctx.stock[slug] : undefined;
  // на складе — срок отгрузки вместо срока производства (если статус у товара вообще показан)
  const status = stock && block.status !== undefined ? `В наличии · отгрузка ${stock.shipping || 'от 1 рабочего дня'}` : block.status;
  const offer = stock?.offer;
  const stockPrice = offer ? priceHtml(offer.price, offer.priceFrom) : undefined;
  const ownPrice = stockPrice ? undefined : priceHtml(block.amount, block.amountFrom);
  const compare = ctx.compareSections.includes(sectionOf(ctx.path));
  return (
    <section className="phero" data-stock={stock ? 'true' : undefined}>
      <div className="container">
        <Breadcrumbs items={block.breadcrumbs} className="breadcrumb breadcrumb--light" />
        <div className="phero__grid">
          <ProductMedia media={block.media} madeInRussia={isMadeInRussia(ctx.path)} inStock={Boolean(stock)} />
          <div className="phero__info">
            {block.origin !== undefined && <Inline as="div" className="phero__origin" html={block.origin} />}
            <Inline as="h1" className="phero__title" html={block.title} />
            <div className="phero__status-row">
              {status !== undefined && <Inline className="phero__status" html={status} />}
              {stockPrice ? (
                <span className="phero__price phero__price--value">
                  <Inline className="phero__price-amount" html={stockPrice} />
                  {offer?.priceNote && <span className="phero__price-note">{offer.priceNote}</span>}
                </span>
              ) : ownPrice ? (
                <span className="phero__price phero__price--value">
                  <Inline className="phero__price-amount" html={ownPrice} />
                  {block.priceNote && <Inline className="phero__price-note" html={block.priceNote} />}
                </span>
              ) : (
                block.price !== undefined && <Inline className="phero__price" html={block.price} />
              )}
            </div>
            {/* у товаров с описательными свойствами (приборы, расходники) характеристик-чисел нет — свойства в фактах */}
            {block.keyspecs.length > 0 && (
              <div className="phero__keyspecs">
                {block.keyspecs.map((k, i) => (
                  <div className="phero__keyspec" key={i}>
                    <Inline as="div" className="phero__keyspec-num" html={k.num} />
                    <Inline as="div" className="phero__keyspec-label" html={k.label} />
                  </div>
                ))}
              </div>
            )}
            <div className="phero__actions">
              {block.actions.map((a, i) => (
                <ActionLink key={i} action={(stockPrice || ownPrice) && ASK_PRICE.test(a.label) ? { ...a, label: 'Оставить заявку' } : a} />
              ))}
              {compare && <CompareButton url={ctx.path} />}
            </div>
            <ul className="phero__facts">
              {block.facts.map((f, i) => (
                <li key={i}>
                  <RawElement html={f.icon} />
                  <Inline html={f.text} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
