import type { Action, Crumb, SectionHead as SectionHeadData } from '@mtpk/content-model';
import { extra, Inline } from './Html.tsx';

/** Хлебные крошки: ссылки через «/», последняя — текущая страница. */
export function Breadcrumbs({ items, className = 'breadcrumb' }: { items: Crumb[]; className?: string }) {
  return (
    <nav className={className} aria-label="Хлебные крошки">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return [
          c.href && !last ? (
            <a key={`a${i}`} href={c.href} dangerouslySetInnerHTML={{ __html: c.label }} />
          ) : (
            <span key={`a${i}`} className="breadcrumb__current" dangerouslySetInnerHTML={{ __html: c.label }} />
          ),
          last ? null : (
            <span key={`s${i}`} className="breadcrumb__sep">
              /
            </span>
          ),
        ];
      })}
    </nav>
  );
}

/** Подпись кнопки со стрелкой «→» (стрелка двигается при наведении — стили .btn__arrow). */
export function withArrow(label: string, arrow: boolean): string {
  return arrow ? `${label} <span class="btn__arrow" aria-hidden="true">→</span>` : label;
}

/** Кнопка-ссылка в фирменном стиле (.btn). */
export function ActionLink({ action }: { action: Action }) {
  return (
    <a
      href={action.href}
      className={action.className}
      {...extra(action.attrs, 'a')}
      dangerouslySetInnerHTML={{ __html: withArrow(action.label, action.arrow) }}
    />
  );
}

/** Заголовок секции: надзаголовок, заголовок с акцентом, подзаголовок. */
export function SectionHead({ head }: { head: SectionHeadData }) {
  return (
    <div className="s-head">
      {head.eyebrow !== undefined && <Inline as="div" className="s-eyebrow" html={head.eyebrow} />}
      <Inline as="h2" className="s-title" html={head.title} />
      {head.lead !== undefined && <Inline as="p" className="s-lead" html={head.lead} />}
    </div>
  );
}
