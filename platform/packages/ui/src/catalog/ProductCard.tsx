import type { ProductCard as ProductCardData } from '@mtpk/content-model';
import { extra, Inline } from '../primitives/Html.tsx';
import { ActionLink } from '../primitives/common.tsx';
import { MadeBadge, StockBadge } from '../blocks/ProductMedia.tsx';
import { CompareButton } from './Compare.tsx';

/**
 * Карточка товара в каталоге (.pcard): обложка с бейджами, название,
 * характеристики, «Запросить цену», «Подробнее», «К сравнению».
 */
export function ProductCard({
  card,
  inStock,
  madeInRussia,
  compareUrl,
}: {
  card: ProductCardData;
  inStock: boolean;
  madeInRussia: boolean;
  /** адрес товара для сравнения (если в разделе включено сравнение) */
  compareUrl?: string;
}) {
  return (
    <article
      className="pcard"
      {...extra(card.attrs, 'article')}
      data-stock={inStock ? 'true' : undefined}
    >
      <a href={card.href} className="pcard__cover">
        {card.badge !== undefined && <Inline className="pcard__badge" html={card.badge} />}
        <img src={card.image.src} alt={card.image.alt} {...extra(card.image.attrs, 'img')} />
        {madeInRussia && <MadeBadge />}
        {inStock && <StockBadge />}
      </a>
      <div className="pcard__body">
        <h3 className="pcard__title">
          <a href={card.href} dangerouslySetInnerHTML={{ __html: card.title }} />
        </h3>
        {card.origin !== undefined && <Inline as="div" className="pcard__origin" html={card.origin} />}
        {card.caption !== undefined && <Inline as="p" className="pcard__caption" html={card.caption} />}
        <dl className="pcard__specs">
          {card.specs.map((s, i) => (
            <div className="pcard__spec" key={i}>
              <dt dangerouslySetInnerHTML={{ __html: s.label }} />
              <dd dangerouslySetInnerHTML={{ __html: s.value }} />
            </div>
          ))}
        </dl>
        <div className="pcard__actions">
          {card.actions.map((a, i) => (
            <ActionLink key={i} action={a} />
          ))}
          {compareUrl && <CompareButton url={compareUrl} />}
        </div>
      </div>
    </article>
  );
}
