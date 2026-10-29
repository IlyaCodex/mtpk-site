import { $, $$ } from './dom';

/**
 * Статьи Практикума об индукторах (.ui-education): учебная проверка размерной цепи зазора (глава «Геометрия»):
 * остаток = от меди до холодной детали − изоляция − приближение при установке − приближение при нагреве.
 * Без скрипта поля и кнопка в разметке отключены, показан исходный пример — их включает модуль.
 * Переход по ссылке с data-inductor-event (письмо, каталог) — событием ui-praktikum-event; цели Метрики — consent.ts.
 */

const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
/** Учебный пример статьи: 4 − 0,5 − 0,8 − 0,4 = 2,3 мм. */
const EXAMPLE = [4, 0.5, 0.8, 0.4];

function gapCalculator(box: HTMLElement): void {
  const fields = $$<HTMLInputElement>('[data-gap]', box);
  const out = $<HTMLElement>('[data-gap-result]', box);
  const warning = $<HTMLElement>('[data-gap-warning]', box);
  const reset = $<HTMLButtonElement>('[data-gap-reset]', box);
  if (fields.length !== EXAMPLE.length || !out || !warning || !reset) return;
  const update = () => {
    const values = fields.map((f) => Number(f.value));
    if (fields.some((f) => f.value.trim() === '' || !f.validity.valid) || values.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
      out.textContent = 'Проверьте ввод: числа от 0 до 100 мм, не более трёх знаков после запятой.';
      warning.textContent = 'Расчёт не выполнен. Это не подбор электрически допустимого расстояния.';
      warning.classList.add('calc-warning');
      return;
    }
    const [initial, ...minus] = values;
    const rest = Math.round((initial - minus.reduce((a, b) => a + b, 0)) * 1e9) / 1e9;
    out.textContent = `${values.map(fmt).join(' − ')} = ${fmt(rest)} мм`;
    warning.textContent =
      rest <= 0
        ? 'Запаса нет: при этих допущениях поверхности соприкасаются или геометрически пересекаются. Пересмотрите размерную цепь.'
        : 'Положительный остаток не подтверждает допустимость электрического расстояния.';
    warning.classList.toggle('calc-warning', rest <= 0);
  };
  for (const f of fields) {
    f.disabled = false;
    f.addEventListener('input', update);
  }
  reset.disabled = false;
  reset.addEventListener('click', () => {
    fields.forEach((f, i) => (f.value = String(EXAMPLE[i])));
    update();
  });
  update();
}

export function initInductorGuide(root: HTMLElement): void {
  for (const box of $$<HTMLElement>('[data-gap-calculator]', root)) gapCalculator(box);
  root.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-inductor-event]');
    const name = a?.dataset.inductorEvent;
    if (name) a.dispatchEvent(new CustomEvent('ui-praktikum-event', { bubbles: true, detail: { name } }));
  });
}
