'use client';

import { typeLabel } from '@/lib/catalog';
import type { EditablePage } from './use-page-draft';
import { Field } from './ui';

/** Вкладка «SEO и адрес»: адрес, title и description для поиска, публикация. */
export function SeoFields({ page, update }: { page: EditablePage; update: (patch: Partial<EditablePage>) => void }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <Field label="Адрес страницы" hint="Со слешем на конце. При смене адреса добавьте редирект со старого (раздел «Редиректы»).">
        <input className="field font-mono" value={page.path} onChange={(e) => update({ path: e.target.value })} />
      </Field>
      <Field label="Заголовок для поисковиков (title)" hint={`${page.title.length} символов · вкладка браузера и заголовок в выдаче Яндекса и Google`}>
        <input className="field" value={page.title} onChange={(e) => update({ title: e.target.value })} />
      </Field>
      <Field label="Описание для поисковиков (description)" hint={`${(page.description ?? '').length} символов · текст под заголовком в выдаче, лучше до 160`}>
        <textarea className="field" rows={3} value={page.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Публикация">
          <select className="field" value={page.status} onChange={(e) => update({ status: e.target.value as EditablePage['status'] })}>
            <option value="published">На сайте</option>
            <option value="draft">Черновик (на сайте не виден)</option>
          </select>
        </Field>
        <Field label="Тип страницы" hint="Определяет оформление; меняется редко">
          <input className="field" value={typeLabel(page.template)} readOnly disabled />
        </Field>
      </div>
      <Field label="Картинка первого экрана (грузится раньше остального)" hint="Обычно главное фото страницы">
        <input className="field font-mono text-xs" value={page.preloadImage ?? ''} onChange={(e) => update({ preloadImage: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={page.noindex} onChange={(e) => update({ noindex: e.target.checked })} />
        Скрыть от поисковиков (noindex)
      </label>
    </div>
  );
}
