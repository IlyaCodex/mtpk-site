'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { withBase } from '@/lib/base-path';
import { plural } from '@/lib/catalog';
import { api } from '@/lib/client-api';
import { Icon } from './icons';
import { toast } from './toast';
import { Button, cx, formatBytes } from './ui';

type MediaFile = { key: string; url: string; size: number; contentType: string; updatedAt: string; webp: boolean };
type Listing = { prefix: string; folders: { name: string; prefix: string; count: number }[]; total: number; files: MediaFile[] };

/** Файлы показываются через прокси админки (/media-files → медиасервис). */
export const fileSrc = (url: string) => (url.startsWith('/') ? withBase(`/media-files${url}`) : url);
export const isImage = (key: string) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(key.split(/[?#]/)[0]);
/** Превью в сетке — уменьшенная копия (320 px, AVIF/WebP из медиасервиса), а не исходник в полный размер. */
const previewSrc = (url: string) => fileSrc(/\.(png|jpe?g|webp)$/i.test(url) ? `${url}?w=320` : url);
const ROOTS = ['img/', 'files/', 'docs/', 'og/'];
const keyPath = (key: string) => key.split('/').map(encodeURIComponent).join('/');

/** Кириллица и пробелы в имени файла — транслитом: адреса картинок остаются читаемыми. */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
/** Метка для адреса из названия: «Литейные смесители» → liteynye-smesiteli. */
export function slugify(text: string): string {
  return [...text.toLowerCase()]
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase();
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  const slug = [...base].map((c) => TRANSLIT[c] ?? c).join('').replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'file'}${ext}`;
}

/** Загрузить файл в папку медиатеки; возвращает адрес на сайте (/img/…). */
export async function uploadFile(folder: string, file: File): Promise<string> {
  const key = `${folder}${safeFileName(file.name)}`;
  const res = await api<{ url: string }>(`media/objects/${keyPath(key)}`, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  });
  return res.url;
}

/**
 * Медиатека: папки и файлы хранилища S3. mode=pick — выбор файла для поля
 * блока (multiple — нескольких сразу, например фото в галерею), manage —
 * раздел «Медиатека» (загрузка, удаление, копирование адреса).
 */
export function MediaBrowser({
  mode,
  initialPrefix = 'img/',
  multiple = false,
  onPick,
  onPickMany,
}: {
  mode: 'pick' | 'manage';
  initialPrefix?: string;
  multiple?: boolean;
  onPick?: (url: string) => void;
  onPickMany?: (urls: string[]) => void;
}) {
  const [prefix, setPrefix] = useState(initialPrefix);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  // новые папки этого сеанса: в S3 пустых папок не бывает — папка сохраняется вместе с первым файлом
  const [newFolders, setNewFolders] = useState<string[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ prefix, limit: '200', ...(search.trim() ? { search: search.trim() } : {}) });
      setData(await api<Listing>(`media/objects?${q}`));
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }, [prefix, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(files.length);
    const urls: string[] = [];
    for (const file of [...files]) {
      try {
        urls.push(await uploadFile(prefix, file));
      } catch (err) {
        toast.error(err);
      }
      setUploading((n) => n - 1);
    }
    if (urls.length) toast.ok(`Загружено файлов: ${urls.length}`);
    // загруженные сразу отмечаем выбранными — остаётся нажать «Добавить»
    if (mode === 'pick' && multiple) setSelected((s) => [...s, ...urls.filter((u) => !s.includes(u))]);
    await load();
  }

  async function remove(file: MediaFile) {
    if (!window.confirm(`Удалить ${file.url}? Если файл используется на страницах, там будет пустое место.`)) return;
    try {
      await api(`media/objects/${keyPath(file.key)}`, { method: 'DELETE' });
      toast.ok('Файл удалён');
      await load();
    } catch (err) {
      toast.error(err);
    }
  }

  /** Новая папка внутри открытой: адрес латиницей из названия, сразу открывается. */
  function createFolder() {
    const slug = slugify(folderName ?? '').slice(0, 60).replace(/-+$/, '');
    if (!slug) return toast.error('Название папки — буквы или цифры');
    const target = `${prefix}${slug}/`;
    if (!data?.folders.some((f) => f.prefix === target)) setNewFolders((n) => (n.includes(target) ? n : [...n, target]));
    setFolderName(null);
    setSearch('');
    setPrefix(target);
  }

  function choose(file: MediaFile) {
    if (mode === 'manage') return window.open(fileSrc(file.url), '_blank');
    if (!multiple) return onPick?.(file.url);
    setSelected((s) => (s.includes(file.url) ? s.filter((u) => u !== file.url) : [...s, file.url]));
  }

  const crumbs = prefix.split('/').filter(Boolean);
  // новые (ещё пустые) папки открытой папки — пока в них ничего не загрузили; сверка — только
  // со списком этой же папки (пока грузится новый, на экране ещё прежний)
  const fresh = data?.prefix === prefix ? data : null;
  const pendingFolders = fresh
    ? newFolders.filter((p) => p.startsWith(prefix) && p.slice(prefix.length).split('/').filter(Boolean).length === 1 && !fresh.folders.some((f) => f.prefix === p))
    : [];
  const isNewEmpty = Boolean(fresh && newFolders.includes(prefix) && !fresh.files.length && !fresh.folders.length);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {ROOTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setPrefix(r)}
              className={cx('rounded-md px-2 py-1', prefix.startsWith(r) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            >
              /{r}
            </button>
          ))}
        </div>
        <input className="field ml-auto max-w-64" placeholder="Поиск по имени файла" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={() => setFolderName((v) => (v === null ? '' : null))} aria-expanded={folderName !== null}>
          <Icon name="plus" className="h-4 w-4" />
          Новая папка
        </Button>
        <Button variant="primary" onClick={() => fileInput.current?.click()} disabled={uploading > 0}>
          {uploading ? `Загрузка… (${uploading})` : 'Загрузить файлы'}
        </Button>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => void upload(e.target.files)} />
      </div>

      {/* не <form>: окно выбора файла бывает внутри формы редактора, вложенная форма отправила бы внешнюю */}
      {folderName !== null && (
        <div role="group" aria-label="Новая папка" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input
            autoFocus
            className="field max-w-72"
            placeholder="Название папки, например «Проекты 2026»"
            value={folderName}
            maxLength={80}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createFolder();
              } else if (e.key === 'Escape') {
                // Esc закрывает только поле: окно выбора (Modal) обработанный Esc пропускает
                e.preventDefault();
                setFolderName(null);
              }
            }}
          />
          <span className="text-xs text-slate-500">
            адрес: <code className="text-slate-700">/{prefix}{slugify(folderName).slice(0, 60).replace(/-+$/, '') || '…'}/</code>
          </span>
          <span className="ml-auto flex gap-2">
            <Button onClick={() => setFolderName(null)}>Отмена</Button>
            <Button variant="primary" onClick={createFolder} disabled={!slugify(folderName)}>
              Создать
            </Button>
          </span>
        </div>
      )}

      <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Папка">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            <button type="button" className="hover:text-brand-600 hover:underline" onClick={() => setPrefix(`${crumbs.slice(0, i + 1).join('/')}/`)}>
              {c}
            </button>
          </span>
        ))}
        {loading && <span className="ml-2 text-xs text-slate-400">загрузка…</span>}
      </nav>

      {data && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {!search &&
            data.folders.map((f) => (
              <button
                key={f.prefix}
                type="button"
                onClick={() => setPrefix(f.prefix)}
                className="flex flex-col items-start rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="text-2xl">📁</span>
                <span className="mt-1 w-full truncate text-sm font-medium text-slate-800">{f.name}</span>
                <span className="text-xs text-slate-400">
                  {f.count} {plural(f.count, 'файл', 'файла', 'файлов')}
                </span>
              </button>
            ))}
          {!search &&
            pendingFolders.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrefix(p)}
                className="flex flex-col items-start rounded-lg border border-dashed border-brand-300 bg-brand-50/40 p-3 text-left hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="text-2xl">📁</span>
                <span className="mt-1 w-full truncate text-sm font-medium text-slate-800">{p.slice(prefix.length, -1)}</span>
                <span className="text-xs text-brand-700">новая — пока пустая</span>
              </button>
            ))}
          {data.files.map((f) => {
            const picked = selected.includes(f.url);
            return (
              <div key={f.key} className={cx('group relative overflow-hidden rounded-lg border bg-white', picked ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200')}>
                <button type="button" className="block aspect-[4/3] w-full bg-slate-100" onClick={() => choose(f)} title={mode === 'pick' ? 'Выбрать' : 'Открыть'}>
                  {isImage(f.key) ? (
                    <img src={previewSrc(f.url)} alt="" loading="lazy" className="h-full w-full object-contain" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs font-semibold text-slate-500 uppercase">{f.key.split('.').pop()}</span>
                  )}
                </button>
                {picked && (
                  <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {selected.indexOf(f.url) + 1}
                  </span>
                )}
                <div className="p-2">
                  <div className="truncate text-xs text-slate-700" title={f.url}>
                    {f.key.split('/').pop()}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {formatBytes(f.size)}
                      {f.webp && ' · webp'}
                    </span>
                    {mode === 'manage' && (
                      <span className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                        <button type="button" className="hover:text-brand-600" onClick={() => void navigator.clipboard.writeText(f.url).then(() => toast.ok('Адрес скопирован'))}>
                          адрес
                        </button>
                        <button type="button" className="hover:text-red-600" onClick={() => void remove(f)}>
                          удалить
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {isNewEmpty ? (
        <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/40 px-6 py-8 text-center text-sm text-slate-600">
          <div className="font-medium text-slate-800">Новая папка /{prefix}</div>
          <p className="mt-1">Загрузите в неё файлы — папка сохранится вместе с ними. Пустая папка в хранилище не сохраняется.</p>
          <Button variant="primary" className="mt-4" onClick={() => fileInput.current?.click()} disabled={uploading > 0}>
            Загрузить файлы сюда
          </Button>
        </div>
      ) : (
        data && !data.files.length && !data.folders.length && !pendingFolders.length && <p className="py-8 text-center text-sm text-slate-500">Здесь пусто.</p>
      )}
      {data && data.total > data.files.length && <p className="mt-3 text-xs text-slate-500">Показаны первые {data.files.length} из {data.total} — уточните поиск.</p>}

      {mode === 'pick' && multiple && (
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-600">{selected.length ? `Выбрано: ${selected.length}` : 'Отметьте фото — они добавятся в порядке выбора'}</span>
          <div className="flex gap-2">
            {selected.length > 0 && (
              <Button variant="ghost" onClick={() => setSelected([])}>
                Снять выбор
              </Button>
            )}
            <Button variant="primary" disabled={!selected.length} onClick={() => onPickMany?.(selected)}>
              Добавить выбранные
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Поле «картинка/файл»: адрес, превью и выбор из медиатеки. */
export function MediaInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const folder = value.startsWith('/') ? value.slice(1).replace(/[^/]+$/, '') : 'img/';
  return (
    <div className="flex items-start gap-3">
      {value && isImage(value) ? (
        <img src={fileSrc(value)} alt="" className="h-14 w-20 shrink-0 rounded border border-slate-200 bg-slate-100 object-contain" />
      ) : (
        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">нет</div>
      )}
      <div className="flex min-w-0 flex-1 gap-2">
        <input className="field font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} placeholder="/img/…" />
        <Button size="sm" className="h-9" onClick={() => setOpen(true)}>
          Выбрать…
        </Button>
      </div>
      {open && (
        <Modal title="Медиатека" onClose={() => setOpen(false)}>
          <MediaBrowser
            mode="pick"
            initialPrefix={folder || 'img/'}
            onPick={(url) => {
              onChange(url);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, width = 'max-w-5xl' }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  useEffect(() => {
    // Esc, уже обработанный полем внутри окна (preventDefault), окно не закрывает
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${width} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
