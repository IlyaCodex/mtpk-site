import { notFound } from 'next/navigation';
import { getPage } from '@/lib/content';
import { slugToPath } from '@/lib/site';

/**
 * Любая страница сайта: содержимое <main> приходит из контент-сервиса готовым
 * HTML (блоки-шорткоды уже развёрнуты React-компонентами @mtpk/blocks).
 */
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const path = slugToPath((await params).slug);
  const page = await getPage(path);
  if (!page || page.kind !== 'page') notFound();
  // suppressHydrationWarning: сырой HTML контента браузер нормализует (например
  // <style is:global> → is:global=""), сверять его при гидратации бессмысленно
  return <main suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />;
}
