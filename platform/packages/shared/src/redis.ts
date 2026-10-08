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
  /** вычисления, которые идут сейчас: одновременные промахи по ключу ждут одно (без «лавины» после сброса кеша) */
  private readonly inflight = new Map<string, Promise<unknown>>();
  /** растёт при каждом сбросе: вычисление, начатое до сброса, не записывает устаревшее значение */
  private generation = 0;

  constructor(
    private readonly redis: Redis,
    private readonly prefix: string,
    private readonly onError: (err: unknown) => void = () => {},
  ) {}

  /** Сброс: идущие вычисления больше не ждём и их результат не записываем. */
  private forget(): void {
    this.generation++;
    this.inflight.clear();
  }

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

  /**
   * get-or-compute: промах кеша → fn() → запись с TTL. null/undefined не кешируются.
   * Одновременные промахи по одному ключу ждут одно вычисление: после сброса кеша
   * (сохранили настройки — сайт перерисовывает все страницы) тяжёлое значение
   * считается один раз, а не на каждый запрос.
   */
  async wrap<T>(k: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(k);
    if (hit !== null) return hit;
    const running = this.inflight.get(k);
    if (running) return running as Promise<T>;
    const gen = this.generation;
    // eslint-disable-next-line prefer-const -- job нужен внутри собственного вычисления (finally)
    let job!: Promise<T>;
    job = (async () => {
      try {
        const value = await fn();
        if (value !== null && value !== undefined && gen === this.generation) await this.set(k, value, ttlSec);
        return value;
      } finally {
        if (this.inflight.get(k) === job) this.inflight.delete(k);
      }
    })();
    this.inflight.set(k, job);
    return job;
  }

  async del(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    this.forget();
    try {
      await this.redis.unlink(...keys.map((k) => this.key(k)));
    } catch (err) {
      this.onError(err);
    }
  }

  /** Сброс всех ключей префикса (SCAN, без блокировки Redis). Возвращает число ключей. */
  async clear(pattern = '*'): Promise<number> {
    this.forget();
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
