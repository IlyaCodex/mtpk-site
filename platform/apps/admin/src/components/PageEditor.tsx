'use client';

import { useState, type ReactNode } from 'react';
import { BlockList, type BlockSchemas } from './BlockList';
import { EditorContext } from './editor-context';
import { EditorHeader, type Crumb } from './EditorHeader';
import { PreviewPane, type Device } from './PreviewPane';
import { SeoFields } from './SeoFields';
import { Button, cx, Field } from './ui';
import { usePageDraft, type EditablePage } from './use-page-draft';

export type { EditablePage } from './use-page-draft';

type Tab = 'blocks' | 'seo' | 'styles';

/**
 * Редактор страницы: блоки (порядок и поля), SEO, стили и предпросмотр.
 * Для товаров — отдельная карточка (ProductEditor).
 */
export function PageEditor({
  initial,
  schemas,
  siteUrl,
  crumbs,
  notice,
  pathNote,
}: {
  initial: EditablePage;
  schemas: BlockSchemas;
  siteUrl: string;
  crumbs: Crumb[];
  /** пояснение над вкладками (у страниц каталога — где их карточка) */
  notice?: ReactNode;
  /** адрес меняется в другом месте */
  pathNote?: string;
}) {
  const { page, update, dirty, saving, save } = usePageDraft(initial);
  const [tab, setTab] = useState<Tab>('blocks');
  const [device, setDevice] = useState<Device>('desktop');
  const htmlBlocks = page.blocks.filter((b) => b.type === 'html').length;

  return (
    <div className="-mx-8 -my-8">
      <EditorHeader
        crumbs={crumbs}
        title={page.title.split('|')[0].trim()}
        subtitle={<span className="font-mono">{page.path}</span>}
        status={page.status}
        updatedAt={page.updatedAt}
        siteHref={`${siteUrl}${page.path}`}
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
      />

      <div className={cx('grid gap-6 px-8 py-6', device !== 'off' && '2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        <div className="min-w-0">
          {notice}
          <div className="mb-4 flex gap-1 border-b border-slate-200">
            {(
              [
                ['blocks', `Содержимое (${page.blocks.length})`],
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
              <p className="mb-3 text-sm text-slate-500">
                Страница собрана из секций сверху вниз. Откройте секцию, чтобы изменить её; порядок — стрелками.
                {htmlBlocks > 0 && ' В секциях со старого сайта тексты, ссылки и картинки правятся во вкладке «Поля», вёрстка целиком — в «HTML».'}
              </p>
              <EditorContext.Provider value={{ pagePath: page.path }}>
                <BlockList blocks={page.blocks} schemas={schemas} onChange={(blocks) => update({ blocks })} />
              </EditorContext.Provider>
            </>
          )}

          {tab === 'seo' && <SeoFields page={page} update={update} pathNote={pathNote} />}

          {tab === 'styles' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-sm text-slate-500">Оформление страницы (CSS). Менять нужно редко — обычно этим занимается разработчик.</p>
              <Field label="Общие стили шаблона" hint="По одному адресу на строку, порядок важен">
                <textarea
                  className="field font-mono text-xs"
                  rows={Math.max(3, page.cssTemplates.length + 1)}
                  value={page.cssTemplates.join('\n')}
                  onChange={(e) => update({ cssTemplates: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>
              {page.inlineStyles.map((css, i) => (
                <Field key={i} label={`Стили страницы · ${i + 1}`} hint={`${css.length.toLocaleString('ru-RU')} символов`}>
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

        <PreviewPane page={page} device={device} onDevice={setDevice} />
      </div>
    </div>
  );
}
