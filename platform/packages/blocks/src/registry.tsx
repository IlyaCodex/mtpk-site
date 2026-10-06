import type { ReactElement } from 'react';
import { Adv } from './blocks/Adv.tsx';
import { BestOffer } from './blocks/BestOffer.tsx';
import { CatalogCta } from './blocks/CatalogCta.tsx';
import { Leadgen } from './blocks/Leadgen.tsx';
import { Partner } from './blocks/Partner.tsx';
import { WhyUs } from './blocks/WhyUs.tsx';

export interface BlockContext {
  /** На странице уже есть блок заявки (маркер leadgen или id="leadgen" в разметке). */
  hasLeadgenBlock: boolean;
}

/**
 * Шорткоды контента: маркер <!--C:имя--> в теле страницы → React-блок.
 * Названия маркеров — те же, что в Astro ([...slug].astro, COMPONENTS).
 */
export const BLOCKS: Record<string, (ctx: BlockContext) => ReactElement> = {
  adv: () => <Adv />,
  'adv-chiller': () => <Adv warranty="12 месяцев" />,
  'adv-12': () => <Adv warranty="12 месяцев" />,
  'why-us': () => <WhyUs />,
  'why-us-12': () => <WhyUs months={12} />,
  'why-us-6': () => <WhyUs months={6} />,
  'catalog-cta': () => <CatalogCta />,
  // Если на странице есть и блок заявки, и блок предложения — у второго свой якорь.
  'best-offer': (ctx) => <BestOffer anchorId={ctx.hasLeadgenBlock ? 'best-offer' : 'leadgen'} />,
  partner: () => <Partner />,
  leadgen: () => <Leadgen />,
};
