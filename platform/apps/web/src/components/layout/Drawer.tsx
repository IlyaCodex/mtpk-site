import { DRAWER_ICONS, type ContactsSettings, type DrawerItem } from '@mtpk/content-model';
import { ContactLink } from './ContactLink';
import { MenuIcon } from './icons';

const contactIcon = (paths: string) =>
  `<span class="nav-drawer__contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;

/**
 * Мобильное меню (≤ 1024px): пункты из настроек сайта. Открытие, разделы-
 * «аккордеоны», недоступность фона и фокус — клиентский модуль header.ts.
 */
export function Drawer({ items, contacts }: { items: DrawerItem[]; contacts: ContactsSettings }) {
  return (
    <aside className="nav-drawer" aria-hidden="true" data-nav-drawer="">
      <div className="nav-drawer__header">
        <a href="/" className="nav-drawer__brand" aria-label="УралИндуктор — на главную">
          <img src="/brand/logo-header-clean.png" alt="УралИндуктор" width="200" height="56" loading="lazy" decoding="async" />
        </a>
        <button className="nav-drawer__close" aria-label="Закрыть меню" data-nav-close="">
          ×
        </button>
      </div>

      <ul className="nav-drawer__list">
        {items.map((item, i) =>
          item.groups ? (
            <li key={i} className="nav-drawer__item nav-drawer__item--acc">
              <button className="nav-drawer__acc" type="button" data-drawer-acc="" aria-expanded="false">
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
                    <ArrowLabel label={item.all.label} />
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

/** Подпись ссылки из настроек: «→» в конце — иконкой, как у кнопок (стили .btn__arrow). */
function ArrowLabel({ label }: { label: string }) {
  const m = /^([\s\S]*?)[\s\u00a0]*→\s*$/.exec(label);
  if (!m) return <>{label}</>;
  return (
    <>
      {`${m[1]} `}
      <span className="btn__arrow" aria-hidden="true">
        →
      </span>
    </>
  );
}
