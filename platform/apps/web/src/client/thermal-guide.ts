import { $, $$ } from './dom';

/**
 * Справочник «Режимы термообработки металлов» (Практикум, статья .ui-thermal-guide): поиск и фильтр
 * материалов по марке и группе, переход к записи по якорю (раскрывает карточку материала и полную
 * таблицу), пример W300 — длительность участка и график по введённым значениям.
 * Без скрипта статья читается целиком: поля поиска и примера в разметке отключены, их включает модуль.
 * Действия посетителя — событием ui-praktikum-event (detail: { name, … }); цели Метрики — consent.ts.
 */

const LATIN: Record<string, string> = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у' };

/** Марка для сравнения: латинские двойники кириллицы (T8A и Т8А), регистр, пробелы и знаки не важны. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/amg/g, 'амг')
    .replace(/[abcehkmoptxy]/g, (c) => LATIN[c] ?? c)
    .replace(/[^а-яёa-z0-9]/g, '');

const round = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

/** График примера W300: выдержка при t, затем охлаждение со скоростью rate до 600 °C (часы — после полного прогрева). */
function chartSvg(t: number, hold: number, rate: number): string {
  const end = hold + (t - 600) / rate;
  const max = Math.ceil(end / 4) * 4;
  const x = (n: number) => 70 + (n / max) * 580;
  const y = (n: number) => 270 - ((n - 550) / 300) * 210;
  const points = [
    [0, t],
    [hold, t],
    [end, 600],
  ]
    .map(([h, v]) => `${x(h)},${y(v)}`)
    .join(' ');
  const yTicks = [600, 650, 700, 750, 800]
    .map((v) => `<line x1="70" y1="${y(v)}" x2="650" y2="${y(v)}" stroke="#dce3e5"/><text x="58" y="${y(v) + 6}" text-anchor="end">${v}</text>`)
    .join('');
  const xTicks = Array.from({ length: 5 }, (_, i) => (max * i) / 4)
    .map((v) => `<text x="${x(v)}" y="298" text-anchor="middle">${round(v)}</text>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 350" role="img" aria-labelledby="tg-live-title tg-live-desc">` +
    `<title id="tg-live-title">W300: выдержка и регулируемое охлаждение</title>` +
    `<desc id="tg-live-desc">Пример: ${round(t)} градусов, ${round(hold)} часов выдержки, охлаждение ${round(rate)} градусов в час до 600 градусов. ` +
    `Длительность участка ${round(end)} часа. Нагрев и дальнейшее охлаждение не включены.</desc>` +
    `<rect width="720" height="350" fill="white"/><g font-family="Arial,sans-serif" font-size="18" fill="#1c3038">${yTicks}${xTicks}` +
    `<text x="70" y="30">Температура, °C</text><text x="360" y="335" text-anchor="middle">Часы после полного прогрева</text>` +
    `<polyline points="${points}" fill="none" stroke="#28723d" stroke-width="4"/><circle cx="${x(hold)}" cy="${y(t)}" r="5" fill="#28723d"/>` +
    `<text x="${x(hold) + 12}" y="${y(t) - 14}">Начало охлаждения</text><text x="${x(end) - 12}" y="${y(600) - 14}" text-anchor="end">600 °C</text></g></svg>`
  );
}

