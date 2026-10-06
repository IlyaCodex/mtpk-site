'use client';

import { useEffect, useState } from 'react';

/**
 * Оглавление «Содержание» у характеристик товара: подсветка раздела, который
 * сейчас у верха экрана (IntersectionObserver), плавный скролл по клику.
 * На мобильных оглавление скрыто стилями — там видны все разделы подряд.
 */
export function SpecNav({
  ariaLabel,
  eyebrow,
  items,
  panelIds,
}: {
  ariaLabel: string;
  eyebrow: string;
  items: { href: string; label: string }[];
  panelIds: string[];
}) {
  const [active, setActive] = useState(panelIds[0] ?? '');

  useEffect(() => {
    if (!('IntersectionObserver' in window) || !panelIds.length) return;
    const visible: Record<string, boolean> = {};
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) visible[en.target.id] = en.isIntersecting;
        const best = panelIds.find((id) => visible[id]);
        if (best) setActive(best);
      },
      // зона срабатывания — полоса между 20% и 30% высоты экрана от верха
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    for (const id of panelIds) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [panelIds]);

  return (
    <nav className="spec__nav" aria-label={ariaLabel}>
      <div className="spec__nav-eyebrow" dangerouslySetInnerHTML={{ __html: eyebrow }} />
      {items.map((n, i) => {
        const id = n.href.startsWith('#') ? n.href.slice(1) : '';
        return (
          <a
            key={i}
            className={id && id === active ? 'spec__nav-link is-active' : 'spec__nav-link'}
            href={n.href}
            onClick={(e) => {
              const target = id ? document.getElementById(id) : null;
              if (!target) return;
              e.preventDefault();
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActive(id);
              history.replaceState?.(null, '', n.href);
            }}
            dangerouslySetInnerHTML={{ __html: n.label }}
          />
        );
      })}
    </nav>
  );
}
