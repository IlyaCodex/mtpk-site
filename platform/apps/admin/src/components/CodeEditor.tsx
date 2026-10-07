'use client';

import { indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { indentUnit, type LanguageSupport } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from './ui';

export type CodeLang = 'html' | 'css' | 'ts';

const LANGS: Record<CodeLang, { label: string; extension: () => LanguageSupport }> = {
  html: { label: 'HTML', extension: () => html({ autoCloseTags: true }) },
  css: { label: 'CSS', extension: () => css() },
  ts: { label: 'TypeScript / JavaScript', extension: () => javascript({ typescript: true }) },
};

/** Подписи панелей поиска и замены (Ctrl+F) по-русски. */
const PHRASES = EditorState.phrases.of({
  Find: 'Найти',
  Replace: 'Заменить на',
  next: 'далее',
  previous: 'назад',
  all: 'все',
  'match case': 'с учётом регистра',
  regexp: 'рег. выражение',
  'by word': 'слово целиком',
  replace: 'заменить',
  'replace all': 'заменить все',
  close: 'закрыть',
  'Go to line': 'Перейти к строке',
  go: 'перейти',
  'Fold line': 'Свернуть',
  'Unfold line': 'Развернуть',
  'folded code': 'свёрнутый код',
  unfold: 'развернуть',
});

const THEME = EditorView.theme({
  '&': { fontSize: '12.5px', backgroundColor: '#fff', height: 'var(--cm-height, auto)', maxHeight: 'var(--cm-max-height, 70vh)' },
  '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.6' },
  '.cm-content, .cm-gutter': { minHeight: '3rem' },
  '.cm-gutters': { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', color: '#94a3b8' },
  '&.cm-focused': { outline: 'none' },
});

/**
 * Редактор кода (HTML, CSS, TypeScript/JavaScript): подсветка, номера строк,
 * отступы по Tab, автозакрытие тегов и скобок, поиск и замена (Ctrl+F),
 * сворачивание блоков. «Во весь экран» — для больших секций.
 */
export function CodeEditor({
  value,
  onChange,
  lang = 'html',
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  lang?: CodeLang;
  readOnly?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const [full, setFull] = useState(false);

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          EditorView.lineWrapping,
          LANGS[lang].extension(),
          PHRASES,
          THEME,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ 'aria-label': `Код: ${LANGS[lang].label}` }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) change.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // значение подставляется отдельно (ниже), редактор пересоздаётся только при смене языка
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, readOnly]);

  // значение поменялось снаружи (вкладка «Тексты и картинки», отмена) — переносим в редактор
  useEffect(() => {
    const v = view.current;
    if (v && value !== v.state.doc.toString()) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  return (
    <div className={cx(full && 'fixed inset-4 z-50 flex flex-col rounded-xl bg-white p-3 shadow-2xl ring-1 ring-slate-300')}>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>
          {LANGS[lang].label}
          {readOnly ? ' · только просмотр' : ' · Tab — отступ, Ctrl+F — поиск и замена'}
        </span>
        <button type="button" onClick={() => setFull(!full)} className="rounded px-2 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          {full ? 'Свернуть (Esc)' : 'Во весь экран ⤢'}
        </button>
      </div>
      <div
        ref={host}
        className={cx('overflow-hidden rounded-lg border border-slate-300', full && 'min-h-0 flex-1', readOnly && 'bg-slate-50')}
        style={full ? ({ '--cm-height': '100%', '--cm-max-height': '100%' } as CSSProperties) : undefined}
      />
    </div>
  );
}
