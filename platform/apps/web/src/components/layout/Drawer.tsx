'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DRAWER_ICONS, type ContactsSettings, type DrawerItem } from '@mtpk/content-model';
import { ContactLink } from './ContactLink';
import { MenuIcon } from './icons';
import { navStore } from './nav-store';

const contactIcon = (paths: string) =>
  `<span class="nav-drawer__contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;

function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  );
}

/**
 * Мобильное меню (≤ 1024px): выезжает по кнопке в шапке. Пока открыто —
 * остальная страница недоступна (inert), фокус ходит по кругу внутри,
 * Esc и ссылка закрывают; при закрытии фокус возвращается на кнопку.
 */
export function Drawer({ items, contacts }: { items: DrawerItem[]; contacts: ContactsSettings }) {
  const open = useSyncExternalStore(navStore.subscribe, navStore.isOpen, navStore.serverSnapshot);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const drawer = ref.current;
    if (!open || !drawer) return;
    document.body.classList.add('nav-open');
    const background = [...document.body.children]
      .filter((el): el is HTMLElement => el instanceof HTMLElement && !el.contains(drawer) && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName))
      .map((el) => ({ el, inert: el.inert }));
    for (const b of background) b.el.inert = true;
    (closeRef.current ?? focusable(drawer)[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navStore.set(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusable(drawer);
      if (!list.length) return e.preventDefault();
      const first = list[0];
      const last = list[list.length - 1];
      const outside = !drawer.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth > 1024) navStore.set(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('nav-open');
      for (const b of background) b.el.inert = b.inert;
      const toggle = document.querySelector<HTMLElement>('[data-nav-toggle]');
      const target = toggle && toggle.getClientRects().length ? toggle : document.querySelector<HTMLElement>('.header__brand');
      target?.focus();
    };
  }, [open]);

  const close = () => navStore.set(false);

  // До гидратации разметка совпадает с серверной; роль диалога и inert — после
  const dialog = mounted ? { role: 'dialog', 'aria-label': 'Мобильное меню', 'aria-modal': true, inert: !open } : {};

  return (
    <aside
      ref={ref}
      className="nav-drawer"
      aria-hidden={open ? 'false' : 'true'}
      data-nav-drawer=""
      {...dialog}
      onClick={(e) => {
        if ((e.target as Element).closest('.nav-drawer__link, .nav-drawer__sublink')) close();
      }}
    >
      <div className="nav-drawer__header">
        <a href="/" className="nav-drawer__brand" aria-label="УралИндуктор — на главную">
          <img src="/brand/logo-header-clean.png" alt="УралИндуктор" width="200" height="56" loading="lazy" decoding="async" />
        </a>
        <button ref={closeRef} className="nav-drawer__close" aria-label="Закрыть меню" data-nav-close="" onClick={close}>
          ×
        </button>
      </div>

      <ul className="nav-drawer__list">
        {items.map((item, i) =>
          item.groups ? (
            <li key={i} className={expanded[i] ? 'nav-drawer__item nav-drawer__item--acc is-open' : 'nav-drawer__item nav-drawer__item--acc'}>
              <button
                className="nav-drawer__acc"
                type="button"
                data-drawer-acc=""
                aria-expanded={expanded[i] ? 'true' : 'false'}
                onClick={() => setExpanded((s) => ({ ...s, [i]: !s[i] }))}
              >
                <span className="nav-drawer__icon" aria-hidden="true">
                  <MenuIcon paths={item.icon} />
                </span>
                <span className="nav-drawer__text">{item.label}</span>
                <span className="nav-drawer__acc-chev" aria-hidden="true" />
              </button>
              <div className="nav-drawer__panel">
                {item.groups.flatMap((group, g) => [
                  group.label ? (
                    <div key={`g${g}`} className="nav-drawer__group-label">
                      {group.label}
                    </div>
                  ) : null,
                  ...group.links.map((link) => (
                    <a key={`${g}${link.href}`} className="nav-drawer__sublink" href={link.href}>
                      {link.label}
                    </a>
                  )),
                ])}
                {item.all && (
                  <a className="nav-drawer__sublink nav-drawer__sublink--all" href={item.all.href}>
                    {item.all.label}
                  </a>
                )}
              </div>
            </li>
          ) : (
            <li key={i} className="nav-drawer__item">
              <a className="nav-drawer__link" href={item.href}>
                <span className="nav-drawer__icon" aria-hidden="true">
                  <MenuIcon paths={item.icon} />
                </span>
                <span className="nav-drawer__text">{item.label}</span>
              </a>
            </li>
          ),
        )}
      </ul>

      <div className="nav-drawer__contacts">
        <div className="nav-drawer__contacts-label">Связаться</div>
        {contacts.phones.map((phone) => (
          <ContactLink key={phone.href} href={phone.href} icon={contactIcon(DRAWER_ICONS.contacts)} text={phone.text} />
        ))}
        <ContactLink href={`mailto:${contacts.email}`} icon={contactIcon(DRAWER_ICONS.mail)} text={contacts.email} />
      </div>
    </aside>
  );
}
