'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { api } from '@/lib/client-api';
import type { BlockData } from './BlockList';
import { toast } from './toast';

export type EditablePage = {
  id: number;
  path: string;
  title: string;
  description: string | null;
  noindex: boolean;
  status: 'published' | 'draft';
  template: string;
  preloadImage: string | null;
  cssTemplates: string[];
  inlineStyles: string[];
  blocks: BlockData[];
  updatedAt: string;
  source: string;
};

/** Тело запроса сохранения — схема pageInput контент-сервиса. */
export const toInput = (p: EditablePage) => ({
  path: p.path,
  title: p.title,
  description: p.description || null,
  noindex: p.noindex,
  status: p.status,
  template: p.template,
  preloadImage: p.preloadImage || null,
  cssTemplates: p.cssTemplates,
  inlineStyles: p.inlineStyles,
  blocks: p.blocks,
});

/** Ещё что-то несохранённое на экране (карточка товара в каталоге) — сохраняется той же кнопкой. */
export type ExtraDraft = { dirty: boolean; save: () => void };

/**
 * Черновик страницы в редакторе: правки, «есть несохранённое», сохранение
 * (PUT /api/v1/content/pages/:id — сайт обновит страницу сам). Ctrl+S —
 * сохранить; уход со страницы с несохранёнными правками — предупреждение.
 */
export function usePageDraft(initial: EditablePage, extra?: RefObject<ExtraDraft | null>) {
  const [page, setPage] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(initial)));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(toInput(page)) !== saved;
  const update = useCallback((patch: Partial<EditablePage>) => setPage((p) => ({ ...p, ...patch })), []);

  /** Сохранить; patch — поправки, уже сделанные на сервере (новый адрес после переноса товара). */
  const save = useCallback(
    async (opts: { patch?: Partial<EditablePage>; quiet?: boolean } = {}) => {
      const next = { ...page, ...opts.patch };
      setSaving(true);
      try {
        await api(`content/pages/${page.id}`, { method: 'PUT', json: toInput(next) });
        if (opts.patch) setPage(next);
        setSaved(JSON.stringify(toInput(next)));
        if (!opts.quiet) toast.ok('Сохранено — страница на сайте обновится в течение минуты');
        return true;
      } catch (err) {
        toast.error(err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [page],
  );

  /** Поле уже изменено на сервере (адрес после переноса товара): в черновике и в «сохранённом». */
  const rebase = useCallback((patch: Pick<Partial<EditablePage>, 'path' | 'status'>) => {
    setPage((p) => ({ ...p, ...patch }));
    setSaved((s) => JSON.stringify({ ...JSON.parse(s), ...patch }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const x = extra?.current;
        if (x) {
          if ((dirty || x.dirty) && !saving) x.save();
        } else if (dirty && !saving) void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty || extra?.current?.dirty) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [dirty, saving, save, extra]);

  return { page, update, dirty, saving, save, rebase };
}
