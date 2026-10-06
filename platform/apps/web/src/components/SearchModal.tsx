'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchHit, SearchResponse } from '@mtpk/shared/contracts';

type View =
  | { kind: 'idle' }
  | { kind: 'results'; query: string; items: SearchHit[] }
  | { kind: 'error' };

/** Отсев шумных совпадений: каждое слово запроса (по первым 3 буквам) — в заголовке или фрагменте. */
function relevant(hit: SearchHit, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return true;
  const hay = `${hit.title} ${hit.excerpt.replace(/<[^>]+>/g, '')}`.toLowerCase();
  return words.every((w) => hay.includes(w.length >= 3 ? w.slice(0, 3) : w));
}

/**
 * Поиск по сайту — модальное окно по кнопке-«лупе» ([data-search-open]).
 * Разметка и классы — как у прежней модалки Pagefind (стили в base-layout.css),
 * данные — из поискового сервиса (/api/search, PostgreSQL full-text).
 */
export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>({ kind: 'idle' });
  const [status, setStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const lastQuery = useRef('');
  const background = useRef<{ node: HTMLElement; inert: boolean }[]>([]);
  const prevOverflow = useRef('');

  const close = useCallback(() => {
    setOpen(false);
    document.documentElement.style.overflow = prevOverflow.current;
    for (const s of background.current) s.node.inert = s.inert;
    background.current = [];
    const opener = openerRef.current as HTMLElement | null;
    if (opener?.isConnected) opener.focus();
  }, []);

  const openModal = useCallback(() => {
    const modal = modalRef.current;
    if (!modal || !modal.hidden) return;
    openerRef.current = document.activeElement;
    prevOverflow.current = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    background.current = Array.from(document.body.children)
      .filter((n): n is HTMLElement => n instanceof HTMLElement && n !== modal && !n.contains(modal) && !['SCRIPT', 'STYLE'].includes(n.tagName))
      .map((node) => {
        const state = { node, inert: node.inert };
        node.inert = true;
        return state;
      });
    setOpen(true);
  }, []);

  // Открытие — по любой кнопке [data-search-open] (шапка, страница 404, контент).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('[data-search-open]');
      if (btn) {
        e.preventDefault();
        openModal();
      }
    };
    document.addEventListener('click', onClick);
    // ?q= в адресе (SearchAction из JSON-LD WebSite) — сразу открыть с запросом
    const q = new URLSearchParams(location.search).get('q');
    if (q) {
      setQuery(q);
      openModal();
    }
    return () => document.removeEventListener('click', onClick);
  }, [openModal]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Поиск с задержкой 160 мс, как раньше
  useEffect(() => {
    const q = query;
    lastQuery.current = q;
    if (!q || q.trim().length < 2) {
      setView({ kind: 'idle' });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=40`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SearchResponse;
        if (q !== lastQuery.current) return;
        const items = data.results.filter((d) => relevant(d, q));
        setView({ kind: 'results', query: q, items });
        setStatus(items.length ? `Найдено: ${items.length}` : 'Ничего не найдено');
      } catch {
        if (q !== lastQuery.current) return;
        setView({ kind: 'error' });
        setStatus('Поиск временно недоступен. Попробуйте позже.');
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [query]);

  // Esc закрывает, Tab не выпускает фокус из окна
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const modal = modalRef.current;
      if (!modal) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]')).filter(
        (n) => !(n as HTMLButtonElement).disabled && n.tabIndex >= 0 && n.getClientRects().length > 0,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const showResults = view.kind !== 'idle';
  const items = view.kind === 'results' ? view.items : [];

  return (
    <div className="search-modal" id="search-modal" hidden={!open} ref={modalRef}>
      <div className="search-modal__backdrop" data-search-close="" onClick={close} />
      <div className="search-modal__panel" role="dialog" aria-modal="true" aria-label="Поиск по сайту">
        <div className="ss-searchbar">
          <svg className="ss-searchbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            id="ss-input"
            className="ss-searchbar__input"
            placeholder="Поиск оборудования…"
            autoComplete="off"
            aria-label="Поиск по сайту"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="ss-searchbar__clear" type="button" aria-label="Закрыть поиск" data-search-close="" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>
        <div id="ss-status" className="audit-search-status" role="status" aria-live="polite" aria-atomic="true">
          {showResults ? status : ''}
        </div>
        <div className="ss-results" id="ss-results" hidden={!showResults}>
          <div className="ss-count" id="ss-count" hidden={view.kind !== 'results'}>
            Найдено: <b>{items.length}</b>
          </div>
          <div className="ss-list" id="ss-list">
            {items.map((d) => (
              <a className="ss-card" href={d.url} key={d.url}>
                <div className="ss-card__body">
                  <div className="ss-card__title">{d.title || d.url}</div>
                  <div className="ss-card__excerpt" dangerouslySetInnerHTML={{ __html: d.excerpt }} />
                  <span className="ss-card__more">Подробнее →</span>
                </div>
                {d.image && <div className="ss-card__cover" style={{ backgroundImage: `url('${d.image.replace(/'/g, '%27')}')` }} />}
              </a>
            ))}
          </div>
          <div className="ss-empty" id="ss-empty" hidden={!(view.kind === 'error' || (view.kind === 'results' && !items.length))}>
            {view.kind === 'error'
              ? 'Поиск временно недоступен. Попробуйте позже.'
              : view.kind === 'results' && !items.length
                ? `Ничего не найдено по запросу «${view.query}»`
                : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
