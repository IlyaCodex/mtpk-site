'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import type { BlockData } from './BlockList';
import { CodeEditor } from './CodeEditor';
import { useEditorContext } from './editor-context';
import { HtmlFieldsEditor } from './html-fields';
import { Icon } from './icons';
import { Button, cx } from './ui';

/** Вкладки внутри открытого блока. */
export function ModeTabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 text-xs" role="tablist">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cx('px-3 py-1.5', value === id ? 'bg-slate-800 font-medium text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type SectionMode = 'fields' | 'code';
// последняя выбранная вкладка секций — следующие открываются на ней же
const MODE_KEY = 'admin:section-mode';
function storedMode(): SectionMode | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'fields' || v === 'code' ? v : null;
  } catch {
    return null;
  }
}

/**
 * HTML-секция: «Тексты и картинки» — подписанные поля (тексты, ссылки,
 * картинки, карточки); «HTML-код» — вся разметка секции в редакторе кода.
 * Новая секция открывается сразу в коде.
 */
export function HtmlSection({ block, fresh, onChange }: { block: BlockData; fresh?: boolean; onChange: (b: BlockData) => void }) {
  const html = String(block.html ?? '');
  const onlyCode = fresh || html.trimStart().startsWith('<script');
  const [mode, setMode] = useState<SectionMode>(onlyCode ? 'code' : 'fields');
  // выбор из прошлого раза — после монтирования (на сервере localStorage нет)
  useEffect(() => {
    const m = storedMode();
    if (!onlyCode && m) setMode(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (m: SectionMode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* без запоминания */
    }
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {mode === 'fields' ? 'Тексты, ссылки и картинки секции — подписанными полями.' : 'Весь HTML-код секции. Изменения сразу видны в предпросмотре.'}
        </p>
        <ModeTabs
          value={mode}
          options={[
            ['fields', 'Тексты и картинки'],
            ['code', 'HTML-код'],
          ]}
          onChange={choose}
        />
      </div>
      {mode === 'fields' ? (
        <HtmlFieldsEditor html={html} onChange={(v) => onChange({ ...block, html: v })} />
      ) : (
        <CodeEditor value={html} onChange={(v) => onChange({ ...block, html: v })} lang="html" />
      )}
    </div>
  );
}

const SCRIPT_EXAMPLE = `// Пример: секции ниже первого экрана плавно появляются при прокрутке.
// Кто отключил анимацию в настройках системы — видит секции сразу.
const sections = [...document.querySelectorAll<HTMLElement>('main section')].filter(
  (el) => el.getBoundingClientRect().top > window.innerHeight,
);

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.animate(
          [
            { opacity: 0, transform: 'translateY(24px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 600, easing: 'ease-out', fill: 'forwards' },
        );
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );
  for (const el of sections) {
    el.style.opacity = '0';
    observer.observe(el);
  }
}
`;

/** Блок «Скрипт»: код на TypeScript или JavaScript (анимации, поведение секций). */
export function ScriptSection({ block, onChange }: { block: BlockData; onChange: (b: BlockData) => void }) {
  const code = String(block.code ?? '');
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Код выполняется на сайте после загрузки страницы — для анимаций и поведения секций. Пишите на TypeScript или обычном JavaScript: при сохранении код
        проверяется и собирается в файл; если в нём ошибка, страница не сохранится, а в сообщении будет номер строки.
      </p>
      <CodeEditor value={code} onChange={(v) => onChange({ ...block, code: v })} lang="ts" />
      {!code.trim() && (
        <button type="button" onClick={() => onChange({ ...block, code: SCRIPT_EXAMPLE })} className="text-xs font-medium text-brand-700 hover:underline">
          Вставить пример: плавное появление секций при прокрутке
        </button>
      )}
    </div>
  );
}

/** Общие секции сайта: одна вёрстка на все страницы. */
const SHARED = new Set(['leadgen', 'bestOffer', 'catalogCta', 'partner', 'adv', 'whyUs', 'lightbox']);
/** Блоки, которые можно без потерь превратить в HTML-секцию (нет форм и связи с каталогом). */
export const canBecomeHtml = (b: BlockData) => b.type === 'stats' || b.type === 'faq' || (b.type === 'catalogList' && !b.auto);

/**
 * «HTML-код» блока с полями или общей секции: разметка, которую он выводит
 * на сайте. Блок без форм и данных каталога можно перевести в HTML-секцию.
 */
export function BlockCode({ block, onConvert }: { block: BlockData; onConvert: (html: string) => void }) {
  const { pagePath } = useEditorContext();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState('');
  const sig = JSON.stringify(block);
  useEffect(() => {
    let alive = true;
    setError('');
    api<{ html: string }>('preview/block', { json: { path: pagePath, block: JSON.parse(sig) as BlockData } })
      .then((r) => alive && setHtml(r.html))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [sig, pagePath]);
  const convertible = canBecomeHtml(block);
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        {SHARED.has(block.type)
          ? 'Общая секция сайта: сверстана один раз и одинакова на всех страницах, поэтому её код здесь — только для просмотра.'
          : convertible
            ? 'Код, который выводит этот блок. Чтобы править код напрямую, переведите блок в HTML-секцию.'
            : 'Блок связан с данными (каталог, формы заявки, товар) — его код здесь только для просмотра.'}
      </p>
      {error ? (
        <p className="text-sm text-red-600">Код не получен: {error}</p>
      ) : html === null ? (
        <p className="text-sm text-slate-400">Загружаю код…</p>
      ) : (
        <CodeEditor value={html} lang="html" readOnly />
      )}
      {convertible && html && (
        <Button
          size="sm"
          onClick={() => {
            if (window.confirm('Перевести блок в HTML-секцию? Дальше он правится HTML-кодом и во вкладке «Тексты и картинки», поля этого блока исчезнут.')) onConvert(html);
          }}
        >
          Править как HTML-код
          <Icon name="right" className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
