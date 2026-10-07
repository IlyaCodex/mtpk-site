import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, formatDate, LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { buildTree, isProduct, lineage, productsIn, thumbUrl, type CatalogNode, type TreeNode } from '@/lib/catalog';
import { env } from '@/lib/env';
import { serviceJson } from '@/lib/services';
import { CatalogFilters, type CatalogQuery } from './CatalogFilters';

export const metadata: Metadata = { title: 'Каталог продукции' };

const byName = (a: TreeNode, b: TreeNode) => a.short.localeCompare(b.short, 'ru');

/** Совпадение с поиском: название, короткое название (модель) или адрес. */
function matches(n: TreeNode, q: string): boolean {
  const s = q.toLowerCase().replace(/ё/g, 'е');
  return [n.name, n.short, n.path].some((v) => v.toLowerCase().replace(/ё/g, 'е').includes(s));
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const user = await requireUser('content');
  const sp = await searchParams;
  const nodes = await serviceJson<CatalogNode[]>('content', 'catalog', { user });
  const { root } = buildTree(nodes);
  const site = env().PUBLIC_SITE_URL;
  if (!root) return <EmptyState>Каталог пуст: нет страницы /products/.</EmptyState>;

  // Категории — разделы первого уровня; запчасти — последними
  const categories = root.children.filter((n) => !isProduct(n)).sort((a, b) => Number(a.slug === 'zapchasti') - Number(b.slug === 'zapchasti') || byName(a, b));
  const category = sp.c ? categories.find((n) => n.slug === sp.c) : undefined;
  const subNodes = (category?.children ?? []).filter((n) => !isProduct(n));
  const subcategories = subNodes.filter((n) => n.products > 0).sort(byName);
  const infoPages = subNodes.filter((n) => n.products === 0).sort(byName);
  const subcategory = category && sp.s ? subcategories.find((n) => n.slug === sp.s) : undefined;
  // третий уровень — группы (у запчастей: «Тельферы и комплектующие»…)
  const groups = (subcategory?.children ?? []).filter((n) => !isProduct(n) && n.products > 0).sort(byName);
  const group = subcategory && sp.g ? groups.find((n) => n.slug === sp.g) : undefined;
  const current = group ?? subcategory ?? category;
  const scope = current ?? root;

  const q = sp.q?.trim() ?? '';
  let products = productsIn(scope);
  if (q) products = products.filter((n) => matches(n, q));
  if (sp.status) products = products.filter((n) => n.status === sp.status);
  const showCategoryCards = !category && !q && !sp.status;

  return (
    <>
      <PageHeader
        title="Каталог продукции"
        description="Категории, подкатегории и товары сайта. Откройте товар, чтобы изменить название, фото, параметры и описание."
        actions={
          <LinkButton href={`/pages/${root.id}`} variant="secondary">
            Страница «Каталог»
          </LinkButton>
        }
      />

      <CatalogFilters
        categories={categories.map((n) => ({ value: n.slug, label: n.short, count: n.products }))}
        subcategories={subcategories.map((n) => ({ value: n.slug, label: n.short, count: n.products }))}
        groups={groups.map((n) => ({ value: n.slug, label: n.short, count: n.products }))}
        values={sp}
      />

      {showCategoryCards ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {categories.map((n) => {
            const subs = n.children.filter((c) => !isProduct(c) && c.products > 0).length;
            return (
              <Link
                key={n.id}
                href={`/catalog?c=${n.slug}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                  {n.image ? (
                    <img src={thumbUrl(n.image, 640)!} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">нет фото категории</div>
                  )}
                </div>
                <div className="px-4 py-3">
                  <div className="font-semibold text-slate-900 group-hover:text-brand-700">{n.short}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {subs ? `${subs} ${plural(subs, 'подкатегория', 'подкатегории', 'подкатегорий')} · ` : ''}
                    {n.products} {plural(n.products, 'товар', 'товара', 'товаров')}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <>
          {category && current && (
            <section className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              {current.image && <img src={thumbUrl(current.image, 320)!} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500">
                  <Link href="/catalog" className="hover:text-brand-600">
                    Каталог
                  </Link>
                  {subcategory && (
                    <>
                      {' / '}
                      <Link href={`/catalog?c=${category.slug}`} className="hover:text-brand-600">
                        {category.short}
                      </Link>
                    </>
                  )}
                  {subcategory && group && (
                    <>
                      {' / '}
                      <Link href={`/catalog?c=${category.slug}&s=${subcategory.slug}`} className="hover:text-brand-600">
                        {subcategory.short}
                      </Link>
                    </>
                  )}
                </div>
                <h2 className="truncate text-lg font-semibold text-slate-900">{current.short}</h2>
                <div className="truncate text-xs text-slate-500">{current.name}</div>
              </div>
              <div className="flex gap-2">
                <LinkButton size="sm" href={`/pages/${current.id}`}>
                  Изменить страницу {group ? 'группы' : subcategory ? 'подкатегории' : 'категории'}
                </LinkButton>
                <a href={`${site}${current.path}`} target="_blank" rel="noopener" className="self-center text-xs text-brand-600 hover:underline">
                  на сайте ↗
                </a>
              </div>
            </section>
          )}

          {category && !group && (subcategory ? groups : subcategories).length > 0 && !q && (
            <div className="mb-5 flex flex-wrap gap-2">
              {(subcategory ? groups : subcategories).map((n) => (
                <Link
                  key={n.id}
                  href={subcategory ? `/catalog?c=${category.slug}&s=${subcategory.slug}&g=${n.slug}` : `/catalog?c=${category.slug}&s=${n.slug}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-xs hover:border-brand-300 hover:text-brand-700"
                >
                  {n.short} <span className="text-slate-400">{n.products}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              {q ? `Найдено: ${products.length}` : `Товары: ${products.length}`}
            </h3>
          </div>
          {products.length ? <ProductTable products={products} scope={scope} site={site} /> : <EmptyState>Товаров не нашлось.</EmptyState>}

          {category && !subcategory && infoPages.length > 0 && !q && (
            <section className="mt-8">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Другие страницы категории</h3>
              <p className="mb-3 text-xs text-slate-500">Подборки, статьи и посадочные страницы — без товаров внутри.</p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs">
                {infoPages.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <Link href={`/pages/${n.id}`} className="truncate font-medium text-slate-800 hover:text-brand-600">
                      {n.short}
                    </Link>
                    <a href={`${site}${n.path}`} target="_blank" rel="noopener" className="shrink-0 text-xs text-brand-600 hover:underline">
                      на сайте ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

function ProductTable({ products, scope, site }: { products: TreeNode[]; scope: TreeNode; site: string }) {
  // путь от текущего уровня просмотра до товара: «Кранового типа», «Для дробемётных / Тельферы»…
  const where = new Map(
    products.map((p) => {
      const chain = lineage(p);
      return [p.id, chain.slice(chain.indexOf(scope) + 1, -1).map((n) => n.short).join(' / ')];
    }),
  );
  const showWhere = [...where.values()].some(Boolean);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
          <tr>
            <th className="w-20 px-4 py-2.5 font-medium">Фото</th>
            <th className="px-4 py-2.5 font-medium">Товар</th>
            {showWhere && <th className="px-4 py-2.5 font-medium">Где в каталоге</th>}
            <th className="px-4 py-2.5 font-medium">Статус</th>
            <th className="px-4 py-2.5 font-medium whitespace-nowrap">Изменён</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((p) => {
            return (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                    {p.image ? <img src={thumbUrl(p.image)!} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-slate-400">нет фото</span>}
                  </div>
                </td>
                <td className="max-w-xl px-4 py-2">
                  <Link href={`/pages/${p.id}`} className="block font-medium text-slate-900 hover:text-brand-600">
                    {p.short !== p.name && p.short.length < 40 ? p.short : p.name}
                  </Link>
                  {p.short !== p.name && p.short.length < 40 && <span className="block truncate text-xs text-slate-500">{p.name}</span>}
                </td>
                {showWhere && <td className="px-4 py-2 text-xs text-slate-600">{where.get(p.id)}</td>}
                <td className="px-4 py-2 whitespace-nowrap">
                  {p.status === 'published' ? <Badge tone="green">На сайте</Badge> : <Badge tone="amber">Черновик</Badge>}
                </td>
                <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-500">{formatDate(p.updatedAt)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <LinkButton size="sm" href={`/pages/${p.id}`}>
                    Изменить
                  </LinkButton>
                  <a href={`${site}${p.path}`} target="_blank" rel="noopener" className="ml-3 text-xs text-brand-600 hover:underline" title="Открыть на сайте">
                    ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
