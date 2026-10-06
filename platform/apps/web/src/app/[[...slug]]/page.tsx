import { notFound } from 'next/navigation';
import { pageHasLeadgen, type Block } from '@mtpk/content-model';
import { Blocks, CompareBar, PageEnhancements, type RenderContext } from '@mtpk/ui';
import { getPage, getSiteData } from '@/lib/content';
import { slugToPath } from '@/lib/site';

/**
 * Любая страница сайта: содержимое — список блоков из контент-сервиса,
 * каждый блок рендерит свой React-компонент (@mtpk/ui/src/blocks).
 */
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const path = slugToPath((await params).slug);
  const [page, site] = await Promise.all([getPage(path), getSiteData()]);
  if (!page || page.kind !== 'page') notFound();

  const blocks = page.blocks as Block[];
  const ctx: RenderContext = {
    path,
    stock: site.stock,
    compareSections: site.compareSections,
    hasLeadgenBlock: pageHasLeadgen(blocks),
  };
  return (
    <>
      <main>
        <Blocks blocks={blocks} ctx={ctx} />
      </main>
      <PageEnhancements compareSections={site.compareSections} />
      <CompareBar />
    </>
  );
}
