/**
 * Оглавление «Содержание» у характеристик товара — та же разметка, что у
 * контентного блока разделов (.cdoc). Подсветку раздела у верха экрана и
 * плавный скролл добавляет клиентский модуль spec-nav. На планшете и
 * телефоне оглавление — лента кнопок над разделами.
 */
export function SpecNav({ ariaLabel, eyebrow, items }: { ariaLabel: string; eyebrow: string; items: { href: string; label: string }[] }) {
  return (
    <nav className="cdoc__nav" aria-label={ariaLabel}>
      <div className="cdoc__nav-eyebrow" dangerouslySetInnerHTML={{ __html: eyebrow }} />
      {items.map((n, i) => (
        <a key={i} className="cdoc__nav-link" href={n.href} dangerouslySetInnerHTML={{ __html: n.label }} />
      ))}
    </nav>
  );
}
