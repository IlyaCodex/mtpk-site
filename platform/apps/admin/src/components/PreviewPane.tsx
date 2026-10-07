'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import type { EditablePage } from './use-page-draft';
import { cx } from './ui';

export type Device = 'desktop' | 'mobile' | 'off';

/**
 * Предпросмотр страницы так, как её увидит посетитель: перерисовывается
 * через полсекунды после последней правки. Компьютер / телефон / скрыть.
 */
export function PreviewPane({ page, device, onDevice }: { page: EditablePage; device: Device; onDevice: (d: Device) => void }) {
  const [html, setHtml] = useState('');
  const seq = useRef(0);
  useEffect(() => {
    if (device === 'off') return;
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await api<string>('preview', {
          json: { path: page.path, title: page.title, blocks: page.blocks, cssTemplates: page.cssTemplates, inlineStyles: page.inlineStyles },
        });
        if (my === seq.current) setHtml(res);
      } catch {
        /* ошибка предпросмотра не мешает редактированию */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [page.path, page.title, page.blocks, page.cssTemplates, page.inlineStyles, device]);

  if (device === 'off') {
    return (
      <button type="button" className="fixed right-6 bottom-6 z-30 rounded-full bg-brand-600 px-4 py-2 text-sm text-white shadow-lg" onClick={() => onDevice('desktop')}>
        Показать предпросмотр
      </button>
    );
  }
  return (
    <aside className="min-w-0">
      <div className="sticky top-20">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">Предпросмотр</span>
          <div className="flex gap-1">
            {(['desktop', 'mobile', 'off'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDevice(d)}
                className={cx('rounded-md px-2 py-1 text-xs', device === d ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {d === 'desktop' ? 'Компьютер' : d === 'mobile' ? 'Телефон' : 'Скрыть'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <iframe
            title="Предпросмотр страницы"
            srcDoc={html}
            sandbox="allow-same-origin"
            className={cx('mx-auto h-full origin-top', device === 'mobile' ? 'w-[390px] border-x border-slate-200' : 'w-full')}
          />
        </div>
      </div>
    </aside>
  );
}
