import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import type { S3Env } from './env.ts';

export { S3Client };

/**
 * S3-клиент для MinIO (сейчас) и Wasabi (потом). Отличаются только endpoint,
 * регион, ключи и path-style — всё берётся из окружения.
 * Контрольные суммы CRC32 по умолчанию (SDK ≥ 3.729) отключены до «когда нужно»:
 * часть S3-совместимых хранилищ их не понимает.
 */
export function createS3(env: S3Env): S3Client {
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  html: 'text/html; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export function contentTypeFor(key: string): string {
  const ext = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
  return TYPES[ext] ?? 'application/octet-stream';
}

export interface S3ObjectInfo {
  key: string;
  size: number;
  etag: string;
  lastModified: Date | undefined;
}

/** Все объекты бакета под префиксом (постранично, без загрузки содержимого). */
export async function* listObjects(s3: S3Client, bucket: string, prefix = ''): AsyncGenerator<S3ObjectInfo> {
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }),
    );
    for (const o of page.Contents ?? []) {
      if (!o.Key) continue;
      yield { key: o.Key, size: o.Size ?? 0, etag: (o.ETag ?? '').replaceAll('"', ''), lastModified: o.LastModified };
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

export async function putObject(
  s3: S3Client,
  bucket: string,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType = contentTypeFor(key),
  metadata?: Record<string, string>,
): Promise<string> {
  const res = await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, Metadata: metadata }),
  );
  return (res.ETag ?? '').replaceAll('"', '');
}

export async function getObject(
  s3: S3Client,
  bucket: string,
  key: string,
  range?: string,
  ifNoneMatch?: string,
): Promise<GetObjectCommandOutput> {
  return s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range, IfNoneMatch: ifNoneMatch }));
}

export async function headObject(s3: S3Client, bucket: string, key: string) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function deleteObject(s3: S3Client, bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
}

export function isNotModified(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NotModified' || e?.$metadata?.httpStatusCode === 304;
}
