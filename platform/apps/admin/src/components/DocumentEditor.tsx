'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import { CodeEditor } from './CodeEditor';
import { attachDocumentEditor, type DocPickRequest, type DocumentEditor as LiveEditor, type SourceEdit } from './document-edit';
import { EditorHeader, type Crumb } from './EditorHeader';
import { MediaBrowser, Modal } from './media';
import { toast } from './toast';
import { cx, Field } from './ui';

/** Страница-документ (Практикум): HTML целиком и то, что о нём знает сайт. */
export type EditableDocument = {
  id: number;
  path: string;
  title: string;
  description: string | null;
  noindex: boolean;
  status: 'published' | 'draft';
  body: string;
  updatedAt: string;
};

type Draft = Pick<EditableDocument, 'title' | 'description' | 'noindex' | 'status' | 'body'>;
type Device = 'desktop' | 'mobile' | 'off';
type Tab = 'text' | 'code' | 'seo';
type Heading = { level: number; text: string; el: Element };

const snapshot = (d: Draft) => JSON.stringify([d.title, d.description ?? '', d.noindex, d.status, d.body]);
/** Папка медиатеки, где лежит картинка: /img/x/y.webp → img/x/. */
const folderOf = (url: string) => (url.startsWith('/') ? url.slice(1).split('?')[0].replace(/[^/]+$/, '') : '') || 'img/';

/**
 * Редактор страницы-документа (статьи Практикума — целые HTML-документы):
 * текст и картинки правятся щелчком прямо в предпросмотре, весь документ — во
 * вкладке «HTML-код», заголовок и описание — во вкладке «SEO» (они живут в
 * <head> документа, сервис записывает их туда). Сохранение — как у страниц:
 * кнопка или Ctrl+S, сайт показывает новую версию сразу.
 */
