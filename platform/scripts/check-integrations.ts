/**
 * Проверка внешних систем по platform/.env — ничего не отправляя и не печатая секретов:
 * PostgreSQL и Redis (вход с паролем), TimeWeb S3 (доступ к обоим бакетам по ключам),
 * SMTP заявок и рассылок (только вход на почтовый сервер), вебхук Битрикс24 (чтение полей
 * лида и прав вебхука — лиды не создаются). Перед выпуском и после смены паролей/ключей:
 *
 *   npx tsx scripts/check-integrations.ts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(path.join(ROOT, '.env'));
const e = process.env;
let failed = 0;

async function check(name: string, run: () => Promise<string>) {
  try {
    console.log(`✓ ${name}: ${await run()}`);
  } catch (err) {
    failed++;
    console.log(`✗ ${name}: ${(err as Error).message.slice(0, 160)}`);
  }
}
const skip = (name: string, why: string) => console.log(`— ${name}: ${why}`);
const withTimeout = <T>(p: Promise<T>, ms = 15_000) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`нет ответа за ${ms / 1000} с`)), ms))]);

await check('PostgreSQL', async () => {
  const c = new pg.Client({ connectionString: e.DATABASE_URL });
  await c.connect();
  const n = (await c.query('select count(*)::int n from content.pages')).rows[0].n;
  await c.end();
  return `вход есть, страниц ${n}`;
});

await check('Redis', async () => {
  const r = new Redis(e.REDIS_URL!, { maxRetriesPerRequest: 1, lazyConnect: true });
  await r.connect();
  const pong = await r.ping();
  r.disconnect();
  return pong === 'PONG' ? 'вход с паролем есть' : pong;
});

await check('TimeWeb S3', async () => {
  const s3 = new S3Client({
    endpoint: e.S3_ENDPOINT,
    region: e.S3_REGION,
    forcePathStyle: e.S3_FORCE_PATH_STYLE !== 'false',
    credentials: { accessKeyId: e.S3_ACCESS_KEY!, secretAccessKey: e.S3_SECRET_KEY! },
  });
  for (const bucket of [e.S3_BUCKET_ASSETS!, e.S3_BUCKET_PRIVATE!]) await withTimeout(s3.send(new HeadBucketCommand({ Bucket: bucket })));
  return `ключи действуют, бакеты ${e.S3_BUCKET_ASSETS} и ${e.S3_BUCKET_PRIVATE} доступны`;
});

async function smtp(name: string, prefix: '' | 'MAILING_') {
  const host = e[`${prefix}SMTP_HOST`];
  const user = e[`${prefix}SMTP_USER`];
  const pass = e[`${prefix}SMTP_PASS`];
  if (!host || !user || !pass) return skip(name, `не задан (${prefix}SMTP_HOST, ${prefix}SMTP_USER, ${prefix}SMTP_PASS)`);
  const tls = e[`${prefix}SMTP_SECURE`] === 'tls';
  await check(name, async () => {
    const transport = nodemailer.createTransport({
      host,
      port: Number(e[`${prefix}SMTP_PORT`]) || (tls ? 587 : 465),
      secure: !tls,
      requireTLS: tls,
      auth: { user, pass },
      // как у сервисов: недоступный адрес сервера — к следующему через 10 с
      connectionTimeout: 10_000,
      greetingTimeout: 15_000,
    });
    await withTimeout(transport.verify(), 60_000);
    transport.close();
    return `вход на ${host} как ${user.replace(/^(.).*(@.*)$/, '$1…$2')} — письма не отправлялись`;
  });
}
await smtp('SMTP заявок', '');
if (e.MAIL_TRANSPORT === 'smtp' && !e.MAIL_TO) console.log('! MAIL_TO не задан — письма о заявках уйдут на info@uralinduktor.ru');
await smtp('SMTP рассылок', 'MAILING_');

if (!e.B24_WEBHOOK) skip('Битрикс24', 'вебхук не задан (B24_WEBHOOK)');
else
  await check('Битрикс24', async () => {
    const base = e.B24_WEBHOOK!.replace(/\/?$/, '/');
    const call = async (method: string) => {
      const res = await withTimeout(fetch(`${base}${method}.json`));
      const body = (await res.json().catch(() => ({}))) as { result?: unknown; error_description?: string; error?: string };
      if (!res.ok || body.error) throw new Error(`${method}: ${body.error_description || body.error || `HTTP ${res.status}`}`);
      return body.result;
    };
    const scope = (await call('scope')) as string[];
    const fields = (await call('crm.lead.fields')) as Record<string, unknown>;
    const ym = e.B24_YM_UID_FIELD;
    return `портал ${new URL(base).host}, права: ${scope.join(', ')}; полей лида ${Object.keys(fields).length}${ym ? `, поле Метрики ${ym} ${ym in fields ? 'есть' : 'НЕ НАЙДЕНО'}` : ''} — лиды не создавались`;
  });

console.log(failed ? `\nне прошло проверок: ${failed}` : '\nвсё, что задано, работает');
process.exit(failed ? 1 : 0);
