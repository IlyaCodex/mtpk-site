'use client';

import { useState, type ReactNode } from 'react';
import { BlockList, type BlockData, type BlockSchemas } from './BlockList';
import { EditorContext } from './editor-context';
import { EditorHeader, type Crumb } from './EditorHeader';
import { GalleryField, type Photo } from './gallery-field';
import { PreviewPane, type Device } from './PreviewPane';
import { SchemaField } from './schema-form';
import { SeoFields } from './SeoFields';
import { SpecPanelsEditor, type SpecBlock } from './SpecPanelsEditor';
import { Label, RowsEditor, TextInput, type Row } from './text-fields';
import { cx } from './ui';
import { usePageDraft, type EditablePage } from './use-page-draft';

type Hero = {
  type: 'productHero';
  breadcrumbs: { href?: string; label: string }[];
  media: { photos: Photo[]; banner?: string; caption?: string; thumbs: 'grid' | 'row' | 'scroll'; zoom: boolean; [k: string]: unknown };
  origin?: string;
  title: string;
  status?: string;
  price?: string;
  keyspecs: { num: string; label: string }[];
  actions: unknown[];
  facts: unknown[];
};

type Tab = 'main' | 'spec' | 'sections' | 'seo';
const OWN = new Set(['productHero', 'productSpec']);

/**
 * Карточка товара для менеджера: название, цена и наличие, фото, ключевые
 * параметры, характеристики таблицами, описание и прочие секции страницы,
 * SEO. Справа — предпросмотр страницы. Те же данные, что в общем редакторе
 * блоков, но разложенные по смыслу.
 */
