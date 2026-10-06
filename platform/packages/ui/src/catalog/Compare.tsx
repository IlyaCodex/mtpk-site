'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { COMPARE_LIMIT, COMPARE_PAGE, clearCompare, exposeCompareApi, readCompare, subscribeCompare, toggleCompare } from './compare-store.ts';

const ICON =
  '<svg class="cmp-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M4 8h16M7 8l-3 6h6zM17 8l-3 6h6z"/></svg>';

const snapshot = () => JSON.stringify(readCompare()?.items ?? []);
const serverSnapshot = () => '[]';

function useCompareItems(): string[] {
  const raw = useSyncExternalStore(subscribeCompare, snapshot, serverSnapshot);
  return JSON.parse(raw) as string[];
}

/** Кнопка «К сравнению» / «В сравнении» в карточке каталога и на странице товара. */
export function CompareButton({ url }: { url: string }) {
  const active = useCompareItems().includes(url);
  return (
    <button
      type="button"
      className={active ? 'cmp-btn is-active' : 'cmp-btn'}
      data-compare={url}
      aria-pressed={active ? 'true' : 'false'}
      onClick={(e) => {
        e.preventDefault();
        toggleCompare(url);
      }}
      dangerouslySetInnerHTML={{ __html: `${ICON}<span>${active ? 'В сравнении' : 'К сравнению'}</span>` }}
    />
  );
}

/**
 * Нижняя панель «Сравнение: N / 4 · Сравнить · Очистить». Висит на любой
 * странице, пока что-то выбрано (кроме самой /sravnenie/); поднимается над
 * плашкой cookie, пока та видна.
 */
export function CompareBar() {
  const items = useCompareItems();
  const [path, setPath] = useState('');
  const [bottom, setBottom] = useState('0px');

  useEffect(() => {
    exposeCompareApi();
    setPath(location.pathname.replace(/\/?$/, '/'));
    const lift = () => {
      const ck = document.getElementById('cookie-consent');
      setBottom(ck && !ck.hidden && ck.offsetHeight > 0 ? `${ck.offsetHeight}px` : '0px');
    };
    lift();
    const timer = window.setInterval(lift, 1000);
    window.addEventListener('cookie-consent-accepted', lift);
    window.addEventListener('resize', lift);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('cookie-consent-accepted', lift);
      window.removeEventListener('resize', lift);
    };
  }, []);

  if (!path || path === COMPARE_PAGE || !items.length) return null;
  return (
    <div id="cmp-bar" className="cmp-bar" style={{ bottom }}>
      <div className="cmp-bar__inner">
        <span className="cmp-bar__count">
          Сравнение: <b>{items.length}</b> / {COMPARE_LIMIT}
        </span>
        <a className="btn btn--primary cmp-bar__go" href={COMPARE_PAGE}>
          Сравнить <span className="btn__arrow">→</span>
        </a>
        <button type="button" className="cmp-bar__clear" onClick={() => clearCompare()}>
          Очистить
        </button>
      </div>
    </div>
  );
}
