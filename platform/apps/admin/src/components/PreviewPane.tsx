'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import { MediaBrowser, Modal } from './media';
import { attachPreviewEditor, patchMain, type PagePatch, type PickRequest } from './preview-edit';
import type { EditablePage } from './use-page-draft';
import { cx } from './ui';

export type Device = 'desktop' | 'mobile' | 'off';

const headOf = (html: string) => html.slice(0, html.indexOf('<body>'));
const mainOf = (html: string) => html.slice(html.indexOf('<main>') + 6, html.lastIndexOf('</main>'));
/** Папка медиатеки, где лежит картинка: /img/drobemet/x.webp → img/drobemet/. */
const folderOf = (url: string) => (url.startsWith('/') ? url.slice(1).split('?')[0].replace(/[^/]+$/, '') : '') || 'img/';

/**
 * Предпросмотр страницы так, как её увидит посетитель: перерисовывается
 * через полсекунды после последней правки — на месте, без перезагрузки (не
 * прыгает к началу). Компьютер / телефон / скрыть. С onUpdate текст, картинки
 * и фоны можно править прямо в предпросмотре (preview-edit.ts).
 */
export function PreviewPane({
  page,
  device,
  onDevice,
  onUpdate,
}: {
  page: EditablePage;
  device: Device;
  onDevice: (d: Device) => void;
  onUpdate?: (patch: PagePatch) => void;
}) {
  const [doc, setDoc] = useState('');
  const [picking, setPicking] = useState<PickRequest | null>(null);
  const seq = useRef(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef('');
  const loaded = useRef<{ head: string; main: string } | null>(null);
  const editing = useRef(false);
  const scroll = useRef(0);
  const detach = useRef<(() => void) | null>(null);
  const current = useRef(page);
  current.current = page;
  const update = useRef(onUpdate);
  update.current = onUpdate;

  /** Показать последнюю отрисовку: та же шапка — заменить содержимое на месте, иначе загрузить заново. */
  const apply = useCallback(() => {
    const html = latest.current;
    // идёт правка в предпросмотре — покажем после неё
    if (!html || editing.current) return;
    const win = frame.current?.contentWindow;
    const main = frame.current?.contentDocument?.querySelector('main');
    if (main && loaded.current && loaded.current.head === headOf(html)) {
      const next = mainOf(html);
      if (loaded.current.main !== next) {
        patchMain(main, loaded.current.main, next);
        loaded.current.main = next;
      }
      return;
    }
    // другие стили страницы — загрузить заново, но остаться на том же месте
    scroll.current = loaded.current ? (win?.scrollY ?? 0) : 0;
    setDoc(html);
  }, []);

  useEffect(() => {
    if (device === 'off') return;
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await api<string>('preview', {
          json: { path: page.path, title: page.title, blocks: page.blocks, cssTemplates: page.cssTemplates, inlineStyles: page.inlineStyles },
        });
        if (my !== seq.current) return;
        latest.current = res;
        apply();
      } catch {
        /* ошибка предпросмотра не мешает редактированию */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [page.path, page.title, page.blocks, page.cssTemplates, page.inlineStyles, device, apply]);

  const onLoad = () => {
    const d = frame.current?.contentDocument;
    if (!d || !doc) return;
    loaded.current = { head: headOf(doc), main: mainOf(doc) };
    if (scroll.current) d.defaultView?.scrollTo(0, scroll.current);
    scroll.current = 0;
    detach.current?.();
    detach.current = update.current
      ? attachPreviewEditor(d, {
          getBlocks: () => current.current.blocks,
          getStyles: () => current.current.inlineStyles,
          onUpdate: (patch) => update.current?.(patch),
          onPick: setPicking,
          onSave: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })),
          onEditing: (active, changed) => {
            editing.current = active;
            // правка ушла в черновик — следом придёт новая отрисовка, старую не показываем
            if (!active && !changed) apply();
          },
        })
      : null;
    apply();
  };

  useEffect(() => {
    if (device !== 'off') return;
    detach.current = null;
    loaded.current = null;
    editing.current = false;
  }, [device]);

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
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-xs text-slate-500">
            <span className="font-medium tracking-wide uppercase">Предпросмотр</span>
            {onUpdate && <span className="ml-2 text-slate-400">щёлкните по тексту, картинке или фону — правка прямо здесь</span>}
          </span>
          <div className="flex shrink-0 gap-1">
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
            ref={frame}
            title="Предпросмотр страницы"
            srcDoc={doc}
            sandbox="allow-same-origin"
            onLoad={onLoad}
            className={cx('mx-auto h-full origin-top', device === 'mobile' ? 'w-[390px] border-x border-slate-200' : 'w-full')}
          />
        </div>
      </div>
      {picking && (
        <Modal title={`Заменить ${picking.what} — выберите в медиатеке или загрузите новую`} onClose={() => setPicking(null)}>
          <MediaBrowser
            mode="pick"
            initialPrefix={folderOf(picking.current)}
            onPick={(url) => {
              picking.choose(url);
              setPicking(null);
            }}
          />
        </Modal>
      )}
    </aside>
  );
}
