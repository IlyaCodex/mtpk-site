import type { Redis } from 'ioredis';
import type { Logger } from './logger.ts';

/**
 * Шина событий между сервисами на Redis Streams. Контент-сервис публикует
 * изменения страниц, поиск (и кто угодно ещё) читает их своей consumer group:
 * событие не теряется, если подписчик лежал, — дочитает после старта.
 */
export const CONTENT_STREAM = 'events:content';

export type ContentEvent =
  | { type: 'page.upserted'; path: string }
  | { type: 'page.deleted'; path: string }
  /** массовое изменение (импорт): подписчикам пересобрать всё */
  | { type: 'content.reindex' };

export async function publishEvent(redis: Redis, stream: string, event: ContentEvent): Promise<void> {
  await redis.xadd(stream, 'MAXLEN', '~', '10000', '*', 'data', JSON.stringify(event));
}

export interface ConsumeOptions {
  redis: Redis; // отдельное соединение: XREADGROUP BLOCK занимает его целиком
  stream: string;
  group: string;
  consumer: string;
  logger: Logger;
  handler: (event: ContentEvent) => Promise<void>;
  signal?: AbortSignal;
  /** Сколько событий забирать за раз */
  batch?: number;
}

type StreamReply = [string, [string, string[]][]][] | null;

/**
 * Цикл чтения группы. Событие подтверждается (XACK) только после успешной
 * обработки; упавшее остаётся в pending и будет повторено при следующем старте.
 */
export async function consumeEvents(opts: ConsumeOptions): Promise<void> {
  const { redis, stream, group, consumer, logger, handler, signal } = opts;
  const count = String(opts.batch ?? 50);
  try {
    await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
  } catch (err) {
    if (!String((err as Error).message).includes('BUSYGROUP')) throw err;
  }

  const handle = async (id: string, fields: string[]) => {
    const raw = fields[fields.indexOf('data') + 1];
    try {
      await handler(JSON.parse(raw ?? '{}') as ContentEvent);
      await redis.xack(stream, group, id);
    } catch (err) {
      logger.error({ err, id }, 'событие не обработано, останется в pending');
    }
  };

  // 1. Один проход по «зависшим» событиям этого consumer'а (упали до ACK).
  let pendingCursor = '0';
  for (;;) {
    const res = (await redis.xreadgroup(
      'GROUP', group, consumer, 'COUNT', count, 'STREAMS', stream, pendingCursor,
    )) as StreamReply;
    const entries = res?.[0]?.[1] ?? [];
    if (!entries.length) break;
    for (const [id, fields] of entries) {
      await handle(id, fields);
      pendingCursor = id;
    }
  }

  // 2. Новые события.
  while (!signal?.aborted) {
    let res: StreamReply;
    try {
      res = (await redis.xreadgroup(
        'GROUP', group, consumer, 'COUNT', count, 'BLOCK', '5000', 'STREAMS', stream, '>',
      )) as StreamReply;
    } catch (err) {
      if (signal?.aborted) return;
      logger.error({ err }, 'ошибка чтения потока событий, повтор через 2с');
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    for (const [id, fields] of res?.[0]?.[1] ?? []) await handle(id, fields);
  }
}
