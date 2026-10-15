'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, INLINE, type IconName } from './icons';
import { cx } from './ui';
import { withBase } from '@/lib/base-path';
import { api } from '@/lib/client-api';

export type NavItem = { href: string; label: string; icon: IconName; group?: string };

export function Sidebar({ items, user, siteUrl }: { items: NavItem[]; user: { name: string; email: string; roleLabel: string }; siteUrl: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  async function logout() {
    await api('auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign(withBase('/login'));
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-brand-900 bg-brand-950 text-brand-100">
      <div className="px-5 py-5">
        <img src={withBase('/brand/logo-white.png')} alt="УралИндуктор · ООО МТПК" width={176} height={51} className="h-auto w-44" />
        <a href={siteUrl} target="_blank" rel="noopener" className="mt-2 inline-block text-xs text-brand-200 hover:text-white">
          открыть сайт <Icon name="external" className={INLINE} />
        </a>
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
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          </div>
        ))}
      </nav>
      <div className="border-t border-brand-900 px-5 py-4 text-xs">
        <div className="truncate font-medium text-white">{user.name}</div>
        <div className="truncate text-brand-200">{user.roleLabel}</div>
        <button type="button" onClick={logout} className="mt-2 inline-flex items-center gap-1.5 text-brand-200 underline-offset-2 hover:text-white hover:underline">
          <Icon name="logout" className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
