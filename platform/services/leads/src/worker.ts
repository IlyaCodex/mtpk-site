/**
 * Воркер доставки заявок: письмо менеджеру (SMTP) и лид в Битрикс24.
 * Каналы независимы: упал один — второй всё равно отправляется, а BullMQ
 * повторяет задание (8 попыток с нарастающей паузой) только для недоставленного.
 */
import { Worker, type Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { createLogger, createS3, deleteObject, getObject } from '@mtpk/shared';
import { createDb, type Lead, type Prisma } from '@mtpk/db';
import { B24_WEBHOOK, env, MAIL_TRANSPORT } from './env.ts';
import { bitrixLeadFields, emailBody, MAIL_SUBJECT, phpBuildQuery } from './messages.ts';
import { bullConnection, QUEUE, type DeliveryJob, type DeliveryResult } from './queue.ts';

const log = createLogger('leads-worker');
const { db, close } = createDb(env.DATABASE_URL, { max: 3, appName: 'leads-worker' });
const s3 = createS3(env);

const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.MAIL_TO);
const transport =
  MAIL_TRANSPORT === 'smtp' && smtpConfigured
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? (env.SMTP_SECURE === 'tls' ? 587 : 465),
        secure: env.SMTP_SECURE === 'ssl',
        requireTLS: env.SMTP_SECURE === 'tls',
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        // у почтового сервера несколько адресов: недоступный — к следующему через 10 с, а не через 2 мин
        connectionTimeout: 10_000,
        greetingTimeout: 15_000,
        // проверка сертификата включена по умолчанию — не отключать
      })
    : nodemailer.createTransport({ jsonTransport: true });

