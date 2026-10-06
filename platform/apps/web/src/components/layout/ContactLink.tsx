const ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPE[c]);

type Props = {
  href: string;
  text: string;
  /** иконка — строка SVG (вставляется перед текстом) */
  icon?: string;
  className?: string;
  'aria-label'?: string;
};

/**
 * Ссылка tel:/mailto:. Коллтрекинг Mango подменяет номер прямо в DOM, иногда
 * раньше, чем React успевает гидратировать страницу. Поэтому содержимое
 * ссылки — сырой HTML (React не сверяет его при гидратации и не перерисовывает),
 * а расхождение атрибутов разрешено.
 */
export function ContactLink({ href, text, icon = '', ...rest }: Props) {
  return <a href={href} {...rest} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: icon + escapeHtml(text) }} />;
}
