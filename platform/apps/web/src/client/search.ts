import { $, inertOutside, trapTab } from './dom';

/**
 * Поиск по сайту — окно по кнопке-«лупе». Модуль грузится только по первому
 * клику (страницы его не скачивают заранее); окно создаётся тогда же.
 * Классы — как у прежней модалки (стили в base-layout.css), данные — из
 * поискового сервиса (/api/search, PostgreSQL full-text).
 */
type Hit = { url: string; title: string; excerpt: string; image: string | null };

const TEMPLATE = `<div class="search-modal__backdrop" data-search-close></div>
<div class="search-modal__panel" role="dialog" aria-modal="true" aria-label="Поиск по сайту">
  <div class="ss-searchbar">
    <svg class="ss-searchbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
    <input type="text" id="ss-input" class="ss-searchbar__input" placeholder="Поиск оборудования…" autocomplete="off" aria-label="Поиск по сайту">
    <button class="ss-searchbar__clear" type="button" aria-label="Закрыть поиск" data-search-close>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
    </button>
  </div>
  <div id="ss-status" class="audit-search-status" role="status" aria-live="polite" aria-atomic="true"></div>
  <div class="ss-results" id="ss-results" hidden>
    <div class="ss-count" id="ss-count" hidden>Найдено: <b></b></div>
    <div class="ss-list" id="ss-list"></div>
    <div class="ss-empty" id="ss-empty" hidden></div>
  </div>
</div>`;

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Отсев шумных совпадений: каждое слово запроса (по первым 3 буквам) — в заголовке или фрагменте. */
function relevant(hit: Hit, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  const hay = `${hit.title} ${hit.excerpt.replace(/<[^>]+>/g, '')}`.toLowerCase();
  return words.every((w) => hay.includes(w.length >= 3 ? w.slice(0, 3) : w));
}

let modal: HTMLElement | null = null;
let restore: (() => void) | null = null;
let opener: Element | null = null;
let lastQuery = '';
let timer = 0;

function render(q: string, hits: Hit[] | 'error' | null): void {
  if (!modal) return;
  const results = $('#ss-results', modal)!;
  const status = $('#ss-status', modal)!;
  const count = $('#ss-count', modal)!;
  const list = $('#ss-list', modal)!;
  const empty = $('#ss-empty', modal)!;
  if (hits === null) {
    results.hidden = true;
    status.textContent = '';
    return;
  }
  results.hidden = false;
  if (hits === 'error') {
    count.hidden = true;
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = 'Поиск временно недоступен. Попробуйте позже.';
    status.textContent = empty.textContent;
    return;
  }
  count.hidden = false;
  $('b', count)!.textContent = String(hits.length);
  list.innerHTML = hits
    .map(
      (d) =>
        `<a class="ss-card" href="${escapeHtml(d.url)}"><div class="ss-card__body"><div class="ss-card__title">${escapeHtml(d.title || d.url)}</div><div class="ss-card__excerpt">${d.excerpt}</div><span class="ss-card__more">Подробнее →</span></div>${d.image ? `<div class="ss-card__cover" style="background-image:url('${escapeHtml(d.image.replace(/'/g, '%27'))}')"></div>` : ''}</a>`,
    )
    .join('');
  empty.hidden = hits.length > 0;
  empty.textContent = hits.length ? '' : `Ничего не найдено по запросу «${q}»`;
  status.textContent = hits.length ? `Найдено: ${hits.length}` : 'Ничего не найдено';
}

function query(q: string): void {
  lastQuery = q;
  window.clearTimeout(timer);
  if (q.trim().length < 2) return render(q, null);
  timer = window.setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=40`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { results: Hit[] };
      if (q === lastQuery) render(q, data.results.filter((d) => relevant(d, q)));
    } catch {
      if (q === lastQuery) render(q, 'error');
    }
  }, 160);
}

function close(): void {
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.documentElement.style.overflow = '';
  restore?.();
  restore = null;
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
}

function create(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'search-modal';
  el.id = 'search-modal';
  el.hidden = true;
  el.innerHTML = TEMPLATE;
  document.body.appendChild(el);
  const input = $<HTMLInputElement>('#ss-input', el)!;
  input.addEventListener('input', () => query(input.value));
  el.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('[data-search-close]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else trapTab(e, el);
  });
  return el;
}

export function openSearch(q?: string): void {
  modal ??= create();
  if (!modal.hidden) return;
  opener = document.activeElement;
  modal.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  restore = inertOutside(modal);
  const input = $<HTMLInputElement>('#ss-input', modal)!;
  if (q !== undefined) {
    input.value = q;
    query(q);
  }
  input.focus();
}
