/**
 * Главная, «Оборудование»: витрина. Подсветка и рамка карточки идут за курсором, карточка слегка
 * наклоняется к нему (стили — styles/home-premium.css: --mx/--my — где курсор, --rx/--ry — наклон).
 * Только для мыши; при настройке «меньше анимации» — подсветка без наклона.
 */
import { $$, reducedMotion } from './dom';

/** Наибольший наклон карточки, градусов. */
const TILT = 5;

export function initShowcase(): void {
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
  const tilt = !reducedMotion();
  for (const card of $$('main > .equip .equip-card')) {
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      const r = card.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (x - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (y - r.top) / r.height));
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      if (!tilt) return;
      card.style.setProperty('--rx', `${((0.5 - py) * 2 * TILT).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((px - 0.5) * 2 * TILT).toFixed(2)}deg`);
    };
    card.addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      frame = 0;
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  }
}
