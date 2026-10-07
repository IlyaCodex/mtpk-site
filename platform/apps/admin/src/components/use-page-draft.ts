'use client';

import { useCallback, useEffect, useState } from 'react';
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

/**
 * Черновик страницы в редакторе: правки, «есть несохранённое», сохранение
 * (PUT /api/v1/content/pages/:id — сайт обновит страницу сам). Ctrl+S —
 * сохранить; уход со страницы с несохранёнными правками — предупреждение.
 */
export function usePageDraft(initial: EditablePage) {
  const [page, setPage] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(initial)));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(toInput(page)) !== saved;
  const update = useCallback((patch: Partial<EditablePage>) => setPage((p) => ({ ...p, ...patch })), []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api(`content/pages/${page.id}`, { method: 'PUT', json: toInput(page) });
      setSaved(JSON.stringify(toInput(page)));
      toast.ok('Сохранено — страница на сайте обновится в течение минуты');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !saving) void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [dirty, saving, save]);

  return { page, update, dirty, saving, save };
}
