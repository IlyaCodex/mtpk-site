/**
 * «Запросить цену»: накопленные позиции («Интересует УИД-376») — в
 * sessionStorage, чтобы переносились между страницами товаров. Формы заявок
 * подписываются на изменения и показывают позиции в поле «Задача».
 */
const KEY = 'ui_quote_items';
export const QUOTE_PREFIX = 'Интересует ';
type Listener = (items: string[]) => void;
const listeners = new Set<Listener>();

export function getQuoteItems(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function emit() {
  const items = getQuoteItems();
  for (const l of listeners) l(items);
}

export function addQuoteItem(name: string) {
  const items = getQuoteItems();
  if (!name || items.includes(name)) return emit();
  items.push(name);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* приватный режим */
  }
  emit();
}

export function clearQuoteItems() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* приватный режим */
  }
  emit();
}

export function subscribeQuote(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Текст поля задачи: управляемый блок «Интересует …» сверху, ручной текст — ниже. */
export function mergeTaskText(current: string, items: string[]): string {
  const managed = items.map((n) => QUOTE_PREFIX + n);
  const userText = current
    .split('\n')
    .filter((ln) => ln.lastIndexOf(QUOTE_PREFIX, 0) !== 0)
    .join('\n')
    .trim();
  const parts: string[] = [];
  if (managed.length) parts.push(managed.join('\n'));
  if (userText) parts.push(userText);
  return parts.join('\n\n');
}
