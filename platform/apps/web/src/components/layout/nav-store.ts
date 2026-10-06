/**
 * Состояние мобильного меню: кнопка-«бургер» живёт в шапке, само меню — в
 * конце страницы, поэтому общее состояние — маленький внешний стор
 * (useSyncExternalStore), а не контекст.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let open = false;

export const navStore = {
  isOpen: () => open,
  serverSnapshot: () => false,
  set(value: boolean) {
    if (open === value) return;
    open = value;
    for (const l of listeners) l();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
