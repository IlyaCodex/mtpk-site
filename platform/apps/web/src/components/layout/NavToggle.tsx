'use client';

import { useSyncExternalStore } from 'react';
import { navStore } from './nav-store';

/** Кнопка мобильного меню (видна на экранах ≤ 1024px). */
export function NavToggle() {
  const open = useSyncExternalStore(navStore.subscribe, navStore.isOpen, navStore.serverSnapshot);
  return (
    <button
      className="nav-toggle"
      aria-label="Открыть меню"
      aria-expanded={open ? 'true' : 'false'}
      data-nav-toggle=""
      onClick={() => navStore.set(true)}
    >
      <span className="nav-toggle__bar" />
      <span className="nav-toggle__bar" />
      <span className="nav-toggle__bar" />
    </button>
  );
}
