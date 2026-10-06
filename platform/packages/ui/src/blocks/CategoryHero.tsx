import type { CategoryHeroBlock } from '@mtpk/content-model';
import { extra, Inline } from '../primitives/Html.tsx';
import { ActionLink, Breadcrumbs } from '../primitives/common.tsx';
import { FormStatus, LeadForm, PhoneInput, SubmitButton } from '../forms/LeadForm.tsx';
import { ARROW } from '../forms/constants.ts';

type QuickCard = NonNullable<CategoryHeroBlock['quickCard']>;

/** Карточка «Экспресс-заявка»: телефон + согласие, перезвон за 10 минут. */
function QuickLeadCard({ card }: { card: QuickCard }) {
  return (
    <div className="hero-quick-card" id={card.id}>
      <Inline as="div" className="hero-quick-card__badge" html={card.badge} />
      <Inline as="h2" className="hero-quick-card__title" html={card.title} />
      <Inline as="p" className="hero-quick-card__subtitle" html={card.subtitle} />
      <LeadForm className="hero-quick-card__form" formName={card.formName}>
        <input type="text" name="hp_token" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <input type="hidden" name="form_ts" className="js-form-ts" />
        <input type="hidden" name="source" className="js-form-source" />
        <PhoneInput
          name="phone"
          className="hero-quick-card__input"
          placeholder="+7 (___) ___-__-__"
          required
          autoComplete="tel"
          aria-label={card.phoneLabel}
        />
        <SubmitButton className="btn btn--primary hero-quick-card__btn" html={`${card.buttonLabel} ${ARROW}`} />
        <label className="hero-quick-card__consent">
          <input type="checkbox" name="consent" defaultValue="v2026.1" required />
          <span dangerouslySetInnerHTML={{ __html: card.consent }} />
        </label>
        <FormStatus />
      </LeadForm>
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