export function DocumentEditor({ initial, siteUrl, crumbs }: { initial: EditableDocument; siteUrl: string; crumbs: Crumb[] }) {
  const first: Draft = { title: initial.title, description: initial.description, noindex: initial.noindex, status: initial.status, body: initial.body };
  const [draft, setDraft] = useState<Draft>(first);
  const [saved, setSaved] = useState(() => snapshot(first));
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [tab, setTab] = useState<Tab>('text');
  const [device, setDevice] = useState<Device>('desktop');
  const [outline, setOutline] = useState<Heading[]>([]);
  const dirty = snapshot(draft) !== saved;
  const update = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);

  // правка в предпросмотре: он её уже показывает — перерисовывать не нужно
  const live = useRef(false);
  const applyEdit = useCallback((e: SourceEdit) => {
    live.current = true;
    setDraft((d) => ({ ...d, body: d.body.slice(0, e.from) + e.text + d.body.slice(e.to) }));
  }, []);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const save = useCallback(async () => {
    const d = draftRef.current;
    if (!d.title.trim()) {
      toast.error('Укажите заголовок страницы (вкладка «SEO и публикация»)');
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ body: string }>(`content/documents/${initial.id}`, {
        method: 'PUT',
        json: { title: d.title.trim(), description: d.description?.trim() || null, noindex: d.noindex, status: d.status, body: d.body },
      });
      // сервис мог вписать заголовок и описание в <head> — берём его версию
      const next = { ...d, title: d.title.trim(), body: res.body };
      setDraft(next);
      setSaved(snapshot(next));
      setUpdatedAt(new Date().toISOString());
      toast.ok('Сохранено — страница на сайте уже обновлена');
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }, [initial.id]);

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

  return (
    <div className="-mx-8 -my-8">
      <EditorHeader
        crumbs={crumbs}
        title={draft.title.split('|')[0].trim() || initial.path}
        subtitle={<span className="font-mono">{initial.path}</span>}
        status={draft.status}
        updatedAt={updatedAt}
        siteHref={`${siteUrl}${initial.path}`}
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
      />

      <div className={cx('grid gap-6 px-8 py-6', device !== 'off' && '2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]')}>
        <div className="min-w-0">
          <div className="mb-4 flex gap-1 border-b border-slate-200">
            {(
              [
                ['text', 'Текст'],
                ['code', 'HTML-код'],
                ['seo', 'SEO и публикация'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cx('-mb-px border-b-2 px-4 py-2 text-sm', tab === id ? 'border-brand-600 font-medium text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'text' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600 shadow-xs">
                <p>
                  Это статья Практикума — <b>целый HTML-документ</b> со своим оформлением. Правьте её прямо в предпросмотре: <b>щёлкните по тексту</b> — он
                  станет редактируемым, Enter или щелчок мимо — готово, Esc — отмена. <b>Щелчок по картинке</b> — замена из медиатеки.
                </p>
                <p className="mt-2">Таблицы, списки, новые разделы и всё остальное — во вкладке «HTML-код» (поиск и замена — Ctrl+F). Сохранить — кнопка вверху или Ctrl+S.</p>
              </div>
              {outline.length > 0 && (
                <nav className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs" aria-label="Разделы документа">
                  <div className="px-2 pb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">Разделы — щёлкните, чтобы перейти</div>
                  <ul className="max-h-[55vh] space-y-0.5 overflow-y-auto">
                    {outline.map((h, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => h.el.scrollIntoView({ block: 'start' })}
                          className={cx('w-full truncate rounded-md px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-100', h.level > 2 && 'pl-6 text-slate-500', h.level === 1 && 'font-semibold')}
                        >
                          {h.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          )}

          {tab === 'code' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Документ целиком: &lt;head&gt; со стилями и скриптами и содержимое. Предпросмотр обновится через полсекунды после правки.</p>
              <CodeEditor value={draft.body} onChange={(body) => update({ body })} lang="html" />
            </div>
          )}

          {tab === 'seo' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <Field label="Адрес страницы" hint="Адрес статьи Практикума здесь не меняется: на неё ссылаются другие статьи раздела">
                <input className="field font-mono" value={initial.path} readOnly disabled />
              </Field>
              <Field label="Заголовок для поисковиков (title)" hint={`${draft.title.length} символов · записывается в <title> документа (и в og:title)`}>
                <input className="field" value={draft.title} onChange={(e) => update({ title: e.target.value })} />
              </Field>
              <Field label="Описание для поисковиков (description)" hint={`${(draft.description ?? '').length} символов · записывается в <meta name="description"> документа, лучше до 160`}>
                <textarea className="field" rows={3} value={draft.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
              </Field>
              <Field label="Публикация">
                <select className="field" value={draft.status} onChange={(e) => update({ status: e.target.value as Draft['status'] })}>
                  <option value="published">На сайте</option>
                  <option value="draft">Черновик (на сайте не виден)</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={draft.noindex} onChange={(e) => update({ noindex: e.target.checked })} />
                Скрыть от поисковиков (noindex — и в &lt;meta name=&quot;robots&quot;&gt; документа)
              </label>
            </div>
          )}
        </div>

        <DocumentPreview body={draft.body} live={live} device={device} onDevice={setDevice} onEdit={applyEdit} onSave={() => void save()} onOutline={setOutline} />
      </div>
    </div>
  );
}

/**
 * Предпросмотр документа с правкой щелчком: перерисовывается через полсекунды
 * после правки кода или сохранения — на том же месте прокрутки; правки щелчком он
 * показывает сам (live), без перерисовки.
 */
function DocumentPreview({
  body,
  live,
  device,
  onDevice,
  onEdit,
  onSave,
  onOutline,
}: {
  body: string;
  live: React.RefObject<boolean>;
  device: Device;
  onDevice: (d: Device) => void;
  onEdit: (e: SourceEdit) => void;
  onSave: () => void;
  onOutline: (h: Heading[]) => void;
}) {
  const [doc, setDoc] = useState('');
  const [picking, setPicking] = useState<DocPickRequest | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const editor = useRef<LiveEditor | null>(null);
  const editing = useRef(false);
  const pending = useRef<string | null>(null);
  const scroll = useRef(0);
  const seq = useRef(0);
  const handlers = useRef({ onEdit, onSave, onOutline });
  handlers.current = { onEdit, onSave, onOutline };

  /** Документ, пометки которого устарели (поменяли код): щелчком в нём не правим — ждём новую отрисовку. */
  const staleDoc = useRef<Document | null>(null);
  const version = useRef(0);

  const show = useCallback((html: string) => {
    // идёт правка — покажем после неё
    if (editing.current) {
      pending.current = html;
      return;
    }
    scroll.current = frame.current?.contentWindow?.scrollY ?? 0;
    // метка версии: даже тот же HTML загружается заново — с новыми пометками
    setDoc(`${html}<!--v${++version.current}-->`);
  }, []);

  useEffect(() => {
    if (device === 'off') return;
    if (live.current && doc) {
      live.current = false;
      return;
    }
    live.current = false;
    if (doc && frame.current?.contentDocument) {
      staleDoc.current = frame.current.contentDocument;
      editor.current?.detach();
      editor.current = null;
    }
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const html = await api<string>('preview-document', { json: { body } });
        if (my === seq.current) show(html);
      } catch {
        /* ошибка предпросмотра не мешает редактированию */
      }
    }, doc ? 500 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, device]);

  /** Подключить правку, как только документ разобран (картинки не ждём). */
  const attached = useRef<Document | null>(null);
  const attach = () => {
    const d = frame.current?.contentDocument;
    if (!d || !doc || d === attached.current || d === staleDoc.current || d.readyState === 'loading' || !d.body) return;
    attached.current = d;
    editor.current?.detach();
    if (scroll.current) d.defaultView?.scrollTo(0, scroll.current);
    scroll.current = 0;
    editor.current = attachDocumentEditor(d, {
      onEdit: (e) => handlers.current.onEdit(e),
      onPick: setPicking,
      onSave: () => handlers.current.onSave(),
      onEditing: (active) => {
        editing.current = active;
        if (!active && pending.current) {
          const html = pending.current;
          pending.current = null;
          show(html);
        }
      },
    });
    handlers.current.onOutline(
      [...d.querySelectorAll('h1, h2, h3')]
        .map((el) => ({ level: Number(el.tagName[1]), text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(), el }))
        .filter((h) => h.text),
    );
  };
  const attachRef = useRef(attach);
  attachRef.current = attach;
  useEffect(() => {
    if (!doc || device === 'off') return;
    const timer = setInterval(() => attachRef.current(), 50);
    const stop = setTimeout(() => clearInterval(timer), 30_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [doc, device]);

  useEffect(() => {
    if (device !== 'off') return;
    editor.current = null;
    attached.current = null;
    editing.current = false;
    setDoc('');
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
            <span className="ml-2 text-slate-400">щёлкните по тексту или картинке, чтобы изменить</span>
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
            title="Предпросмотр документа"
            srcDoc={doc}
            sandbox="allow-same-origin"
            onLoad={attach}
            className={cx('mx-auto h-full origin-top', device === 'mobile' ? 'w-[390px] border-x border-slate-200' : 'w-full')}
          />
        </div>
      </div>
      {picking && (
        <Modal title="Заменить картинку — выберите в медиатеке или загрузите новую" onClose={() => setPicking(null)}>
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
