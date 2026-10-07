'use client';

import { useEffect, useRef, useState } from 'react';
import { HtmlArea } from './text-fields';
import { cx } from './ui';

/** Убрать то, что добавляет браузер при правке: встроенные стили и пустые span. */
const clean = (html: string) =>
  html
    .replace(/\sstyle="[^"]*"/g, '')
    .replace(/<span>([\s\S]*?)<\/span>/g, '$1')
    .replace(/<p><br><\/p>$/, '');

const TOOLS: { label: string; title: string; run: () => void; className?: string }[] = [
  { label: 'Ж', title: 'Жирный', run: () => document.execCommand('bold'), className: 'font-bold' },
  { label: 'К', title: 'Курсив', run: () => document.execCommand('italic'), className: 'italic' },
  { label: '• Список', title: 'Маркированный список', run: () => document.execCommand('insertUnorderedList') },
  { label: '1. Список', title: 'Нумерованный список', run: () => document.execCommand('insertOrderedList') },
  { label: 'Подзаголовок', title: 'Подзаголовок', run: () => document.execCommand('formatBlock', false, 'h3') },
  { label: 'Абзац', title: 'Обычный текст', run: () => document.execCommand('formatBlock', false, 'p') },
  {
    label: 'Ссылка',
    title: 'Сделать выделенный текст ссылкой',
    run: () => {
      const url = window.prompt('Адрес ссылки: /products/… или https://…');
      if (url) document.execCommand('createLink', false, url);
    },
  },
  {
    label: 'Без оформления',
    title: 'Убрать оформление и ссылки у выделенного',
    run: () => {
      document.execCommand('removeFormat');
      document.execCommand('unlink');
    },
  },
];

/**
 * Текст с оформлением для менеджера: «как в Word» — жирный, курсив,
 * списки, подзаголовки, ссылки — или в HTML для тонкой правки. Хранится
 * HTML, как на сайте. Вставка из других программ — только текстом (без
 * чужих шрифтов и цветов).
 */
export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const ref = useRef<HTMLDivElement>(null);

  // содержимое переписывается, только если значение пришло извне — иначе каретка прыгала бы при наборе
  useEffect(() => {
    const el = ref.current;
    if (el && mode === 'visual' && el.innerHTML !== value) el.innerHTML = value;
  }, [value, mode]);

  const emit = () => {
    if (ref.current) onChange(clean(ref.current.innerHTML));
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {mode === 'visual' &&
          TOOLS.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.title}
              // mousedown, а не click: выделение в тексте не теряется
              onMouseDown={(e) => {
                e.preventDefault();
                ref.current?.focus();
                t.run();
                emit();
              }}
              className={cx('rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-brand-300 hover:text-brand-700', t.className)}
            >
              {t.label}
            </button>
          ))}
        <div className="ml-auto flex overflow-hidden rounded-md border border-slate-200 text-xs">
          {(['visual', 'html'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cx('px-2 py-1', mode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
              {m === 'visual' ? 'Визуально' : 'HTML'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'visual' ? (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="rte field min-h-24 leading-relaxed"
          onInput={emit}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
        />
      ) : (
        <HtmlArea value={value} onChange={onChange} />
      )}
    </div>
  );
}
