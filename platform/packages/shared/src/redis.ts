import { Redis, type RedisOptions } from 'ioredis';

export { Redis };

/**
 * Подключение к Redis. maxRetriesPerRequest: null — команды ждут переподключения,
 * а не падают (так требует BullMQ, и так же удобнее кешу при рестарте Redis).
 */
export function createRedis(url: string, options: RedisOptions = {}): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...options,
  });
}

/**
 * Кеш JSON-значений с префиксом. Кеш — не источник правды: при недоступности
 * Redis методы не бросают, а ведут себя как промах (сайт работает напрямую с БД).
 */
export class JsonCache {
  constructor(
    private readonly redis: Redis,
    private readonly prefix: string,
    private readonly onError: (err: unknown) => void = () => {},
  ) {}

  key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  async get<T>(k: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.key(k));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.onError(err);
      return null;
    }
  }

  async set(k: string, value: unknown, ttlSec: number): Promise<void> {
    try {
      await this.redis.set(this.key(k), JSON.stringify(value), 'EX', ttlSec);
    } catch (err) {
      this.onError(err);
    }
  }

  /** get-or-compute: промах кеша → fn() → запись с TTL. null/undefined не кешируются. */
  async wrap<T>(k: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(k);
    if (hit !== null) return hit;
    const value = await fn();
    if (value !== null && value !== undefined) await this.set(k, value, ttlSec);
    return value;
  }

  async del(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await this.redis.unlink(...keys.map((k) => this.key(k)));
    } catch (err) {
      this.onError(err);
    }
  }

  /** Сброс всех ключей префикса (SCAN, без блокировки Redis). Возвращает число ключей. */
  async clear(pattern = '*'): Promise<number> {
    let removed = 0;
    try {
      const stream = this.redis.scanStream({ match: this.key(pattern), count: 500 });
      for await (const batch of stream as AsyncIterable<string[]>) {
        if (batch.length) {
          removed += batch.length;
          await this.redis.unlink(...batch);
        }
      }
    } catch (err) {
      this.onError(err);
    }
    return removed;
  }
}
