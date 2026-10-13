/**
 * Отправка рассылок. Очередь — в самой базе (mailing.recipients): получатели
 * забираются пачками с блокировкой строк (FOR UPDATE SKIP LOCKED) — одно
 * письмо не уйдёт дважды, даже если процессов несколько. Темп — MAILING_RATE
 * писем в секунду (лимит почтового сервиса). Пауза и отмена из админки
 * действуют между пачками. Временная ошибка — до 3 попыток; адрес не
 * существует — контакт помечается недоставляемым и больше не получает писем.
 * Отписавшиеся после запуска — пропускаются.
 */
import { createLogger } from '@mtpk/shared';
import { createDb, type MailCampaign } from '@mtpk/db';
import { prepareCampaign } from './campaigns.ts';
import { personalize, textVersion } from './compile.ts';
import { env, PUBLIC_URL, SENDS_FOR_REAL } from './env.ts';
import { createTransport, isBadAddress, isTemporary, send } from './mailer.ts';

const log = createLogger('mailing-worker');
const { db, close } = createDb(env.DATABASE_URL, { max: 3, appName: 'mailing-worker' });
const transport = createTransport();

const BATCH = Math.max(5, Math.min(100, Math.round(env.MAILING_RATE * 10)));
const GAP_MS = 1000 / env.MAILING_RATE;
const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let stopping = false;

type Claimed = { id: number; email: string; name: string | null; token: string; attempts: number; contact_status: string | null };

/** Запланированные рассылки, время которых пришло: подготовка и старт. */
async function startDue(): Promise<void> {
  const due = await db.mailCampaign.findMany({ where: { status: 'scheduled', scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: 'asc' } });
  for (const c of due) {
    // кто-то другой уже взял (несколько процессов) — пропускаем
    const taken = await db.mailCampaign.updateMany({ where: { id: c.id, status: 'scheduled' }, data: { status: 'preparing' } });
    if (!taken.count) continue;
    try {
      const total = await prepareCampaign(db, c);
      log.info({ campaign: c.id, total, mode: SENDS_FOR_REAL ? 'smtp' : 'log' }, 'рассылка запущена');
    } catch (err) {
      log.error({ err, campaign: c.id }, 'не удалось подготовить рассылку');
      await db.mailCampaign.update({ where: { id: c.id }, data: { status: 'scheduled' } });
    }
  }
}

/** Письма, зависшие при сбое процесса, — снова в очередь. */
async function requeueStale(): Promise<void> {
  await db.$executeRaw`UPDATE mailing.recipients SET status = 'queued', locked_at = NULL WHERE status = 'sending' AND locked_at < now() - interval '10 minutes'`;
}

async function claim(campaignId: number): Promise<Claimed[]> {
  return db.$queryRaw<Claimed[]>`
    UPDATE mailing.recipients r SET status = 'sending', locked_at = now(), attempts = r.attempts + 1
    FROM (
      SELECT id FROM mailing.recipients WHERE campaign_id = ${campaignId} AND status = 'queued'
      ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED
    ) picked
    WHERE r.id = picked.id
    RETURNING r.id, r.email, r.name, r.token, r.attempts,
      (SELECT c.status FROM mailing.contacts c WHERE c.id = r.contact_id) AS contact_status`;
}

/** Одна пачка писем рассылки; false — отправлять больше нечего (или рассылку остановили). */
async function sendBatch(c: MailCampaign, linkIds: Map<number, number>): Promise<boolean> {
  const batch = await claim(c.id);
  if (!batch.length) return false;
  for (const r of batch) {
    const started = Date.now();
    if (r.contact_status && r.contact_status !== 'active') {
      await db.mailRecipient.update({ where: { id: r.id }, data: { status: 'skipped', error: r.contact_status === 'unsubscribed' ? 'отписался' : 'адрес недоставляем', lockedAt: null } });
      continue;
    }
    const html = personalize(c.compiled ?? '', { token: r.token, name: r.name, email: r.email, linkIds, publicUrl: PUBLIC_URL, pixel: true });
    try {
      await send(transport, {
        to: r.email,
        toName: r.name,
        fromName: c.fromName,
        subject: c.subject.replace(/\{\{\s*name\s*(?:\|\s*([^}]*?)\s*)?\}\}/g, (_m, f: string | undefined) => r.name?.trim() || f || ''),
        html,
        text: textVersion(html),
        unsubscribeUrl: `${PUBLIC_URL}/r/u/${r.token}`,
        campaignId: c.id,
      });
      await db.mailRecipient.update({ where: { id: r.id }, data: { status: 'sent', sentAt: new Date(), error: null, lockedAt: null } });
    } catch (err) {
      const message = String((err as Error).message ?? err).slice(0, 500);
      const retry = isTemporary(err) && r.attempts < MAX_ATTEMPTS;
      await db.mailRecipient.update({ where: { id: r.id }, data: { status: retry ? 'queued' : 'failed', error: message, lockedAt: null } });
      if (!retry && isBadAddress(err)) await db.mailContact.updateMany({ where: { email: r.email }, data: { status: 'bounced' } });
      log.warn({ campaign: c.id, recipient: r.id, retry, err: message }, 'письмо не отправлено');
    }
    // темп отправки — не быстрее MAILING_RATE писем в секунду
    const wait = GAP_MS - (Date.now() - started);
    if (wait > 0) await sleep(wait);
  }
  return true;
}

/** Рассылки, которые отправляются: пачками, пока есть очередь и их не остановили. */
async function sendDue(): Promise<void> {
  const active = await db.mailCampaign.findMany({ where: { status: 'sending' }, orderBy: { startedAt: 'asc' } });
  for (const c of active) {
    const links = await db.mailLink.findMany({ where: { campaignId: c.id }, select: { id: true, position: true } });
    const linkIds = new Map(links.map((l) => [l.position, l.id]));
    let sent = 0;
    for (;;) {
      if (stopping) return;
      const now = await db.mailCampaign.findUnique({ where: { id: c.id }, select: { status: true } });
      if (now?.status !== 'sending') break;
      if (!(await sendBatch(c, linkIds))) {
        // очередь пуста: остались ли письма «в пути» (повтор после ошибки, другой процесс)
        const left = await db.mailRecipient.count({ where: { campaignId: c.id, status: { in: ['queued', 'sending'] } } });
        if (!left) {
          await db.mailCampaign.updateMany({ where: { id: c.id, status: 'sending' }, data: { status: 'sent', finishedAt: new Date() } });
          log.info({ campaign: c.id }, 'рассылка отправлена');
        }
        break;
      }
      sent += 1;
      if (sent % 20 === 0) log.info({ campaign: c.id, batches: sent }, 'рассылка идёт');
    }
  }
}

log.info({ rate: env.MAILING_RATE, batch: BATCH, mode: SENDS_FOR_REAL ? 'smtp' : 'log' }, SENDS_FOR_REAL ? 'отправитель рассылок запущен' : 'отправитель рассылок запущен в тестовом режиме — письма не уходят');

const shutdown = async () => {
  stopping = true;
  await sleep(500);
  transport.close();
  await close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

while (!stopping) {
  try {
    await startDue();
    await requeueStale();
    await sendDue();
  } catch (err) {
    log.error({ err }, 'ошибка цикла отправки');
  }
  await sleep(2000);
}
