/**
 * Оглавление «Содержание» у характеристик товара. Подсветку раздела у верха
 * экрана и плавный скролл добавляет клиентский модуль spec-nav. На мобильных
 * оглавление скрыто стилями — там видны все разделы подряд.
 */
export function SpecNav({ ariaLabel, eyebrow, items }: { ariaLabel: string; eyebrow: string; items: { href: string; label: string }[] }) {
  return (
    <nav className="spec__nav" aria-label={ariaLabel}>
      <div className="spec__nav-eyebrow" dangerouslySetInnerHTML={{ __html: eyebrow }} />
      {items.map((n, i) => (
        <a key={i} className={i === 0 ? 'spec__nav-link is-active' : 'spec__nav-link'} href={n.href} dangerouslySetInnerHTML={{ __html: n.label }} />
      ))}
    </nav>
  );
}
