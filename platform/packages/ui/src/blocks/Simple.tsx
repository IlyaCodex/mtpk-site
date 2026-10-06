import type { ContainerBlockData, FaqBlock, StatsBlock, StyleBlock, TextBlock } from '@mtpk/content-model';
import { cssFileRecord, externalStyleUrl } from '@mtpk/content-kit/styles';
import { createElement, type ReactNode } from 'react';
import { extra, Inline, RawElement } from '../primitives/Html.tsx';
import { SectionHead } from '../primitives/common.tsx';
import { toProps } from '../primitives/attrs.ts';

/**
 * Стили секций страницы: подключаемый CSS-файл (адрес — хеш содержимого,
 * файл отдаёт контент-сервис), а не <style> в коде страницы. Стоит там же,
 * где стоял <style>, — порядок каскада не меняется.
 */
export function StyleLink({ block }: { block: StyleBlock }) {
  return <link rel="stylesheet" href={externalStyleUrl(cssFileRecord(block.css).hash)} />;
}

/** Частые вопросы: раскрывающиеся <details>, ответы — в разметке FAQPage (JSON-LD). */
export function Faq({ block }: { block: FaqBlock }) {
  return (
    <section className="faq" {...extra(block.attrs, 'section')}>
      <div className="container">
        {block.head && <SectionHead head={block.head} />}
        <div className="faq__list">
          {block.items.map((it, i) => (
            <details className="faq__item" key={i}>
              <summary dangerouslySetInnerHTML={{ __html: it.question }} />
              <Inline as="p" className="faq__answer" html={it.answer} />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Ключевые показатели: иконка, подпись, число, пояснение. */
export function Stats({ block }: { block: StatsBlock }) {
  return (
    <section className="stats" {...extra(block.attrs, 'section')}>
      <div className="container">
        <div className="stats__grid">
          {block.items.map((s, i) => (
            <div className="stat" key={i}>
              {s.icon ? (
                <div className="stat__icon">
                  <RawElement html={s.icon} />
                </div>
              ) : null}
              <div className="stat__body">
                <Inline as="div" className="stat__label" html={s.label} />
                <Inline as="div" className="stat__num" html={s.num} />
                <Inline as="div" className="stat__text" html={s.text} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Text({ block }: { block: TextBlock }) {
  return <>{block.text}</>;
}

/** Контейнер с вложенными блоками (HTML-элемент, внутри которого стоят блоки). */
export function Container({ block, render }: { block: ContainerBlockData; render: (children: ContainerBlockData['children']) => ReactNode }) {
  return createElement(block.tag, toProps(block.attrs, block.tag), render(block.children));
}

export { RawElement };