export function ProductEditor({ initial, schemas, siteUrl, crumbs }: { initial: EditablePage; schemas: BlockSchemas; siteUrl: string; crumbs: Crumb[] }) {
  const { page, update, dirty, saving, save } = usePageDraft(initial);
  const [tab, setTab] = useState<Tab>('main');
  const [device, setDevice] = useState<Device>('desktop');

  const heroAt = page.blocks.findIndex((b) => b.type === 'productHero');
  const specAt = page.blocks.findIndex((b) => b.type === 'productSpec');
  const hero = page.blocks[heroAt] as unknown as Hero;
  const spec = specAt >= 0 ? (page.blocks[specAt] as unknown as SpecBlock) : null;
  const setBlockAt = (i: number, b: unknown) => update({ blocks: page.blocks.map((x, j) => (j === i ? (b as BlockData) : x)) });
  const setHero = (patch: Partial<Hero>) => setBlockAt(heroAt, { ...hero, ...patch });
  const setMedia = (patch: Partial<Hero['media']>) => setHero({ media: { ...hero.media, ...patch } });

  // остальные секции страницы: карточка и характеристики остаются на своих местах
  const others = page.blocks.filter((b) => !OWN.has(b.type));
  const setOthers = (next: BlockData[]) => {
    const queue = [...next];
    const merged = page.blocks.flatMap((b) => (OWN.has(b.type) ? [b] : queue.length ? [queue.shift()!] : []));
    update({ blocks: [...merged, ...queue] });
  };

  const short = hero.breadcrumbs.at(-1)?.label ?? '';
  const setShort = (label: string) => setHero({ breadcrumbs: hero.breadcrumbs.map((c, i, all) => (i === all.length - 1 ? { ...c, label } : c)) });
  const heroSchema = schemas.productHero?.schema;
  const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

  const tabs: [Tab, string][] = [
    ['main', 'Товар'],
    ['spec', `Характеристики${spec ? ` (${spec.panels.length})` : ''}`],
    ['sections', `Описание и секции (${others.length})`],
    ['seo', 'SEO и адрес'],
  ];

  return (
    <div className="-mx-8 -my-8">
      <EditorHeader
        crumbs={crumbs}
        title={plain(hero.title)}
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
          <div className="mb-4 flex gap-1 border-b border-slate-200">
            {tabs.map(([id, label]) => (
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

          <EditorContext.Provider value={{ pagePath: page.path }}>
            {tab === 'main' && (
              <div className="space-y-5">
                <Section title="Название, наличие и цена">
                  <div className="space-y-4">
                    <label className="block">
                      <Label>Название товара</Label>
                      <TextInput value={hero.title} onChange={(title) => setHero({ title })} multiline />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <Label hint="(в каталоге)">Короткое название</Label>
                        <TextInput value={short} onChange={setShort} placeholder="Например: УИД-376" />
                      </label>
                      <label className="block">
                        <Label>Цена</Label>
                        <TextInput value={hero.price} onChange={(price) => setHero({ price: price || undefined })} placeholder="Например: Цена — по запросу" />
                      </label>
                    </div>
                    <label className="block">
                      <Label>Наличие и срок</Label>
                      <TextInput value={hero.status} onChange={(status) => setHero({ status: status || undefined })} placeholder="Например: В наличии · отгрузка от 1 дня" />
                    </label>
                    <label className="block">
                      <Label hint="(строка над названием)">Происхождение</Label>
                      <TextInput value={hero.origin} onChange={(origin) => setHero({ origin: origin || undefined })} placeholder="Например: Производство Россия" />
                    </label>
                    <label className="block sm:w-1/2 sm:pr-2">
                      <Label>Публикация</Label>
                      <select className="field" value={page.status} onChange={(e) => update({ status: e.target.value as EditablePage['status'] })}>
                        <option value="published">На сайте</option>
                        <option value="draft">Черновик (на сайте не виден)</option>
                      </select>
                    </label>
                  </div>
                </Section>

                <Section title="Фото товара" hint="Первое фото — главное. Порядок меняется перетаскиванием.">
                  <GalleryField value={hero.media.photos} onChange={(photos) => setMedia({ photos })} />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <Label>Миниатюры под фото</Label>
                      <select className="field" value={hero.media.thumbs} onChange={(e) => setMedia({ thumbs: e.target.value as Hero['media']['thumbs'] })}>
                        <option value="grid">Сеткой</option>
                        <option value="row">В один ряд во всю ширину</option>
                        <option value="scroll">Лентой с прокруткой</option>
                      </select>
                    </label>
                    <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={hero.media.zoom} onChange={(e) => setMedia({ zoom: e.target.checked })} />
                      Открывать фото на весь экран
                    </label>
                    <label className="block">
                      <Label hint="необязательно">Плашка на фото</Label>
                      <TextInput value={hero.media.banner} onChange={(banner) => setMedia({ banner: banner || undefined })} />
                    </label>
                    <label className="block">
                      <Label hint="необязательно">Подпись под фото</Label>
                      <TextInput value={hero.media.caption} onChange={(caption) => setMedia({ caption: caption || undefined })} />
                    </label>
                  </div>
                </Section>

                <Section title="Ключевые параметры" hint="Крупно рядом с фото — 3–5 главных цифр">
                  <RowsEditor
                    rows={hero.keyspecs.map((k) => ({ label: k.label, num: k.num }))}
                    columns={[
                      { key: 'label', label: 'Параметр', placeholder: 'Например: Мощность установки' },
                      { key: 'num', label: 'Значение', placeholder: 'Например: 24,9 кВт' },
                    ]}
                    addLabel="+ Параметр"
                    empty="Ключевых параметров нет"
                    onChange={(rows: Row[]) => setHero({ keyspecs: rows.map((r) => ({ num: r.num ?? '', label: r.label ?? '' })) })}
                  />
                </Section>

                {heroSchema && (
                  <details className="rounded-xl border border-slate-200 bg-white shadow-xs">
                    <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-800">Кнопки и факты под названием</summary>
                    <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                      <SchemaField schema={heroSchema.properties!.actions} root={heroSchema} value={hero.actions} label="Кнопки" onChange={(actions) => setHero({ actions: actions as unknown[] })} />
                      <SchemaField schema={heroSchema.properties!.facts} root={heroSchema} value={hero.facts} label="Факты (доставка, гарантия…)" onChange={(facts) => setHero({ facts: facts as unknown[] })} />
                    </div>
                  </details>
                )}
              </div>
            )}

            {tab === 'spec' &&
              (spec ? (
                <>
                  <p className="mb-3 text-sm text-slate-500">Разделы характеристик — вкладки под карточкой товара. Внутри — таблицы «Параметр — Значение» и тексты.</p>
                  <SpecPanelsEditor block={spec} onChange={(b) => setBlockAt(specAt, b)} />
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">У этого товара нет блока характеристик.</p>
              ))}

            {tab === 'sections' && (
              <>
                <p className="mb-3 text-sm text-slate-500">
                  Всё, что на странице ниже карточки товара: описание, формы заявки, преимущества, партнёры. В секциях со старого сайта тексты и картинки правятся во вкладке «Поля», вёрстка целиком — в «HTML».
                </p>
                <BlockList blocks={others} schemas={schemas} onChange={setOthers} />
              </>
            )}

            {tab === 'seo' && <SeoFields page={page} update={update} />}
          </EditorContext.Provider>
        </div>

        <PreviewPane page={page} device={device} onDevice={setDevice} />
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
      <header className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
