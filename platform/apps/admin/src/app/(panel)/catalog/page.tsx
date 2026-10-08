import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { Badge, EmptyState, formatDate, LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import {
  lastSegment,
  plain,
  plural,
  thumbUrl,
  type CatalogNode,
  type CatalogTree,
  type CatCategory,
  type CatProduct,
  type CatSubcategory,
} from '@/lib/catalog';
import { env } from '@/lib/env';
import { serviceJson } from '@/lib/services';
import { CatalogSearch, Reorder } from './CatalogParts';
import { SparesView } from './SparesView';

export const metadata: Metadata = { title: 'Каталог продукции' };

type Query = { c?: string; s?: string; g?: string; q?: string };

/** Совпадение с поиском: название, адрес (без учёта регистра и «ё»). */
const norm = (s: string) => plain(s).toLowerCase().replace(/ё/g, 'е');

/**
 * Каталог продукции в три уровня, как на сайте: категории (карточки на
 * главной) → подкатегории («Модельный ряд» категории) → товары. На каждом
 * уровне — «Добавить», порядок карточек стрелками, переход к правке.
 */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser('content');
  const sp = await searchParams;
  const tree = await serviceJson<CatalogTree>('content', 'catalog/tree', { user });
  const site = env().PUBLIC_SITE_URL;
  const q = sp.q?.trim() ?? '';
  const category = sp.c ? tree.categories.find((c) => lastSegment(c.path) === sp.c) : undefined;
  const subcategory = category && sp.s ? tree.subcategories.find((s) => s.categoryId === category.id && lastSegment(s.path) === sp.s) : undefined;

  if (q) {
    const found = tree.products.filter((p) => norm(p.name).includes(norm(q)) || p.path.includes(q.toLowerCase()));
    return (
      <>
        <Header />
        <CatalogSearch value={q} />
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Найдено товаров: {found.length}</h2>
        {found.length ? <ProductRows products={found} tree={tree} site={site} showWhere /> : <EmptyState>Ничего не нашлось.</EmptyState>}
      </>
    );
  }

  if (category?.kind === 'hub') {
    // запчасти пока — страницами (их перевод в данные каталога — следующий этап)
    const nodes = await serviceJson<CatalogNode[]>('content', 'catalog', { user });
    return <SparesView category={category} nodes={nodes} query={sp} site={site} />;
  }

  if (subcategory && category) return <SubcategoryView category={category} subcategory={subcategory} tree={tree} site={site} />;
  if (category) {
    const nodes = await serviceJson<CatalogNode[]>('content', 'catalog', { user });
    return <CategoryView category={category} tree={tree} nodes={nodes} site={site} />;
  }

  const ids = tree.categories.map((c) => c.id);
  return (
    <>
      <Header
        actions={
          <LinkButton variant="primary" href="/catalog/categories/new">
            <Icon name="plus" className="h-4 w-4" />
            Добавить категорию
          </LinkButton>
        }
      />
      <CatalogSearch value="" />
      <p className="mb-3 text-sm text-slate-500">Порядок карточек — как в сетке «Оборудование» на главной странице сайта. Нажмите на категорию, чтобы увидеть её подкатегории и товары.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {tree.categories.map((c, i) => (
          <Tile
            key={c.id}
            href={`/catalog?c=${lastSegment(c.path)}`}
            image={c.cover}
            title={plain(c.name)}
            meta={
              c.kind === 'hub'
                ? 'Запчасти: отдельный раздел'
                : `${c.subcategories ? `${c.subcategories} ${plural(c.subcategories, 'подкатегория', 'подкатегории', 'подкатегорий')} · ` : ''}${c.products} ${plural(c.products, 'товар', 'товара', 'товаров')}`
            }
            badges={
              <>
                {c.status !== 'published' && <Badge tone="amber">Черновик</Badge>}
                {!c.onHome && <Badge>Нет на главной</Badge>}
              </>
            }
            actions={<Reorder kind="categories" ids={ids} index={i} label={plain(c.name)} />}
          />
        ))}
      </div>
    </>
  );
}

function Header({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeader
      title="Каталог продукции"
      description="Категории → подкатегории → товары. Здесь добавляются и меняются карточки каталога: название, обложка, описание, порядок. Тексты, фото и характеристики страниц — по кнопке «Изменить»."
      actions={actions}
    />
  );
}

