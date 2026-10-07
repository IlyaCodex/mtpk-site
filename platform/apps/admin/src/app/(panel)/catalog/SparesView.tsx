import Link from 'next/link';
import { Badge, EmptyState, formatDate, LinkButton } from '@/components/ui';
import { buildTree, isProduct, lineage, plain, plural, productsIn, thumbUrl, type CatalogNode, type CatCategory, type TreeNode } from '@/lib/catalog';

const byName = (a: TreeNode, b: TreeNode) => a.short.localeCompare(b.short, 'ru');

/**
 * Раздел запчастей — пока страницами: разделы («Для дробемётных установок»)
 * → группы («Тельферы и комплектующие») → позиции. Перевод запчастей в
 * данные каталога — следующий этап.
 */
export function SparesView({
  category,
  nodes,
  query,
  site,
}: {
  category: CatCategory;
  nodes: CatalogNode[];
  query: { c?: string; s?: string; g?: string };
  site: string;
}) {
  const { byPath } = buildTree(nodes);
  const hub = byPath.get(category.path);
  if (!hub) return <EmptyState>Раздел запчастей не найден.</EmptyState>;
  const sections = hub.children.filter((n) => !isProduct(n)).sort(byName);
  const section = query.s ? sections.find((n) => n.slug === query.s) : undefined;
  const groups = (section?.children ?? []).filter((n) => !isProduct(n) && n.products > 0).sort(byName);
  const group = section && query.g ? groups.find((n) => n.slug === query.g) : undefined;
  const scope = group ?? section ?? hub;
  const products = productsIn(scope);
  const c = category.path.split('/').filter(Boolean).pop();
  const where = (p: TreeNode) => {
    const chain = lineage(p);
    return chain.slice(chain.indexOf(scope) + 1, -1).map((n) => n.short).join(' / ');
  };

  return (
    <>
      <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Где в каталоге">
        <Link href="/catalog" className="hover:text-brand-600">
          Каталог
        </Link>
        <span className="text-slate-300">/</span>
        {section ? (
          <Link href={`/catalog?c=${c}`} className="hover:text-brand-600">
            {plain(category.name)}
          </Link>
        ) : (
          <span className="text-slate-800">{plain(category.name)}</span>
        )}
        {section && (
          <>
            <span className="text-slate-300">/</span>
            {group ? (
              <Link href={`/catalog?c=${c}&s=${section.slug}`} className="hover:text-brand-600">
                {section.short}
              </Link>
            ) : (
              <span className="text-slate-800">{section.short}</span>
            )}
          </>
        )}
        {group && (
          <>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800">{group.short}</span>
          </>
        )}
      </nav>

      <section className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-slate-900">{scope === hub ? plain(category.name) : scope.short}</h1>
          <p className="text-xs text-slate-500">Запчасти пока правятся как страницы: откройте позицию или раздел и измените тексты, фото и таблицы.</p>
        </div>
        <LinkButton size="sm" href={`/catalog/${scope.id}`}>
          Изменить страницу
        </LinkButton>
        <a href={`${site}${scope.path}`} target="_blank" rel="noopener" className="text-xs text-brand-600 hover:underline">
          на сайте ↗
        </a>
      </section>

      {!section && (
        <div className="mb-6 flex flex-wrap gap-2">
          {sections.map((n) => (
            <Link key={n.id} href={`/catalog?c=${c}&s=${n.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-xs hover:border-brand-300 hover:text-brand-700">
              {n.short} <span className="text-slate-400">{n.products}</span>
            </Link>
          ))}
        </div>
      )}
      {section && !group && groups.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {groups.map((n) => (
            <Link key={n.id} href={`/catalog?c=${c}&s=${section.slug}&g=${n.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-xs hover:border-brand-300 hover:text-brand-700">
              {n.short} <span className="text-slate-400">{n.products}</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold text-slate-700">
        {products.length} {plural(products.length, 'позиция', 'позиции', 'позиций')}
      </h2>
      {products.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="w-20 px-4 py-2.5 font-medium">Фото</th>
                <th className="px-4 py-2.5 font-medium">Позиция</th>
                <th className="px-4 py-2.5 font-medium">Где</th>
                <th className="px-4 py-2.5 font-medium">Статус</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Изменена</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                      {p.image ? <img src={thumbUrl(p.image)!} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-slate-400">нет</span>}
                    </div>
                  </td>
                  <td className="max-w-xl px-4 py-2">
                    <Link href={`/catalog/${p.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {p.short}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-600">{where(p)}</td>
                  <td className="px-4 py-2">{p.status === 'published' ? <Badge tone="green">На сайте</Badge> : <Badge tone="amber">Черновик</Badge>}</td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-500">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <LinkButton size="sm" href={`/catalog/${p.id}`}>
                      Изменить
                    </LinkButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>Позиций нет.</EmptyState>
      )}
    </>
  );
}