async function streamToBuffer(body: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

async function sendMail(lead: Lead): Promise<void> {
  const attachments: { filename: string; content: Buffer }[] = [];
  if (lead.attachmentKey && lead.attachmentName) {
    const obj = await getObject(s3, env.S3_BUCKET_PRIVATE, lead.attachmentKey);
    attachments.push({ filename: lead.attachmentName, content: await streamToBuffer(obj.Body) });
  }
  const info = await transport.sendMail({
    from: { name: 'Сайт Уралиндуктор', address: env.MAIL_FROM || env.SMTP_USER || 'site@uralinduktor.ru' },
    to: env.MAIL_TO || 'info@uralinduktor.ru',
    replyTo: lead.email || undefined,
    subject: MAIL_SUBJECT,
    text: emailBody(lead),
    attachments,
  });
  if (MAIL_TRANSPORT === 'log' || !smtpConfigured) {
    log.info({ leadId: lead.id, preview: JSON.parse(String(info.message)).text?.slice(0, 400) }, 'письмо (режим log — не отправлялось)');
  }
}

/** Вызов REST Битрикс24 как в send.php: POST form-urlencoded, таймаут 10 с. */
async function b24call(method: string, params: Record<string, unknown>): Promise<{ result: unknown; http: number }> {
  const base = B24_WEBHOOK.replace(/\/?$/, '/');
  const res = await fetch(`${base}${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: phpBuildQuery(params),
    signal: AbortSignal.timeout(10_000),
  });
  const http = res.status;
  if (http !== 200) return { result: null, http };
  const json = (await res.json().catch(() => ({}))) as { result?: unknown };
  return { result: json.result ?? null, http };
}

async function deliver(job: Job<DeliveryJob, DeliveryResult>): Promise<DeliveryResult> {
  const lead = await db.lead.findUnique({ where: { id: job.data.leadId } });
  if (!lead) throw new Error(`заявка ${job.data.leadId} не найдена`);
  const patch: Prisma.LeadUpdateInput = {};
  const errors: string[] = [];

  // 1. Письмо
  let mail: DeliveryResult['mail'] = lead.mailStatus === 'sent' ? 'sent' : 'failed';
  if (lead.mailStatus !== 'sent') {
    try {
      await sendMail(lead);
      mail = 'sent';
      Object.assign(patch, { mailStatus: 'sent', mailError: null, mailSentAt: new Date() });
    } catch (err) {
      errors.push(`mail: ${(err as Error).message}`);
      Object.assign(patch, { mailStatus: 'failed', mailError: (err as Error).message.slice(0, 500) });
    }
  }

  // 2. Битрикс24: лид, затем сквозной трейс (ошибка трейса лид не отменяет)
  let b24: DeliveryResult['b24'] = lead.b24Status === 'sent' ? 'sent' : B24_WEBHOOK ? 'failed' : 'skipped';
  if (!B24_WEBHOOK) {
    patch.b24Status = 'skipped';
  } else if (lead.b24Status !== 'sent') {
    try {
      const { result, http } = await b24call('crm.lead.add', { fields: bitrixLeadFields(lead, env.B24_YM_UID_FIELD) });
      patch.b24Http = http;
      if (!result) throw new Error(`crm.lead.add: HTTP ${http}`);
      const leadId = Number(result);
      Object.assign(patch, { b24Status: 'sent', b24LeadId: leadId, b24Error: null });
      b24 = 'sent';
      if (lead.b24Trace) {
        if (lead.b24TraceValid) {
          const trace = await b24call('crm.tracking.trace.add', { TRACE: lead.b24Trace, ENTITIES: [{ TYPE: 'LEAD', ID: leadId }] }).catch(
            () => ({ result: null, http: 0 }),
          );
          Object.assign(patch, trace.result ? { b24TraceStatus: 'sent', b24TraceId: Number(trace.result) } : { b24TraceStatus: `failed:${trace.http}` });
        } else {
          patch.b24TraceStatus = 'invalid';
        }
      } else {
        patch.b24TraceStatus = 'skip';
      }
    } catch (err) {
      errors.push(`b24: ${(err as Error).message}`);
      Object.assign(patch, { b24Status: 'failed', b24Error: (err as Error).message.slice(0, 500) });
    }
  }

  const delivered = mail === 'sent' && (b24 === 'sent' || b24 === 'skipped');
  const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  patch.status = delivered ? 'delivered' : mail === 'sent' || b24 === 'sent' ? (lastAttempt ? 'partial' : 'received') : lastAttempt ? 'failed' : 'received';
  if (delivered) patch.deliveredAt = new Date();
  patch.updatedAt = new Date();
  await db.lead.update({ where: { id: lead.id }, data: patch });

  // Вложение хранится только до отправки письма — как в send.php (файл нигде не оседал)
  if (mail === 'sent' && lead.attachmentKey) {
    await deleteObject(s3, env.S3_BUCKET_PRIVATE, lead.attachmentKey).catch(() => {});
    await db.lead.update({ where: { id: lead.id }, data: { attachmentKey: null } });
  }

  log.info({ leadId: lead.id, mail, b24, attempt: job.attemptsMade + 1 }, 'доставка заявки');
  if (errors.length) {
    // Отвечаем API (если ждёт) частичным успехом, но задание повторится
    if (mail === 'sent' || b24 === 'sent') await job.updateProgress({ mail, b24 });
    throw new Error(errors.join('; '));
  }
  return { mail, b24 };
}

const worker = new Worker<DeliveryJob, DeliveryResult>(QUEUE, deliver, {
  connection: bullConnection(env.REDIS_URL),
  concurrency: 4,
});
worker.on('failed', (job, err) => log.warn({ jobId: job?.id, attempts: job?.attemptsMade, err: err.message }, 'попытка доставки не удалась'));
worker.on('error', (err) => log.error({ err }, 'ошибка воркера'));
log.info({ queue: QUEUE, mail: MAIL_TRANSPORT === 'smtp' && smtpConfigured ? 'smtp' : 'log', b24: Boolean(B24_WEBHOOK) }, 'воркер доставки запущен');

const shutdown = async () => {
  await worker.close();
  await close();
  process.exit(0);
};
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
