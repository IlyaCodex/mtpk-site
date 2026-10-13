'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { cx } from '@/components/ui';

const DEVICES = [
  { id: 'desktop', label: 'Компьютер', width: '100%' },
  { id: 'mobile', label: 'Телефон', width: '375px' },
] as const;

/** Ссылки предпросмотра открываются в новой вкладке, а не внутри окна. */
function withBaseTarget(html: string): string {
  const base = '<base target="_blank">';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${base}`);
  return `${base}${html}`;
}

/**
 * Письмо, как его увидит получатель: строка во «Входящих» (отправитель, тема,
 * прехедер) и само письмо — на ширине компьютера или телефона. Скрипты в окне
 * не выполняются (sandbox), ссылки открываются в новой вкладке.
 */
export function EmailPreview({
  html,
  subject,
  preheader,
  fromName,
  fromEmail,
  loading,
}: {
  html: string;
  subject: string;
  preheader: string;
  fromName: string;
  fromEmail: string;
  loading?: boolean;
}) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('desktop');
  const [height, setHeight] = useState(640);
  const frame = useRef<HTMLIFrameElement>(null);
  const width = DEVICES.find((d) => d.id === device)!.width;

  // высота окна — по высоте письма (на телефоне письмо длиннее)
  const fit = useCallback(() => {
    const el = frame.current;
    const doc = el?.contentDocument;
    if (!el || !doc?.documentElement) return;
    // сначала сжать: высота документа не меньше окна, иначе окно не уменьшится
    el.style.height = '200px';
    const h = Math.max(320, Math.min(6000, doc.documentElement.scrollHeight));
    el.style.height = `${h}px`;
    setHeight(h);
  }, []);
  useEffect(() => {
    const t = setTimeout(fit, 30);
    return () => clearTimeout(t);
  }, [device, fit]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-800">Предпросмотр письма</span>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-slate-400">обновляю…</span>}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDevice(d.id)}
                className={cx('rounded-md px-2.5 py-1 font-medium transition', d.id === device ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800')}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* строка во «Входящих» */}
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          {(fromName.trim()[0] ?? '?').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">
              {fromName || 'Без имени'} <span className="font-normal text-slate-400">&lt;{fromEmail}&gt;</span>
            </span>
            <span className="shrink-0 text-xs text-slate-400">сейчас</span>
          </div>
          <div className="truncate text-sm">
            <span className={cx('font-medium', subject ? 'text-slate-800' : 'text-red-600')}>{subject || 'Нет темы письма'}</span>
            {preheader && <span className="text-slate-500"> — {preheader}</span>}
          </div>
        </div>
      </div>

      <div className={cx('flex justify-center transition-colors', device === 'mobile' ? 'bg-slate-200/70 px-4 py-6' : 'bg-slate-100')}>
        <iframe
          ref={frame}
          title="Предпросмотр письма"
          srcDoc={withBaseTarget(html)}
          onLoad={fit}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className={cx('block border-0 bg-white', device === 'mobile' && 'rounded-2xl shadow-lg ring-1 ring-slate-300')}
          style={{ width, height }}
        />
      </div>
      <p className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        <Icon name="faq" className="h-3.5 w-3.5" />
        Имя в примере — «Иван Петров». В письмах подставится имя получателя, если оно есть в базе, иначе — запасное слово из шаблона.
      </p>
    </div>
  );
}
