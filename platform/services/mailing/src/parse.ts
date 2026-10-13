/**
 * Адреса из файла для базы рассылки: Excel (.xlsx; .xls — выгрузка Битрикс24
 * в виде HTML-таблицы, из старого двоичного .xls — только адреса), CSV, TXT.
 * Таблица с заголовками — колонки «E-mail», «Имя/ФИО», «Компания», «Телефон»;
 * без заголовков — адреса из любых ячеек, имя — соседняя ячейка с текстом.
 * Кодировка текста — UTF-8 или Windows-1251 (выгрузки из 1С и старого Excel).
 */
import { unzipSync, strFromU8 } from 'fflate';

export interface ParsedContact {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
}

export interface ParseResult {
  contacts: ParsedContact[];
  /** строк в файле (с заголовком) */
  rows: number;
  /** похожих на адрес, но неправильных */
  invalid: number;
  /** повторов внутри файла */
  duplicates: number;
  /** предупреждение для человека (например, старый .xls без имён) */
  note?: string;
}

/** Адрес почты внутри текста. Домены — латиница или кириллица (.рф). */
const EMAIL_IN_TEXT = /[A-Za-z0-9._%+'-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
const EMAIL_EXACT = /^[a-z0-9._%+'-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}$/u;
/** Похоже на адрес (есть @) — для подсчёта неправильных. */
const LOOKS_LIKE = /\S+@\S+/g;

/** Адрес в нижнем регистре или null, если это не адрес. */
export function normalizeEmail(raw: string): string | null {
  const s = raw
    .trim()
    .replace(/^mailto:/i, '')
    .replace(/^[<("']+|[>)"',;.]+$/g, '')
    .toLowerCase();
  if (s.length > 254 || s.includes('..') || s.startsWith('.') || s.split('@')[0]!.endsWith('.')) return null;
  return EMAIL_EXACT.test(s) ? s : null;
}

/** Все адреса из строки (ячейка может содержать несколько через запятую или пробел). */
export function emailsIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(EMAIL_IN_TEXT)) {
    const e = normalizeEmail(m[0]);
    if (e) out.push(e);
  }
  return out;
}

// ── Текст и кодировки ─────────────────────────────────────────────────────

/** Текст файла: UTF-8 (с BOM или без), иначе Windows-1251; UTF-16 с BOM — тоже. */
export function decodeText(buf: Uint8Array): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1251').decode(buf);
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const decodeEntities = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  );

// ── Таблицы ───────────────────────────────────────────────────────────────

/** CSV с кавычками; разделитель — тот, что чаще встречается в первых строках (; , или табуляция). */
export function parseCsv(text: string): string[][] {
  const sample = text.slice(0, 4000);
  const delim = [';', '\t', ','].map((d) => [d, sample.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Ячейки листов .xlsx: общие строки (sharedStrings) и значения ячеек по колонкам. */
export function parseXlsx(buf: Uint8Array): string[][] {
  const files = unzipSync(buf, { filter: (f) => f.name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name) });
  const shared: string[] = [];
  const ss = files['xl/sharedStrings.xml'];
  if (ss) {
    for (const si of strFromU8(ss).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      // текст ячейки — все <t> подряд (у форматированного текста их несколько)
      shared.push(decodeEntities([...si[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    }
  }
  const col = (ref: string) => {
    let n = 0;
    for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };
  const rows: string[][] = [];
  const sheets = Object.keys(files)
    .filter((n) => n.startsWith('xl/worksheets/'))
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
  for (const name of sheets) {
    const xml = strFromU8(files[name]!);
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row: string[] = [];
      for (const c of r[1]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1]!;
        const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
        const body = c[2] ?? '';
        let value = '';
        if (type === 's') value = shared[Number(/<v>([^<]*)<\/v>/.exec(body)?.[1] ?? -1)] ?? '';
        else if (type === 'inlineStr') value = decodeEntities([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
        else value = decodeEntities(/<v>([^<]*)<\/v>/.exec(body)?.[1] ?? '');
        const at = ref ? col(ref) : row.length;
        while (row.length < at) row.push('');
        row[at] = value;
      }
      rows.push(row);
    }
  }
  return rows;
}

/** Строки HTML-таблиц (выгрузка «в Excel» из Битрикс24 и других систем — .xls с HTML внутри). */
export function parseHtmlTable(html: string): string[][] {
  const rows: string[][] = [];
  for (const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    rows.push([...tr[1]!.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((td) => decodeEntities(td[1]!.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).trim()));
  }
  return rows;
}

// ── Заголовки и строки ────────────────────────────────────────────────────

const HEADERS: Record<'email' | 'name' | 'company' | 'phone', RegExp> = {
  email: /^(e-?mail|email|почта|эл\.?\s*почта|электронная почта|адрес эл|адрес электронной почты|e-mail адрес|мейл)/i,
  name: /^(имя|фио|ф\.и\.о|name|full name|контакт|контактное лицо|имя контакта|фамилия имя)/i,
  company: /^(компания|организация|company|название компании|контрагент|клиент)/i,
  phone: /^(телефон|тел\.?|phone|мобильный|рабочий телефон)/i,
};

type Columns = Partial<Record<keyof typeof HEADERS, number>>;

/** Колонки по строке заголовков (null — это не заголовок). */
function headerColumns(row: string[]): Columns | null {
  const cols: Columns = {};
  row.forEach((cell, i) => {
    const t = cell.trim();
    if (!t || t.includes('@')) return;
    for (const [key, re] of Object.entries(HEADERS) as [keyof typeof HEADERS, RegExp][]) if (cols[key] === undefined && re.test(t)) cols[key] = i;
  });
  return cols.email !== undefined ? cols : null;
}

const clean = (s: string | undefined) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t && t.length <= 200 ? t : undefined;
};
/** Ячейка похожа на имя: буквы, без адреса и без одних цифр. */
const nameLike = (s: string) => /\p{L}{2,}/u.test(s) && !s.includes('@') && !/^https?:/i.test(s) && s.length <= 100;

/** Контакты из строк таблицы. */
export function contactsFromRows(rows: string[][]): ParseResult {
  const seen = new Map<string, ParsedContact>();
  let invalid = 0;
  let duplicates = 0;
  let cols: Columns | null = null;
  const push = (c: ParsedContact) => {
    const was = seen.get(c.email);
    if (!was) seen.set(c.email, c);
    else {
      duplicates++;
      // повтор с именем дополняет первую запись
      was.name ??= c.name;
      was.company ??= c.company;
      was.phone ??= c.phone;
    }
  };
  for (const row of rows) {
    if (!cols) {
      const h = headerColumns(row);
      if (h) {
        cols = h;
        continue;
      }
    }
    const text = row.join(' ');
    const found = cols && cols.email !== undefined ? emailsIn(row[cols.email] ?? '') : emailsIn(text);
    const looks = (text.match(LOOKS_LIKE) ?? []).length;
    if (looks > found.length && !cols) invalid += looks - found.length;
    if (cols && cols.email !== undefined && (row[cols.email] ?? '').includes('@') && !found.length) invalid++;
    for (const email of found) {
      const name = cols?.name !== undefined ? clean(row[cols.name]) : clean(row.find((c) => nameLike(c.trim())));
      push({
        email,
        name,
        company: cols?.company !== undefined ? clean(row[cols.company]) : undefined,
        phone: cols?.phone !== undefined ? clean(row[cols.phone]) : undefined,
      });
    }
  }
  return { contacts: [...seen.values()], rows: rows.length, invalid, duplicates };
}

/** Строки TXT: «адрес», «Имя <адрес>», «адрес; Имя», несколько адресов в строке. */
export function contactsFromText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  // текст с явными колонками (CSV, выгрузка с табуляцией) — как таблица
  const sample = lines.slice(0, 20).join('\n');
  if (/[;\t]/.test(sample)) return contactsFromRows(parseCsv(text));
  const rows = lines.map((line) => {
    const named = /^\s*"?([^"<]+?)"?\s*<([^>]+)>/.exec(line);
    if (named) return [named[2]!, named[1]!];
    // «Иван Петров ivan@a.ru» — имя: строка без адресов и разделителей
    const rest = line.replace(EMAIL_IN_TEXT, ' ').replace(/[,|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return rest && !rest.includes('@') ? [line, rest] : [line];
  });
  return contactsFromRows(rows);
}

/** Разбор файла по имени и содержимому. */
export function parseContactsFile(name: string, buf: Uint8Array): ParseResult {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  if (ext === 'xlsx' || ext === 'xlsm' || (isZip && ext !== 'csv' && ext !== 'txt')) return contactsFromRows(parseXlsx(buf));
  if (ext === 'xls') {
    const head = decodeText(buf.subarray(0, 2048)).trimStart();
    // «Excel» из Битрикс24 и многих систем — на деле HTML или XML-таблица
    if (head.startsWith('<')) {
      const text = decodeText(buf);
      return /<tr\b/i.test(text) ? contactsFromRows(parseHtmlTable(text)) : contactsFromRows([[text]]);
    }
    // старый двоичный формат: адреса (латиница) — из байтов как есть и как UTF-16
    const latin = new TextDecoder('latin1').decode(buf);
    const wide = new TextDecoder('utf-16le').decode(buf.subarray(0, buf.length - (buf.length % 2)));
    const res = contactsFromRows([[latin], [wide]]);
    return { ...res, invalid: 0, note: 'Старый формат .xls: найдены только адреса, без имён. Чтобы взять и имена, сохраните файл как .xlsx или .csv.' };
  }
  if (ext === 'csv') return contactsFromRows(parseCsv(decodeText(buf)));
  return contactsFromText(decodeText(buf));
}
