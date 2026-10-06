/**
 * Вложение «Прикрепить КП»: ≤ 10 МБ, белый список расширений и проверка
 * содержимого по сигнатуре (аналог finfo в send.php). Отклонённый файл не
 * валит заявку — телефон важнее, менеджер запросит КП.
 */
export const ATTACH_MAX_BYTES = 10 * 1024 * 1024;
const EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];

type Kind = 'pdf' | 'ole2' | 'zip' | 'jpeg' | 'png' | 'unknown';

export function sniff(buf: Buffer): Kind {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0xd0cf11e0 && buf.readUInt32BE(4) === 0xa1b11ae1) return 'ole2'; // .doc/.xls
  if (buf.length >= 4 && buf.readUInt32BE(0) === 0x504b0304) return 'zip'; // .docx/.xlsx (OOXML)
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) return 'png';
  return 'unknown';
}

const EXPECTED: Record<string, Kind[]> = {
  pdf: ['pdf'],
  doc: ['ole2'],
  xls: ['ole2'],
  docx: ['zip'],
  xlsx: ['zip'],
  jpg: ['jpeg'],
  jpeg: ['jpeg'],
  png: ['png'],
};

export type AttachmentCheck = { ok: true; name: string } | { ok: false; note: string };

/** Имя для вложения: без путей и спецсимволов, расширение сохраняется. */
export function safeName(original: string): string {
  const base = original.split(/[\\/]/).pop() ?? 'attachment';
  const cleaned = base.replace(/[^\p{L}\p{N}_.\- ()]/gu, '_') || 'attachment';
  return [...cleaned].slice(0, 120).join('');
}

export function checkAttachment(original: string, data: Buffer, truncated: boolean): AttachmentCheck {
  const name = [...original.trim()].slice(0, 150).join('') || 'file';
  if (truncated || data.length > ATTACH_MAX_BYTES || data.length === 0) {
    return { ok: false, note: `Файл «${name}» отклонён: размер ${data.length}${truncated ? '+' : ''} байт (лимит 10 МБ)` };
  }
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  const kind = sniff(data);
  if (!EXT.includes(ext) || !EXPECTED[ext]?.includes(kind)) {
    return { ok: false, note: `Файл «${name}» отклонён: недопустимый тип (${ext || 'без расширения'}, ${kind})` };
  }
  return { ok: true, name: safeName(name) };
}
