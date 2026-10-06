'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import { BlockList, type BlockData, type BlockSchemas } from './BlockList';
import { EditorContext } from './editor-context';
import { toast } from './toast';
import { Badge, Button, cx, Field, formatDate } from './ui';

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

type Tab = 'blocks' | 'seo' | 'styles';

/** Тело запроса сохранения — схема pageInput контент-сервиса. */
const toInput = (p: EditablePage) => ({
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
 * Редактор страницы: блоки (порядок и поля), SEO, стили и предпросмотр.
 * Сохранение — PUT /api/v1/content/pages/:id; сайт обновляет страницу сам
 * (контент-сервис шлёт сигнал ревалидации).
 */
export function PageEditor({ initial, schemas, siteUrl }: { initial: EditablePage; schemas: BlockSchemas; siteUrl: string }) {
  const [page, setPage] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(initial)));
  const [tab, setTab] = useState<Tab>('blocks');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState('');
  const [device, setDevice] = useState<'desktop' | 'mobile' | 'off'>('desktop');
  const dirty = JSON.stringify(toInput(page)) !== saved;
  const update = (patch: Partial<EditablePage>) => setPage((p) => ({ ...p, ...patch }));

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

  // Ctrl+S — сохранить; уход со страницы с несохранёнными правками — предупредить
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

  // Предпросмотр: перерисовка через полсекунды после последней правки
  const previewSeq = useRef(0);
  useEffect(() => {
    if (device === 'off') return;
    const seq = ++previewSeq.current;
    const t = setTimeout(async () => {
      try {
        const html = await api<string>('preview', {
          json: { path: page.path, title: page.title, blocks: page.blocks, cssTemplates: page.cssTemplates, inlineStyles: page.inlineStyles },
        });
        if (seq === previewSeq.current) setPreview(html);
      } catch {
        /* ошибка предпросмотра не мешает редактированию */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [page.path, page.title, page.blocks, page.cssTemplates, page.inlineStyles, device]);

  const htmlBlocks = page.blocks.filter((b) => b.type === 'html').length;

  return (
    <div className="-mx-8 -my-8">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-8 py-3 backdrop-blur">
        <Link href="/pages" className="text-sm text-slate-500 hover:text-brand-600">
          ← Страницы
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-slate-900">{page.title.split('|')[0].trim() || 'Без названия'}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{page.path}</span>
            <Badge tone={page.status === 'published' ? 'green' : 'amber'}>{page.status === 'published' ? 'опубликована' : 'черновик'}</Badge>
            <span>изменена {formatDate(page.updatedAt)}</span>
          </div>
        </div>
        <a href={`${siteUrl}${page.path}`} target="_blank" rel="noopener" className="text-sm text-brand-600 hover:underline">
          Открыть на сайте ↗
        </a>
        <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Сохранено'}
        </Button>
      </header>

      <div className={cx('grid gap-6 px-8 py-6', device !== 'off' && '2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        <div className="min-w-0">
          <div className="mb-4 flex gap-1 border-b border-slate-200">
            {(
              [
                ['blocks', `Блоки (${page.blocks.length})`],
                ['seo', 'SEO и адрес'],
                ['styles', 'Стили'],
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

          {tab === 'blocks' && (
            <>
              {htmlBlocks > 0 && (
                <p className="mb-3 text-xs text-slate-500">
                  {htmlBlocks} из {page.blocks.length} блоков — «HTML как есть» (перенесены со старого сайта без разбора на поля).
                </p>
              )}
              <EditorContext.Provider value={{ pagePath: page.path }}>
                <BlockList blocks={page.blocks} schemas={schemas} onChange={(blocks) => update({ blocks })} />
              </EditorContext.Provider>
            </>
          )}

          {tab === 'seo' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <Field label="Адрес страницы" hint="Со слешем на конце. При смене адреса добавьте редирект со старого.">
                <input className="field font-mono" value={page.path} onChange={(e) => update({ path: e.target.value })} />
              </Field>
              <Field label="Title" hint={`${page.title.length} символов · заголовок вкладки и сниппета в поиске`}>
                <input className="field" value={page.title} onChange={(e) => update({ title: e.target.value })} />
              </Field>
              <Field label="Description" hint={`${(page.description ?? '').length} символов · описание в сниппете (до ~160)`}>
                <textarea className="field" rows={3} value={page.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Статус">
                  <select className="field" value={page.status} onChange={(e) => update({ status: e.target.value as EditablePage['status'] })}>
                    <option value="published">Опубликована</option>
                    <option value="draft">Черновик (не видна на сайте)</option>
                  </select>
                </Field>
                <Field label="Тип страницы">
                  <input className="field" value={page.template} onChange={(e) => update({ template: e.target.value })} />
                </Field>
              </div>
              <Field label="LCP-картинка (preload)" hint="Главная картинка первого экрана — грузится раньше остального">
                <input className="field font-mono text-xs" value={page.preloadImage ?? ''} onChange={(e) => update({ preloadImage: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={page.noindex} onChange={(e) => update({ noindex: e.target.checked })} />
                Закрыть от поисковиков (noindex)
              </label>
            </div>
          )}

          {tab === 'styles' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <Field label="Шаблонные стили" hint="По одному адресу на строку, порядок важен (каскад)">
                <textarea
                  className="field font-mono text-xs"
                  rows={Math.max(3, page.cssTemplates.length + 1)}
                  value={page.cssTemplates.join('\n')}
                  onChange={(e) => update({ cssTemplates: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>
              {page.inlineStyles.map((css, i) => (
                <Field key={i} label={`Стили страницы · блок ${i + 1}`} hint={`${css.length.toLocaleString('ru-RU')} символов`}>
                  <textarea
                    className="field font-mono text-xs"
                    rows={12}
                    value={css}
                    onChange={(e) => update({ inlineStyles: page.inlineStyles.map((x, j) => (j === i ? e.target.value : x)) })}
                  />
                </Field>
              ))}
              <Button size="sm" onClick={() => update({ inlineStyles: [...page.inlineStyles, ''] })}>
                + Блок стилей
              </Button>
            </div>
          )}
        </div>

        <aside className={cx('min-w-0', device === 'off' && 'hidden')}>
          <div className="sticky top-20">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">Предпросмотр</span>
              <div className="flex gap-1">
                {(['desktop', 'mobile', 'off'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
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
                srcDoc={preview}
                sandbox="allow-same-origin"
                className={cx('mx-auto h-full origin-top', device === 'mobile' ? 'w-[390px] border-x border-slate-200' : 'w-full')}
              />
            </div>
          </div>
        </aside>
      </div>
      {device === 'off' && (
        <button type="button" className="fixed right-6 bottom-6 rounded-full bg-brand-600 px-4 py-2 text-sm text-white shadow-lg" onClick={() => setDevice('desktop')}>
          Показать предпросмотр
        </button>
      )}
    </div>
  );
}
