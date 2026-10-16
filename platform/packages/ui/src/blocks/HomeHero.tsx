import type { ActiveHoliday, HomeHeroBlock } from '@mtpk/content-model';
import { FormSlot } from '../forms/FormSlot.tsx';
import { Inline } from '../primitives/Html.tsx';
import { ActionLink } from '../primitives/common.tsx';
import { responsive } from '../primitives/images.ts';

/** Мастер-копии праздничных баннеров — 2560 px по ширине: крупнее копий медиасервиса (до 1920). */
const HOLIDAY_MASTER_WIDTH = 2560;

/** srcset и sizes праздничного баннера — одни и те же у <img> и у предзагрузки в <head>. */
export function holidayImageHints(image: string): { href: string; srcSet?: string; sizes?: string } {
  const set = responsive(image, 'hero__holiday-img');
  return set ? { href: image, srcSet: `${set.srcSet}, ${image} ${HOLIDAY_MASTER_WIDTH}w`, sizes: set.sizes } : { href: image };
}

/** Быстрые переходы к основным направлениям — «таблетки» с зелёной точкой под кнопками. */
function QuickLinks({ links }: { links: HomeHeroBlock['links'] }) {
  if (!links?.length) return null;
  return (
    <nav className="hero__links" aria-label="Быстрые переходы">
      {links.map((l, i) => (
        <a key={i} className="hero__link" href={l.href}>
          <Inline html={l.label} />
        </a>
      ))}
    </nav>
  );
}

/** Ссылка-подсказка внизу обложки: к каталогу. */
function ScrollHint() {
  return (
    <a href="#catalog" className="hero__scroll" title={'Перейти к каталогу оборудования'}>
      <span>Каталог оборудования</span>
      <svg className="hero__scroll-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    </a>
  );
}

/**
 * Праздничный вид обложки: баннер праздника во весь экран (подпись — справа,
 * текст — слева на тёмном поле баннера), поздравление крупно, подпись
 * компании, кнопки обложки. Карточки экспресс-заявки нет — она закрыла бы
 * сюжет баннера (звонок — в шапке сайта). H1 страницы остаётся прежним для
 * поисковиков и скринридеров, но скрыт: на экране вместо него поздравление.
 * Эффект (снег, искры…) рисует модуль сайта holiday-fx на <canvas>.
 */
function HolidayHero({ block, holiday }: { block: HomeHeroBlock; holiday: ActiveHoliday }) {
  const hints = holidayImageHints(holiday.image);
  return (
    <section className="hero hero--home hero--holiday" data-holiday={holiday.id}>
      <img
        className="hero__holiday-img"
        src={holiday.image}
        {...(hints.srcSet ? { srcSet: hints.srcSet, sizes: hints.sizes } : {})}
        alt=""
        fetchPriority="high"
        decoding="async"
        style={{ objectPosition: holiday.imagePosition }}
      />
      <div className="hero__overlay" />
      {holiday.effect !== 'none' && <canvas className="hero__fx" data-fx={holiday.effect} aria-hidden="true" />}
      <div className="container hero__content">
        <div className="hero__grid">
          <div className="hero__left">
            <Inline className="hero__eyebrow" html={holiday.eyebrow} />
            <Inline as="h1" className="hero__h1-hidden" html={block.title} />
            <Inline as="p" className="hero__title hero__greeting" html={holiday.title} />
            <Inline as="p" className="hero__subtitle" html={holiday.text} />
            {holiday.signature.trim() && <p className="hero__signature">{holiday.signature}</p>}
            {block.actions.length > 0 && (
              <div className="hero__actions">
                {block.actions.map((a, i) => (
                  <ActionLink key={i} action={a} />
                ))}
              </div>
            )}
            <QuickLinks links={block.links} />
          </div>
        </div>
      </div>
      <ScrollHint />
    </section>
  );
}

/**
 * Обложка главной: фото (стили .hero__image), заголовок, кнопки и карточка
 * «Экспресс-заявка». Разметка — как у прежней HTML-секции, классы те же.
 * В дни праздника (ctx.holiday) — праздничный вид.
 */
export function HomeHero({ block, holiday }: { block: HomeHeroBlock; holiday?: ActiveHoliday | null }) {
  if (holiday) return <HolidayHero block={block} holiday={holiday} />;
  const card = block.quickCard;
  return (
    <section className="hero hero--home">
      <div className="hero__image" role="img" aria-label={block.imageLabel} />
      <div className="hero__overlay" />
      <div className="container hero__content">
        <div className="hero__grid">
          <div className="hero__left">
            <Inline className="hero__eyebrow" html={block.eyebrow} />
            <Inline as="h1" className="hero__title" html={block.title} />
            <Inline as="p" className="hero__subtitle" html={block.subtitle} />
            {block.actions.length > 0 && (
              <div className="hero__actions">
                {block.actions.map((a, i) => (
                  <ActionLink key={i} action={a} />
                ))}
              </div>
            )}
            <QuickLinks links={block.links} />
          </div>
          {card && (
            <div className="hero__right">
              <div className="hero-quick-card">
                <Inline as="div" className="hero-quick-card__badge" html={card.badge} />
                <Inline as="h2" className="hero-quick-card__title" html={card.title} />
                <Inline as="p" className="hero-quick-card__subtitle" html={card.subtitle} />
                <FormSlot attrs={{ type: 'express', name: card.formName }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <ScrollHint />
    </section>
  );
}
