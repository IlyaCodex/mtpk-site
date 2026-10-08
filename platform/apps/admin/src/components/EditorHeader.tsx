'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icons';
import { Badge, Button, formatDate } from './ui';

export type Crumb = { href: string; label: string };

/**
 * Шапка редактора (прилипает при прокрутке): где страница находится,
 * её название и статус, ссылка на сайт и кнопка «Сохранить».
 */
export function EditorHeader({
  crumbs,
  title,
  subtitle,
  status,
  updatedAt,
  siteHref,
  dirty,
  saving,
  onSave,
  extra,
}: {
  crumbs: Crumb[];
  title: string;
  subtitle?: ReactNode;
  status: 'published' | 'draft';
  updatedAt: string;
  siteHref: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  extra?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-8 py-3 backdrop-blur">
      <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-slate-500" aria-label="Где находится страница">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300">/</span>}
            <Link href={c.href} className="inline-flex items-center gap-1 hover:text-brand-600">
              {i === 0 && <Icon name="left" className="h-3.5 w-3.5" />}
              {c.label}
            </Link>
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-slate-900">{title || 'Без названия'}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {status === 'published' ? <Badge tone="green">На сайте</Badge> : <Badge tone="amber">Черновик — на сайте не виден</Badge>}
            {subtitle}
            <span>изменена {formatDate(updatedAt)}</span>
          </div>
        </div>
        {extra}
        <a href={siteHref} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          Открыть на сайте
          <Icon name="external" className="h-4 w-4" />
        </a>
        <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
          {saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Сохранено'}
        </Button>
      </div>
    </header>
  );
}