/** Где мы: Каталог / категория / подкатегория. */
function Trail({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Где в каталоге">
      <Link href="/catalog" className="hover:text-brand-600">
        Каталог
      </Link>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1">
          <span className="text-slate-300">/</span>
          {it.href ? (
            <Link href={it.href} className="hover:text-brand-600">
              {it.label}
            </Link>
          ) : (
            <span className="text-slate-800">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Карточка категории или подкатегории: обложка, название, счётчики, порядок. */
function Tile({ href, image, title, text, meta, badges, actions }: { href: string; image: string | null; title: string; text?: string; meta: string; badges?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-brand-300 hover:shadow-md">
      <Link href={href} className="block">
        <div className="aspect-[16/9] overflow-hidden bg-slate-100">
          {image ? (
            <img src={thumbUrl(image, 640)!} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">нет обложки</div>
          )}
        </div>
        <div className="px-4 pt-3 pb-12">
          <div className="font-semibold text-slate-900 group-hover:text-brand-700">{title}</div>
          {text && <div className="mt-1 line-clamp-2 text-xs text-slate-500">{text}</div>}
          <div className="mt-1 text-xs text-slate-500">{meta}</div>
        </div>
      </Link>
      <div className="absolute right-3 bottom-3 left-4 flex items-center justify-between gap-2">
        <span className="flex flex-wrap gap-1">{badges}</span>
        {actions}
      </div>
    </div>
  );
}

/** Шапка уровня: обложка, название, адрес, кнопки правки. */
function Summary({ image, title, path, status, editHref, editLabel, pageId, site }: { image: string | null; title: string; path: string; status: string; editHref: string; editLabel: string; pageId: number; site: string }) {
  return (
    <section className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      {image ? <img src={thumbUrl(image, 320)!} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-28 shrink-0 rounded-lg bg-slate-100" />}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold text-slate-900">{title}</h1>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {status === 'published' ? <Badge tone="green">На сайте</Badge> : <Badge tone="amber">Черновик — на сайте не виден</Badge>}
          <span className="font-mono">{path}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LinkButton size="sm" variant="primary" href={editHref}>
          {editLabel}
        </LinkButton>
        <LinkButton size="sm" href={`/catalog/${pageId}`}>
          Тексты и SEO страницы
        </LinkButton>
        <a href={`${site}${path}`} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-xs text-brand-600 hover:underline">
          на сайте
          <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}

function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function CategoryView({ category, tree, nodes, site }: { category: CatCategory; tree: CatalogTree; nodes: CatalogNode[]; site: string }) {
  const subs = tree.subcategories.filter((s) => s.categoryId === category.id);
  const direct = tree.products.filter((p) => p.categoryId === category.id && p.subcategoryId === null);
  const c = lastSegment(category.path);
  // страницы раздела вне каталога: подборки, статьи, опросные листы
  const known = new Set([category.path, ...subs.map((s) => s.path), ...tree.products.filter((p) => p.categoryId === category.id).map((p) => p.path)]);
  const other = nodes.filter((n) => n.path.startsWith(category.path) && !known.has(n.path));
  const subIds = subs.map((s) => s.id);
  return (
    <>
      <Trail items={[{ label: plain(category.name) }]} />
      <Summary
        image={category.cover}
        title={plain(category.name)}
        path={category.path}
        status={category.status}
        editHref={`/catalog/categories/${category.id}`}
        editLabel="Изменить категорию"
        pageId={category.pageId}
        site={site}
      />

      <SectionTitle
        title={`Подкатегории (${subs.length})`}
        hint="Карточки «Модельного ряда» на странице категории — в этом порядке"
        action={
          <LinkButton variant="primary" size="sm" href={`/catalog/subcategories/new?category=${category.id}`}>
            <Icon name="plus" className="h-4 w-4" />
            Добавить подкатегорию
          </LinkButton>
        }
      />
      {subs.length ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {subs.map((s, i) => (
            <Tile
              key={s.id}
              href={`/catalog?c=${c}&s=${lastSegment(s.path)}`}
              image={s.cover}
              title={plain(s.name)}
              text={plain(s.description)}
              meta={`${s.products} ${plural(s.products, 'товар', 'товара', 'товаров')}`}
              badges={
                <>
                  {s.status !== 'published' && <Badge tone="amber">Черновик</Badge>}
                  {!s.listed && <Badge>Не в «Модельном ряду»</Badge>}
                </>
              }
              actions={<Reorder kind="subcategories" ids={subIds} index={i} label={plain(s.name)} />}
            />
          ))}
        </div>
      ) : (
        <div className="mb-8">
          <EmptyState>Подкатегорий нет. Товары категории — в списке ниже.</EmptyState>
        </div>
      )}

      {(direct.length > 0 || subs.length === 0) && (
        <>
          <SectionTitle
            title={`Товары прямо в категории (${direct.length})`}
            hint="Без подкатегории: карточки на странице категории"
            action={
              <LinkButton variant="primary" size="sm" href={`/catalog/products/new?category=${category.id}`}>
                <Icon name="plus" className="h-4 w-4" />
                Добавить товар
              </LinkButton>
            }
          />
          {direct.length ? <ProductRows products={direct} tree={tree} site={site} reorder /> : <EmptyState>Товаров пока нет.</EmptyState>}
        </>
      )}

      {other.length > 0 && (
        <section className="mt-8">
          <SectionTitle title="Другие страницы раздела" hint="Подборки, статьи, опросные листы — без карточки в каталоге" />
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs">
            {other.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <Link href={`/catalog/${n.id}`} className="truncate font-medium text-slate-800 hover:text-brand-600">
                  {n.short}
                </Link>
                <a href={`${site}${n.path}`} target="_blank" rel="noopener" className="inline-flex shrink-0 items-center gap-0.5 text-xs text-brand-600 hover:underline">
                  на сайте
                  <Icon name="external" className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SubcategoryView({ category, subcategory, tree, site }: { category: CatCategory; subcategory: CatSubcategory; tree: CatalogTree; site: string }) {
  const products = tree.products.filter((p) => p.subcategoryId === subcategory.id);
  return (
    <>
      <Trail items={[{ href: `/catalog?c=${lastSegment(category.path)}`, label: plain(category.name) }, { label: plain(subcategory.name) }]} />
      <Summary
        image={subcategory.cover}
        title={plain(subcategory.name)}
        path={subcategory.path}
        status={subcategory.status}
        editHref={`/catalog/subcategories/${subcategory.id}`}
        editLabel="Изменить подкатегорию"
        pageId={subcategory.pageId}
        site={site}
      />
      <SectionTitle
        title={`Товары (${products.length})`}
        hint="Карточки в списке на странице подкатегории — в этом порядке"
        action={
          <LinkButton variant="primary" size="sm" href={`/catalog/products/new?category=${category.id}&subcategory=${subcategory.id}`}>
            <Icon name="plus" className="h-4 w-4" />
            Добавить товар
          </LinkButton>
        }
      />
      {products.length ? <ProductRows products={products} tree={tree} site={site} reorder /> : <EmptyState>Товаров пока нет.</EmptyState>}
    </>
  );
}

/** Товары списком: фото, название, где в каталоге, статус, порядок, правка. */
function ProductRows({ products, tree, site, reorder, showWhere }: { products: CatProduct[]; tree: CatalogTree; site: string; reorder?: boolean; showWhere?: boolean }) {
  const ids = products.map((p) => p.id);
  const where = (p: CatProduct) =>
    [tree.categories.find((c) => c.id === p.categoryId)?.name, tree.subcategories.find((s) => s.id === p.subcategoryId)?.name]
      .filter((x): x is string => Boolean(x))
      .map(plain)
      .join(' / ');
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
          <tr>
            <th className="w-20 px-4 py-2.5 font-medium">Обложка</th>
            <th className="px-4 py-2.5 font-medium">Товар</th>
            {showWhere && <th className="px-4 py-2.5 font-medium">Где в каталоге</th>}
            <th className="px-4 py-2.5 font-medium">Статус</th>
            <th className="px-4 py-2.5 font-medium whitespace-nowrap">Изменён</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((p, i) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-2">
                <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                  {p.cover ? <img src={thumbUrl(p.cover)!} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-slate-400">нет</span>}
                </div>
              </td>
              <td className="max-w-xl px-4 py-2">
                <Link href={`/catalog/products/${p.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                  {plain(p.name)}
                </Link>
                {p.nameNote && <span className="ml-1 text-slate-500">{p.nameNote}</span>}
                <span className="block truncate font-mono text-[11px] text-slate-400">{p.path}</span>
              </td>
              {showWhere && <td className="px-4 py-2 text-xs text-slate-600">{where(p)}</td>}
              <td className="px-4 py-2">
                <span className="flex flex-wrap gap-1">
                  {p.status === 'published' ? <Badge tone="green">На сайте</Badge> : <Badge tone="amber">Черновик</Badge>}
                  {!p.listed && <Badge>Не в списке</Badge>}
                </span>
              </td>
              <td className="px-4 py-2 text-xs whitespace-nowrap text-slate-500">{formatDate(p.updatedAt)}</td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <span className="inline-flex items-center gap-3">
                  {reorder && <Reorder kind="products" ids={ids} index={i} label={plain(p.name)} />}
                  <LinkButton size="sm" href={`/catalog/products/${p.id}`}>
                    Изменить
                  </LinkButton>
                  <a href={`${site}${p.path}`} target="_blank" rel="noopener" className="rounded p-1 text-brand-600 hover:bg-brand-50" title="Открыть на сайте" aria-label="Открыть на сайте">
                    <Icon name="external" className="h-4 w-4" />
                  </a>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
