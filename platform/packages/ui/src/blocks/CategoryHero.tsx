import type { CategoryHeroBlock } from '@mtpk/content-model';
import { extra, Inline } from '../primitives/Html.tsx';
import { ActionLink, Breadcrumbs } from '../primitives/common.tsx';
import { ExpressForm } from '../forms/ExpressForm.tsx';

type QuickCard = NonNullable<CategoryHeroBlock['quickCard']>;

/** Карточка «Экспресс-заявка»: телефон + согласие, перезвон за 10 минут. */
function QuickLeadCard({ card }: { card: QuickCard }) {
  return (
    <div className="hero-quick-card" id={card.id}>
      <Inline as="div" className="hero-quick-card__badge" html={card.badge} />
      <Inline as="h2" className="hero-quick-card__title" html={card.title} />
      <Inline as="p" className="hero-quick-card__subtitle" html={card.subtitle} />
      <ExpressForm formName={card.formName} buttonLabel={card.buttonLabel} consent={card.consent} phoneLabel={card.phoneLabel} />
    </div>
  );
}

/**
 * Обложка раздела или категории каталога: фото-фон, крошки, заголовок,
 * кнопки и карточка экспресс-заявки справа.
 */
export function CategoryHero({ block }: { block: CategoryHeroBlock }) {
  const body = (
    <div className="cat-hero__body">
      {block.eyebrow !== undefined && <Inline as={block.eyebrowTag} className="cat-hero__eyebrow" html={block.eyebrow} />}
      <Inline as="h1" className="cat-hero__title" html={block.title} />
      <Inline as="p" className="cat-hero__subtitle" html={block.subtitle} />
      {block.actions && (
        <div className="cat-hero__actions">
          {block.actions.map((a, i) => (
            <ActionLink key={i} action={a} />
          ))}
        </div>
      )}
    </div>
  );
  return (
    <section className="cat-hero">
      <div className="cat-hero__image" {...extra(block.imageAttrs, 'div')} />
      <div className="cat-hero__overlay" />
      <div className="container cat-hero__content">
        <Breadcrumbs items={block.breadcrumbs} />
        {block.quickCard ? (
          <div className="cat-hero__grid">
            {body}
            <div className="cat-hero__aside">
              <QuickLeadCard card={block.quickCard} />
            </div>
          </div>
        ) : (
          body
        )}
      </div>
    </section>
  );
}
