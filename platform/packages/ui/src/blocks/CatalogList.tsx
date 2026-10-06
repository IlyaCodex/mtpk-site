import type { CatalogListBlock } from '@mtpk/content-model';
import { extra } from '../primitives/Html.tsx';
import { SectionHead } from '../primitives/common.tsx';
import { CatalogGrid, type GridCard } from '../catalog/CatalogGrid.tsx';
import { isMadeInRussia, productSlug } from '../catalog/rules.ts';
import type { RenderContext } from '../context.ts';

/** Абсолютный адрес товара карточки (в листинге бывают относительные ссылки). */
function absolute(href: string, page: string): string {
  const url = href.startsWith('/') ? href : page.replace(/[^/]*$/, '') + href;
  return url.replace(/\/?$/, '/');
}

/** Каталог раздела: заголовок, фильтр по характеристикам, сетка карточек. */
export function CatalogList({ block, ctx }: { block: CatalogListBlock; ctx: RenderContext }) {
  const compare = ctx.compareSections.includes(ctx.path);
  const cards: GridCard[] = block.cards.map((card) => {
    const url = absolute(card.href, ctx.path);
    const slug = productSlug(url);
    return {
      card,
      inStock: Boolean(slug && ctx.stock[slug]),
      madeInRussia: isMadeInRussia(url),
      compareUrl: compare ? url : undefined,
    };
  });
  return (
    <section className="catalog-list" {...extra(block.attrs, 'section')}>
      <div className="container">
        {block.head && <SectionHead head={block.head} />}
        <CatalogGrid filter={block.filter} cards={cards} gridAttrs={extra(block.gridAttrs, 'div')} />
      </div>
    </section>
  );
}
