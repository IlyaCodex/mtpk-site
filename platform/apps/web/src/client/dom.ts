/**
 * Помощники для клиентских модулей сайта. Страницы рендерятся на сервере
 * React-компонентами, в браузер уходит только этот небольшой TypeScript:
 * он «оживляет» готовую разметку (меню, формы, галереи), а не рисует её заново.
 */

export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);
export const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(selector));

/** Делегирование: один обработчик на документ — работает и для элементов, появившихся позже. */
export function delegate<K extends keyof DocumentEventMap>(
  type: K,
  selector: string,
  handler: (el: HTMLElement, e: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void {
  document.addEventListener(
    type,
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const el = target?.closest<HTMLElement>(selector);
      if (el) handler(el, e);
    },
    options,
  );
}

/** Видимые элементы, на которые можно перевести фокус. */
export function focusables(root: HTMLElement): HTMLElement[] {
  return $$<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]', root).filter(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  );
}

/** Tab по кругу внутри открытого окна. */
export function trapTab(e: KeyboardEvent, root: HTMLElement): void {
  if (e.key !== 'Tab') return;
  const list = focusables(root);
  if (!list.length) {
    e.preventDefault();
    return;
  }
  const first = list[0];
  const last = list[list.length - 1];
  const outside = !root.contains(document.activeElement);
  if (e.shiftKey && (document.activeElement === first || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (document.activeElement === last || outside)) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Модальное окно: всё вокруг становится недоступным (inert) — и для мыши, и
 * для скринридера. Возвращает функцию отмены.
 */
export function inertOutside(el: HTMLElement): () => void {
  const changed: { node: HTMLElement; inert: boolean }[] = [];
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children) as Element[]) {
      if (sibling === node || !(sibling instanceof HTMLElement) || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(sibling.tagName)) continue;
      changed.push({ node: sibling, inert: sibling.inert });
      sibling.inert = true;
    }
  }
  return () => {
    for (const c of changed) c.node.inert = c.inert;
  };
}

/** Пользователь просит меньше анимации. */
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Запуск после разбора документа (модули грузятся с defer, но на всякий случай). */
export function ready(fn: () => void): void {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}