export function initThermalGuide(root: HTMLElement): void {
  const search = $<HTMLInputElement>('#tg-search', root);
  const group = $<HTMLSelectElement>('#tg-group', root);
  const counter = $('#tg-counter', root);
  const empty = $('#tg-empty', root);
  const regimeCount = $('#tg-regime-count', root);
  const cards = $$<HTMLDetailsElement>('.tg-material', root);
  const rows = $$<HTMLTableRowElement>('tr[data-regime]', root);

  const track = (name: string, params: Record<string, string> = {}) =>
    root.dispatchEvent(new CustomEvent('ui-praktikum-event', { bubbles: true, detail: { name, ...params } }));

  /** Карточки по поиску и группе; в таблице режимов — строки показанных материалов. */
  function filter(): void {
    const q = norm(search?.value ?? '');
    const g = group?.value ?? '';
    const ids = new Set<string>();
    let count = 0;
    for (const card of cards) {
      const show = (!q || norm(card.dataset.search ?? '').includes(q)) && (!g || card.dataset.group === g);
      card.hidden = !show;
      if (!show) continue;
      count++;
      for (const id of (card.dataset.regimes ?? '').split(' ')) if (id) ids.add(id);
    }
    for (const row of rows) row.hidden = q || g ? !ids.has(row.dataset.regime ?? '') : false;
    if (counter) counter.textContent = `Найдено материалов: ${count} из ${cards.length}`;
    if (empty) empty.hidden = count !== 0;
    if (regimeCount) regimeCount.textContent = String(rows.filter((r) => !r.hidden).length);
  }

  const clearFilter = () => {
    if (search) search.value = '';
    if (group) group.value = '';
    filter();
  };

  /** Переход по якорю: скрытую фильтром запись — показать, свёрнутую карточку и таблицу — раскрыть. */
  function reveal(hash: string): void {
    if (hash.length < 2) return;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* как есть */
    }
    const target = root.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
    if (!target) return;
    const material = target.closest<HTMLDetailsElement>('.tg-material');
    if (material) {
      clearFilter();
      material.open = true;
    }
    const table = target.closest<HTMLDetailsElement>('.tg-full-table');
    if (table) table.open = true;
    if (target instanceof HTMLTableRowElement) {
      if (target.hidden) clearFilter();
      const scroller = target.closest<HTMLElement>('.tg-table-scroll');
      if (scroller) scroller.scrollLeft = 0;
    }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }

  if (search && group) {
    search.disabled = false;
    group.disabled = false;
    search.addEventListener('input', filter);
    group.addEventListener('change', filter);
    $('#tg-reset', root)?.addEventListener('click', () => {
      for (const card of cards) card.open = false;
      clearFilter();
      search.focus();
    });
  }

  root.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a') : null;
    if (!a) return;
    if (a.hash && (a.getAttribute('href') ?? '').startsWith('#')) {
      reveal(a.hash);
      if (a.hash.startsWith('#regime-')) track('regime_open', { id: a.hash.slice('#regime-'.length) });
    }
    if (a.dataset.event) track(a.dataset.event);
  });
  window.addEventListener('hashchange', () => reveal(location.hash));

  // пример W300: значения только в пределах режима, иначе — подсказка вместо графика
  const fields = ['tg-temperature', 'tg-hold', 'tg-rate'].map((id) => $<HTMLInputElement>(`#${id}`, root));
  const error = $('#tg-example-error', root);
  const result = $('#tg-result', root);
  const chart = $('#tg-live-chart', root);
  const inputs = fields.every((f): f is HTMLInputElement => f !== null) ? fields : null;

  function update(): void {
    if (!inputs || !result || !chart) return;
    const [t, hold, rate] = inputs.map((f) => Number(f.value));
    const valid = inputs.every((f) => f.validity.valid) && t >= 750 && t <= 800 && hold >= 6 && hold <= 8 && rate >= 10 && rate <= 20;
    if (error) error.hidden = valid;
    chart.hidden = !valid;
    if (!valid) {
      result.textContent = 'Введите значения в указанных пределах.';
      chart.setAttribute('aria-hidden', 'true');
      return;
    }
    chart.removeAttribute('aria-hidden');
    result.textContent = `${round(hold)} + (${round(t)} − 600) / ${round(rate)} = ${round(hold + (t - 600) / rate)} ч`;
    chart.innerHTML = chartSvg(t, hold, rate);
  }

  for (const f of inputs ?? []) {
    f.disabled = false;
    f.addEventListener('input', update);
  }
  filter();
  update();
  if (location.hash) reveal(location.hash);
}
