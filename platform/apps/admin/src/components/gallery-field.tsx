'use client';

import { useRef, useState, type DragEvent } from 'react';
import { uploadFolderFor, useEditorContext } from './editor-context';
import { Icon } from './icons';
import { fileSrc, isImage, MediaBrowser, MediaInput, Modal, uploadFile } from './media';
import { toast } from './toast';
import { Button, cx } from './ui';

export type Photo = { src: string; alt: string; thumb?: string; caption?: string; href?: string };
/** Дополнительные поля фото (у виджетов): подпись, ссылка. */
export type PhotoField = { key: 'caption' | 'href'; placeholder: string };

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/**
 * Галерея фото товара: сетка карточек. Первое фото — главное. Порядок —
 * перетаскиванием или стрелками; фото добавляются загрузкой с компьютера
 * (кнопкой или перетаскиванием файлов на галерею) и выбором из медиатеки.
 * Новые файлы кладутся в папку товара: img/products/<адрес>/ (или в folder).
 * Фото виджетов (сетка, карусель): primary=false — без «главного» и
 * миниатюры, fields — подпись и ссылка под каждым фото.
 */
export function GalleryField({
  value,
  onChange,
  label,
  primary = true,
  fields = [],
  folder: ownFolder,
}: {
  value: Photo[];
  onChange: (v: Photo[]) => void;
  label?: string;
  primary?: boolean;
  fields?: PhotoField[];
  /** папка медиатеки для загрузок (по умолчанию — папка страницы) */
  folder?: string;
}) {
  const { pagePath } = useEditorContext();
  const folder = ownFolder ?? uploadFolderFor(pagePath);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [filesOver, setFilesOver] = useState(false);
  const [details, setDetails] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = (i: number, patch: Partial<Photo>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const add = (urls: string[]) => onChange([...value, ...urls.filter((u) => !value.some((p) => p.src === u)).map((src) => ({ src, alt: '' }))]);

  async function upload(files: FileList | File[]) {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return toast.error('Можно загрузить только изображения');
    setUploading(images.length);
    const urls: string[] = [];
    for (const file of images) {
      try {
        urls.push(await uploadFile(folder, file));
      } catch (err) {
        toast.error(err);
      }
      setUploading((n) => n - 1);
    }
    if (urls.length) {
      add(urls);
      toast.ok(`Добавлено фото: ${urls.length}`);
    }
  }

  // перетаскивание: карточки внутри галереи меняют порядок, файлы с компьютера — загружаются
  const isFileDrag = (e: DragEvent) => e.dataTransfer.types.includes('Files');
  function onDropCard(e: DragEvent, i: number) {
    e.preventDefault();
    if (isFileDrag(e)) return;
    if (dragFrom !== null) onChange(move(value, dragFrom, i));
    setDragFrom(null);
    setDragOver(null);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label ?? 'Фотографии'}</span>
        <span className="text-[11px] text-slate-400">
          {value.length} фото{primary ? ' · первое — главное' : ''} · порядок меняется перетаскиванием
        </span>
      </div>

      <div
        className={cx('rounded-xl border-2 border-dashed p-3 transition', filesOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50/60')}
        onDragOver={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setFilesOver(true);
        }}
        onDragLeave={() => setFilesOver(false)}
        onDrop={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setFilesOver(false);
          void upload(e.dataTransfer.files);
        }}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {value.map((p, i) => (
            <div
              key={`${p.src}-${i}`}
              draggable
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragOver={(e) => {
                if (isFileDrag(e)) return;
                e.preventDefault();
                setDragOver(i);
              }}
              onDrop={(e) => onDropCard(e, i)}
              className={cx(
                'group relative overflow-hidden rounded-lg border bg-white shadow-xs transition',
                primary && i === 0 ? 'border-accent-500' : 'border-slate-200',
                dragOver === i && dragFrom !== i && 'ring-2 ring-brand-400',
                dragFrom === i && 'opacity-40',
              )}
            >
              <div className="relative aspect-[4/3] cursor-grab bg-slate-100 active:cursor-grabbing">
                {isImage(p.thumb ?? p.src) ? (
                  <img src={fileSrc(p.thumb ?? p.src)} alt="" className="h-full w-full object-contain" draggable={false} />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-slate-400">нет картинки</span>
                )}
                <span
                  className={cx(
                    'absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    primary && i === 0 ? 'bg-accent-600 text-white' : 'bg-white/90 text-slate-600',
                  )}
                >
                  {primary && i === 0 ? 'Главное' : i + 1}
                </span>
                <button
                  type="button"
                  title="Убрать из галереи"
                  className="absolute top-1.5 right-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow hover:text-red-600 group-hover:flex"
                  aria-label="Убрать из галереи"
                  onClick={() => window.confirm('Убрать фото из галереи? Файл останется в медиатеке.') && onChange(value.filter((_, j) => j !== i))}
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1.5 p-2">
                <input
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
                  placeholder="Что на фото (для поиска и слабовидящих)"
                  value={p.alt}
                  onChange={(e) => set(i, { alt: e.target.value })}
                />
                {fields.map((f) => (
                  <input
                    key={f.key}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
                    placeholder={f.placeholder}
                    value={p[f.key] ?? ''}
                    onChange={(e) => set(i, { [f.key]: e.target.value || undefined })}
                  />
                ))}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex gap-1">
                    <button type="button" className="rounded px-1 py-0.5 hover:bg-slate-100" title="Левее" aria-label="Левее" onClick={() => onChange(move(value, i, i - 1))}>
                      <Icon name="left" className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="rounded px-1 py-0.5 hover:bg-slate-100" title="Правее" aria-label="Правее" onClick={() => onChange(move(value, i, i + 1))}>
                      <Icon name="right" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                  {primary && i > 0 ? (
                    <button type="button" className="hover:text-accent-700" onClick={() => onChange(move(value, i, 0))}>
                      сделать главным
                    </button>
                  ) : (
                    <span />
                  )}
                  <button type="button" className="hover:text-brand-600" onClick={() => setDetails(details === i ? null : i)}>
                    ещё
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* плитка «добавить» — всегда последняя */}
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center">
            <Button size="sm" variant="primary" disabled={uploading > 0} onClick={() => fileInput.current?.click()}>
              {uploading ? `Загрузка… ${uploading}` : 'Загрузить фото'}
            </Button>
            <Button size="sm" onClick={() => setPicking(true)}>
              Из медиатеки
            </Button>
            <span className="text-[10px] text-slate-400">или перетащите файлы сюда</span>
          </div>
        </div>
      </div>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />

      {details !== null && value[details] && (
        <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium text-slate-600">Фото {details + 1}: файлы</div>
          <MediaInput value={value[details].src} onChange={(src) => set(details, { src })} />
          {primary && (
            <div>
              <div className="mb-1 text-xs text-slate-500">Отдельная миниатюра (необязательно — у новых фото не нужна)</div>
              <MediaInput value={value[details].thumb ?? ''} onChange={(thumb) => set(details, { thumb: thumb || undefined })} />
            </div>
          )}
        </div>
      )}

      {picking && (
        <Modal title="Добавить фото из медиатеки" onClose={() => setPicking(false)}>
          <MediaBrowser
            mode="pick"
            multiple
            initialPrefix={value[0]?.src.startsWith('/img/') ? value[0].src.slice(1).replace(/[^/]+$/, '') : 'img/'}
            onPickMany={(urls) => {
              add(urls);
              setPicking(false);
              toast.ok(`Добавлено фото: ${urls.length}`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
