import type { ProductSpecBlock, SpecContent } from '@mtpk/content-model';
import { Inline, RawFragment } from '../primitives/Html.tsx';
import { styleToObject } from '../primitives/attrs.ts';
import { SpecNav } from './SpecNav.tsx';

/** Таблица характеристик «параметр — значение» — карточкой, как таблицы в тексте разделов. */
export function SpecTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="cdoc__scroll">
      <table className="spec-table">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th dangerouslySetInnerHTML={{ __html: r.label }} />
              <td dangerouslySetInnerHTML={{ __html: r.value }} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Content({ item }: { item: SpecContent }) {
  // текст раздела: абзацы, списки, подзаголовки — сколько угодно элементов подряд
  if (item.kind === 'html') return <RawFragment html={item.html} />;
  const table = <SpecTable rows={item.rows} />;
  return item.wrapStyle !== undefined ? <div style={styleToObject(item.wrapStyle)}>{table}</div> : table;
}

/**
 * Характеристики и описание товара. Раскладка и вид — как у контентного
 * блока разделов (.cdoc, стили — components.css): оглавление слева
 * (подсветка текущего раздела — клиентский модуль spec-nav), разделы справа.
 */
export function ProductSpec({ block }: { block: ProductSpecBlock }) {
  return (
    <section className="cdoc" aria-label={block.ariaLabel}>
      <div className="container">
        <div className="cdoc__layout">
          <SpecNav ariaLabel={block.navAriaLabel} eyebrow={block.navEyebrow} items={block.nav} />
          <div className="cdoc__body">
            {block.panels.map((p) => (
              <div className="cdoc__panel" id={p.id} key={p.id}>
                <Inline as="h2" className="cdoc__title" html={p.title} />
                {p.content.map((c, i) => (
                  <Content key={i} item={c} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
