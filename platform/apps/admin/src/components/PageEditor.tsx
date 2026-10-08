'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BlockList, type BlockSchemas } from './BlockList';
import { CodeEditor } from './CodeEditor';
import { EditorContext } from './editor-context';
import { EditorHeader, type Crumb } from './EditorHeader';
import { Icon } from './icons';
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
  catalogOwner,
}: {
  initial: EditablePage;
  schemas: BlockSchemas;
  siteUrl: string;
  crumbs: Crumb[];
  /** страница категории или подкатегории каталога: её карточка (и адрес) — в разделе «Каталог» */
  catalogOwner?: { kind: 'category' | 'subcategory'; id: number };
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
          {catalogOwner && <CatalogNotice owner={catalogOwner} />}
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
                Страница собрана из секций сверху вниз. Откройте секцию, чтобы изменить её; порядок — стрелками; новый блок — кнопкой «+» между секциями.
                {htmlBlocks > 0 && ' В секциях тексты, ссылки и картинки правятся во вкладке «Тексты и картинки», вёрстка целиком — в «HTML-код».'}
              </p>
              <EditorContext.Provider value={{ pagePath: page.path }}>
                <BlockList blocks={page.blocks} schemas={schemas} onChange={(blocks) => update({ blocks })} />
              </EditorContext.Provider>
            </>
          )}

          {tab === 'seo' && <SeoFields page={page} update={update} pathNote={catalogOwner ? 'Адрес меняется в карточке каталога — там же, где название и обложка.' : undefined} />}

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
                  <CodeEditor lang="css" value={css} onChange={(v) => update({ inlineStyles: page.inlineStyles.map((x, j) => (j === i ? v : x)) })} />
                </Field>
              ))}
              <Button size="sm" onClick={() => update({ inlineStyles: [...page.inlineStyles, ''] })}>
                <Icon name="plus" className="h-4 w-4" />
                Блок стилей
              </Button>
            </div>
          )}
        </div>

        <PreviewPane page={page} device={device} onDevice={setDevice} onBlocks={(blocks) => update({ blocks })} />
      </div>
    </div>
  );
}

/** Страница категории или подкатегории: где правится её карточка в каталоге. */
function CatalogNotice({ owner }: { owner: { kind: 'category' | 'subcategory'; id: number } }) {
  const category = owner.kind === 'category';
  return (
    <p className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
      {category ? 'Это страница категории каталога.' : 'Это страница подкатегории каталога.'}{' '}
      {category
        ? 'Карточка (название, обложка, порядок на главной), адрес и общие секции под товарами — в '
        : 'Карточка (название, обложка, описание, порядок), адрес — в '}
      <Link className="font-medium underline" href={`/catalog/${category ? 'categories' : 'subcategories'}/${owner.id}`}>
        {category ? 'карточке категории' : 'карточке подкатегории'}
      </Link>
      . Здесь — тексты, картинки и SEO страницы.
    </p>
  );
}
