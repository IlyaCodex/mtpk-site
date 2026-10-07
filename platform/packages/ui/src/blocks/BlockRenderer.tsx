import type { Block } from '@mtpk/content-model';
import type { RenderContext } from '../context.ts';
import { RawElement } from '../primitives/Html.tsx';
import { enhanceImages } from '../primitives/images-html.ts';
import { Adv } from './Adv.tsx';
import { BestOffer } from './BestOffer.tsx';
import { CatalogCta } from './CatalogCta.tsx';
import { CatalogCards } from './CatalogCards.tsx';
import { CatalogList } from './CatalogList.tsx';
import { CategoryHero } from './CategoryHero.tsx';
import { Leadgen } from './Leadgen.tsx';
import { Lightbox } from './Lightbox.tsx';
import { Partner } from './Partner.tsx';
import { ProductHero } from './ProductHero.tsx';
import { ProductSpec } from './ProductSpec.tsx';
import { Container, Faq, Stats, StyleLink } from './Simple.tsx';
import { WhyUs } from './WhyUs.tsx';

/** Один блок страницы → React-компонент. */
export function BlockView({ block, ctx }: { block: Block; ctx: RenderContext }) {
  switch (block.type) {
    case 'html':
      return <RawElement html={enhanceImages(block.html, ctx.eagerImages)} />;
    case 'text':
      return <>{block.text}</>;
    case 'style':
      return <StyleLink block={block} />;
    case 'container':
      return <Container block={block} render={(children) => <Blocks blocks={children} ctx={ctx} />} />;
    case 'leadgen':
      return <Leadgen />;
    case 'bestOffer':
      return <BestOffer anchorId={ctx.hasLeadgenBlock ? 'best-offer' : 'leadgen'} />;
    case 'catalogCta':
      return <CatalogCta />;
    case 'partner':
      return <Partner />;
    case 'adv':
      return block.warranty ? <Adv warranty={block.warranty} /> : <Adv />;
    case 'whyUs':
      return <WhyUs months={block.months} />;
    case 'productHero':
      return <ProductHero block={block} ctx={ctx} />;
    case 'productSpec':
      return <ProductSpec block={block} />;
    case 'lightbox':
      return <Lightbox label={block.label} total={ctx.lightboxTotal ?? block.total} />;
    case 'catalogList':
      return <CatalogList block={block} ctx={ctx} />;
    case 'catalogCards':
      return <CatalogCards block={block} ctx={ctx} />;
    case 'categoryHero':
      return <CategoryHero block={block} />;
    case 'faq':
      return <Faq block={block} />;
    case 'stats':
      return <Stats block={block} />;
    default:
      return null;
  }
}

/** Содержимое страницы: блоки подряд, без обёрток (DOM как у исходной вёрстки). */
export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: RenderContext }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} ctx={ctx} />
      ))}
    </>
  );
}
