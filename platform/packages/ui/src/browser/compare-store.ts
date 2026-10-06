/**
 * Хранилище «Сравнения» (перенос compare.js): localStorage ui_compare,
 * не больше 4 позиций и только из одного раздела, выбор живёт 30 дней.
 * Подписчики (кнопки, панель) перерисовываются при любом изменении — в том
 * числе из другой вкладки (событие storage).
 */
export const COMPARE_KEY = 'ui_compare';
export const COMPARE_LIMIT = 4;
export const COMPARE_PAGE = '/sravnenie/';
const TTL = 30 * 24 * 60 * 60 * 1000;

export interface CompareData {
  section: string;
  items: string[];
  ts?: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export function readCompare(): CompareData | null {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CompareData;
    if (!data || !Array.isArray(data.items) || !data.section) return null;
    if (data.ts && Date.now() - data.ts > TTL) {
      clearCompare();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeCompare(data: CompareData) {
  try {
    data.ts = Date.now();
    localStorage.setItem(COMPARE_KEY, JSON.stringify(data));
  } catch {
    /* приватный режим */
  }
  emit();
}

export function clearCompare() {
  try {
    localStorage.removeItem(COMPARE_KEY);
  } catch {
    /* приватный режим */
  }
  emit();
}

export function subscribeCompare(l: Listener): () => void {
  listeners.add(l);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

function onStorage(e: StorageEvent) {
  if (e.key === COMPARE_KEY) emit();
}

/** Добавить/убрать позицию. Раздел — адрес товара без последнего сегмента. */
export function toggleCompare(url: string): void {
  const section = url.replace(/[^/]+\/$/, '');
  let data = readCompare() ?? { section, items: [] };
  if (data.section !== section) {
    if (!window.confirm('В сравнении уже есть товары из другого раздела.\nНачать новое сравнение?')) return;
    data = { section, items: [] };
  }
  const i = data.items.indexOf(url);
  if (i === -1) {
    if (data.items.length >= COMPARE_LIMIT) {
      window.alert(`К сравнению можно добавить не больше ${COMPARE_LIMIT} позиций.\nУберите одну на странице сравнения.`);
      return;
    }
    data.items.push(url);
    try {
      const w = window as Window & { ym?: (...a: unknown[]) => void; uiYmId?: number };
      w.ym?.(w.uiYmId || 0, 'reachGoal', 'compare_add');
    } catch {
      /* Метрика недоступна */
    }
  } else {
    data.items.splice(i, 1);
  }
  if (data.items.length) writeCompare(data);
  else clearCompare();
}

/** API для страницы /sravnenie/ (compare-page.js) — прежний window.uiCompare. */
export function exposeCompareApi() {
  (window as Window & { uiCompare?: unknown }).uiCompare = {
    read: readCompare,
    write: writeCompare,
    clear: clearCompare,
    LIMIT: COMPARE_LIMIT,
  };
}
