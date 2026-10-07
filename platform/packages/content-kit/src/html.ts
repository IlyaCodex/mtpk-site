/**
 * Базовые операции над HTML страниц: комментарии, маркеры общих секций,
 * сущности.
 */

const PROTECT_RE = /<(script|style|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi;
const COMMENT_RE = /<!--[\s\S]*?-->/g;
export const BLOCK_MARKER_RE = /<!--C:([a-z0-9-]+)-->/g;

/**
 * Вырезает HTML-комментарии разработчиков (как postbuild strip-html-comments.mjs).
 * Не трогает содержимое script/style/pre/textarea, условные комментарии
 * (<!--[if …]>) и, по желанию, маркеры блоков <!--C:имя-->.
 */
export function stripHtmlComments(html: string, opts: { keepBlockMarkers?: boolean } = {}): string {
  const stash: string[] = [];
  let out = html.replace(PROTECT_RE, (m) => {
    stash.push(m);
    return `\u0000PROTECT${stash.length - 1}\u0000`;
  });
  out = out.replace(COMMENT_RE, (m) => {
    const inner = m.slice(4, -3);
    if (/\[if[\s\S]*?\]|\[endif\]/i.test(inner)) return m;
    if (opts.keepBlockMarkers && /^C:[a-z0-9-]+$/.test(inner)) return m;
    return '';
  });
  return out.replace(/\u0000PROTECT(\d+)\u0000/g, (_, i) => stash[Number(i)]);
}

export type Segment = { type: 'html'; content: string } | { type: 'block'; name: string };

/** Делит тело страницы по маркерам общих секций <!--C:имя-->. */
export function splitSegments(body: string): Segment[] {
  const parts = body.split(/<!--C:([a-z0-9-]+)-->/);
  const segments: Segment[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) segments.push({ type: 'html', content: parts[i] });
    } else {
      segments.push({ type: 'block', name: parts[i] });
    }
  }
  return segments;
}

/** Список блоков, использованных на странице, в порядке появления. */
export function blockNames(body: string): string[] {
  return [...body.matchAll(BLOCK_MARKER_RE)].map((m) => m[1]);
}

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&laquo;': '«',
  '&raquo;': '»', '&amp;': '&', '&quot;': '"', '&#8209;': '\u2011', '&deg;': '°',
};

/** Декодер сущностей для JSON-LD. */
export function decodeEntities(s: string): string {
  return s.replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITY_MAP[m] ?? m).replace(/\s+/g, ' ').trim();
}

const NAMED: Record<string, string> = {
  nbsp: '\u00A0', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", laquo: '«', raquo: '»',
  mdash: '—', ndash: '–', hellip: '…', deg: '°', times: '×', minus: '−', middot: '·',
  thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003', shy: '', copy: '©', reg: '®', trade: '™',
  le: '≤', ge: '≥', plusmn: '±', sup2: '²', sup3: '³', frac12: '½', frac14: '¼', bull: '•',
  rarr: '→', larr: '←', asymp: '≈', ne: '≠', micro: 'µ', permil: '‰', prime: '′', Prime: '″',
};

/** Полный декодер для извлечения видимого текста (поиск, сниппеты). */
export function decodeHtmlText(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[code] ?? NAMED[code.toLowerCase()] ?? m;
  });
}

/** Видимый текст HTML: без script/style/noscript/svg/template, теги → пробелы. */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th|section|article|header|footer|summary|details|dt|dd|figcaption)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlText(stripped)
    .replace(/[\u00A0\u2009\u2002\u2003]/g, ' ')
    .replace(/[\u2060\u200B\u00AD]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Экранирование для вставки в HTML-атрибут/текст. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
