import { DRAWER_ICONS, type NavItem, type SiteSettings } from '@mtpk/content-model';
import { ContactLink } from './ContactLink';
import { MenuIcon } from './icons';
import { Logo } from './Logo';

type MegaLink = NonNullable<NavItem['mega']>['columns'][number]['links'][number];

const contactIcon = (paths: string) =>
  `<span class="nav-drawer__contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;

/**
 * Мобильное меню (≤ 1024px): пункты из настроек сайта (админка «Шапка, меню,
 * контакты» → мобильное меню). Подпункты разделов — как мегаменю на компьютере:
 * иконка и подпись берутся у пункта мегаменю с тем же адресом. Открытие,
 * разделы-«аккордеоны», недоступность фона и фокус — клиентский модуль header.ts.
 */
export function Drawer({ settings }: { settings: SiteSettings }) {
  const { drawer: items, contacts, nav } = settings;
  const mega = new Map<string, MegaLink>(nav.flatMap((n) => n.mega?.columns.flatMap((c) => c.links) ?? []).map((l) => [l.href, l]));
  return (
    <aside className="nav-drawer" aria-hidden="true" data-nav-drawer="">
      <div className="nav-drawer__header">
        <a href="/" className="nav-drawer__brand" aria-label="УралИндуктор — на главную">
          <Logo src="/brand/logo-header-clean.png" alt="УралИндуктор" width="200" height="56" loading="lazy" decoding="async" />
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
              {/* панель раскрывается плавно: внешний блок — высота (grid), внутренний — обрезка, третий — отступы */}
              <div className="nav-drawer__panel">
                <div className="nav-drawer__panel-inner">
                  <div className="nav-drawer__panel-body">
                    {item.groups.map((group, g) => (
                      <div key={g} className="nav-drawer__group">
                        {group.label && <div className="nav-drawer__group-label">{group.label}</div>}
                        <ul className="nav-drawer__sublist">
                          {group.links.map((link) => {
                            const meta = mega.get(link.href);
                            // подпись не повторяет название («ХТС — холодно-твердеющие смеси» / «Холодно-твердеющие смеси»)
                            const desc = meta?.desc && !link.label.toLowerCase().includes(meta.desc.toLowerCase()) ? meta.desc : null;
                            return (
                              <li key={link.href}>
                                <a className="nav-drawer__sublink" href={link.href}>
                                  <span className="nav-drawer__sub-icon" aria-hidden="true">
                                    {meta?.icon ? <MenuIcon paths={meta.icon} strokeWidth={1.7} /> : <span className="nav-drawer__sub-dot" />}
                                  </span>
                                  <span className="nav-drawer__sub-body">
                                    <span className="nav-drawer__sub-title">{link.label}</span>
                                    {desc && <span className="nav-drawer__sub-desc">{desc}</span>}
                                  </span>
                                  <span className="nav-drawer__sub-arrow" aria-hidden="true" />
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                    {item.all && (
                      <a className="nav-drawer__sublink nav-drawer__sublink--all" href={item.all.href}>
                        <ArrowLabel label={item.all.label} />
                      </a>
                    )}
                  </div>
                </div>
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
  const m = /^([\s\S]*?)[\s ]*→\s*$/.exec(label);
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
