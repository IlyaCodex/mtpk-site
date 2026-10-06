'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** Липкая шапка: при прокрутке получает класс is-scrolled (тень и компактный вид). */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let queued = false;
    const update = () => {
      setScrolled(window.scrollY > 8);
      queued = false;
    };
    // не чаще одного раза за кадр (T-PERF-9)
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div className={scrolled ? 'header-shell is-scrolled' : 'header-shell'}>{children}</div>;
}
