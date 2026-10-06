import { Queue, QueueEvents, type ConnectionOptions } from 'bullmq';

export const QUEUE = 'leads-delivery';

export interface DeliveryJob {
  leadId: number;
}

export interface DeliveryResult {
  mail: 'sent' | 'skipped' | 'failed';
  b24: 'sent' | 'skipped' | 'failed';
}

/** Подключение для BullMQ из REDIS_URL (redis://[:pass@]host:port[/db]). */
export function bullConnection(url: string): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    username: u.username ? decodeURIComponent(u.username) : undefined,
    db: u.pathname && u.pathname !== '/' ? Number(u.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
  };
}

export function createQueue(url: string) {
  const connection = bullConnection(url);
  const queue = new Queue<DeliveryJob, DeliveryResult>(QUEUE, {
    connection,
    defaultJobOptions: {
      // 8 попыток с нарастающей паузой ≈ 2 часа: переживаем сбой SMTP или Битрикс24
      attempts: 8,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { age: 7 * 24 * 3600, count: 5000 },
      removeOnFail: { age: 30 * 24 * 3600 },
    },
  });
  const events = new QueueEvents(QUEUE, { connection });
  return { queue, events };
}
