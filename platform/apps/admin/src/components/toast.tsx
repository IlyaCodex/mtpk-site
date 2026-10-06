'use client';

import { useSyncExternalStore } from 'react';

type Toast = { id: number; kind: 'ok' | 'error'; text: string };
let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(kind: Toast['kind'], text: string) {
  const id = ++seq;
  toasts = [...toasts, { id, kind, text }];
  emit();
  setTimeout(
    () => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    },
    kind === 'error' ? 8000 : 3500,
  );
}

/** Всплывающие уведомления: toast.ok('Сохранено'), toast.error(err). */
export const toast = {
  ok: (text: string) => push('ok', text),
  error: (err: unknown) => push('error', err instanceof Error ? err.message : String(err)),
};

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {list.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={
            t.kind === 'error'
              ? 'pointer-events-auto rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg'
              : 'pointer-events-auto rounded-lg border border-accent-100 bg-white px-4 py-3 text-sm text-accent-700 shadow-lg'
          }
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
