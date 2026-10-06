import sharp from 'sharp';
import { deleteObject, getObject, isNotFound, listObjects, putObject, type S3Client } from '@mtpk/shared';

/**
 * Уменьшенные копии картинок: /img/foo.png?w=640 → ширина 640 px (не больше
 * оригинала) в лучшем формате, который понимает браузер: AVIF, WebP или
 * исходный (JPEG/PNG). Копия создаётся при первом запросе и хранится в S3
 * (_variants/…), дальше отдаётся готовой. Сайт подставляет такие адреса
 * в srcset — телефон не качает фото шириной 2000 px ради карточки в 360 px.
 */
export const VARIANT_WIDTHS = [160, 320, 480, 640, 960, 1280, 1600, 1920];
export const VARIANT_SOURCE = /\.(png|jpe?g|webp)$/i;

type Format = 'avif' | 'webp' | 'jpeg' | 'png';
const MIME: Record<Format, string> = { avif: 'image/avif', webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png' };

/** Ширина из запроса → ближайшая разрешённая не меньше запрошенной. */
export function snapWidth(w: number): number | null {
  if (!Number.isFinite(w) || w <= 0) return null;
  return VARIANT_WIDTHS.find((x) => x >= w) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
}

/** Формат по заголовку Accept: AVIF → WebP → как у исходника. */
export function pickFormat(accept: string, key: string): Format {
  if (accept.includes('image/avif')) return 'avif';
  if (accept.includes('image/webp')) return 'webp';
  return /\.png$/i.test(key) ? 'png' : 'jpeg';
}

// Перекодирование нагружает процессор: не больше двух одновременно, одинаковые запросы — одной задачей.
sharp.concurrency(1);
const MAX_PARALLEL = 2;
let running = 0;
const queue: (() => void)[] = [];
const inFlight = new Map<string, Promise<Buffer>>();

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => queue.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

async function readAll(body: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function encode(source: Buffer, width: number, format: Format): Promise<Buffer> {
  const img = sharp(source, { failOn: 'none' }).rotate().resize({ width, withoutEnlargement: true });
  switch (format) {
    case 'avif':
      return img.avif({ quality: 52, effort: 4 }).toBuffer();
    case 'webp':
      return img.webp({ quality: 76, effort: 4 }).toBuffer();
    case 'png':
      return img.png({ compressionLevel: 9, palette: true, quality: 85 }).toBuffer();
    default:
      return img.jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer();
  }
}

/** Папка копий одной картинки: _variants/img/foo.png/ (внутри — 640.avif@<etag> …). */
const variantsPrefix = (key: string) => `_variants/${key}/`;

/** Удалить все копии картинки (файл удалён или заменён). */
export async function dropVariants(s3: S3Client, bucket: string, key: string): Promise<void> {
  if (!VARIANT_SOURCE.test(key)) return;
  for await (const o of listObjects(s3, bucket, variantsPrefix(key))) await deleteObject(s3, bucket, o.key);
}

export interface Variant {
  body: Buffer;
  contentType: string;
}

/**
 * Копия картинки key шириной width в формате format (из кеша S3 или новая).
 * version — ETag исходника: после замены файла старые копии не используются.
 */
export async function getVariant(s3: S3Client, bucket: string, key: string, width: number, format: Format, version: string): Promise<Variant> {
  const cacheKey = `${variantsPrefix(key)}${width}.${format}@${version}`;
  try {
    const cached = await getObject(s3, bucket, cacheKey);
    return { body: await readAll(cached.Body), contentType: MIME[format] };
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  let job = inFlight.get(cacheKey);
  if (!job) {
    job = limited(async () => {
      const source = await readAll((await getObject(s3, bucket, key)).Body);
      const body = await encode(source, width, format);
      await putObject(s3, bucket, cacheKey, body, MIME[format]);
      return body;
    }).finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, job);
  }
  return { body: await job, contentType: MIME[format] };
}
