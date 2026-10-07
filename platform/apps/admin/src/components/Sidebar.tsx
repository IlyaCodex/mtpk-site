'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from './ui';
import { withBase } from '@/lib/base-path';
import { api } from '@/lib/client-api';

/** Иконки разделов (Lucide, ISC). */
const ICONS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  catalog: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  pages: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  media: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  redirects: 'M4 12h12M12 6l6 6-6 6M20 4v16',
  stock: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  leads: 'M4 4h16v12H5.2L4 17.2zM8 9h8M8 12h5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  audit: 'M12 8v4l3 2M3.05 11a9 9 0 1 1 .5 4M3 4v5h5',
  api: 'M8 6 2 12l6 6M16 6l6 6-6 6M14 4l-4 16',
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; group?: string };

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Sidebar({ items, user, siteUrl }: { items: NavItem[]; user: { name: string; email: string; roleLabel: string }; siteUrl: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  async function logout() {
    await api('auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign(withBase('/login'));
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-brand-900 bg-brand-950 text-brand-100">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src={withBase('/favicon.svg')} alt="" className="h-8 w-8" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">УралИндуктор</div>
          <a href={siteUrl} target="_blank" rel="noopener" className="text-xs text-brand-200 hover:text-white">
            открыть сайт ↗
          </a>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Разделы админки">
        {items.map((item, i) => (
          <div key={item.href}>
            {item.group && item.group !== items[i - 1]?.group && (
              <div className="mt-4 mb-1 px-3 text-[11px] font-semibold tracking-wider text-brand-300/80 uppercase">{item.group}</div>
            )}
            <Link
              href={item.href}
              className={cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active(item.href) ? 'bg-brand-700 font-medium text-white' : 'text-brand-100 hover:bg-brand-900 hover:text-white',
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          </div>
        ))}
      </nav>
      <div className="border-t border-brand-900 px-5 py-4 text-xs">
        <div className="truncate font-medium text-white">{user.name}</div>
        <div className="truncate text-brand-200">{user.roleLabel}</div>
        <button type="button" onClick={logout} className="mt-2 text-brand-200 underline-offset-2 hover:text-white hover:underline">
          Выйти
        </button>
      </div>
    </aside>
  );
}
