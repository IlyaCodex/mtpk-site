import Link from 'next/link';
import type { ReactNode } from 'react';
import { lastSegment, plain, type CatalogTree } from '@/lib/catalog';

/** Ссылки «где в каталоге» для формы: Каталог / категория / подкатегория. */
export function catalogTrail(tree: CatalogTree, categoryId?: number | null, subcategoryId?: number | null): { href: string; label: string }[] {
  const out = [{ href: '/catalog', label: 'Каталог' }];
  const c = tree.categories.find((x) => x.id === categoryId);
  if (!c) return out;
  out.push({ href: `/catalog?c=${lastSegment(c.path)}`, label: plain(c.name) });
  const s = tree.subcategories.find((x) => x.id === subcategoryId);
  if (s) out.push({ href: `/catalog?c=${lastSegment(c.path)}&s=${lastSegment(s.path)}`, label: plain(s.name) });
  return out;
}

/** Шапка формы каталога: путь, заголовок, пояснение. */
export function CatalogFormHeader({ trail, title, description, actions }: { trail: { href: string; label: string }[]; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6">
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Где в каталоге">
        {trail.map((t, i) => (
          <span key={t.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300">/</span>}
            <Link href={t.href} className="hover:text-brand-600">
              {i === 0 ? `← ${t.label}` : t.label}
            </Link>
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
