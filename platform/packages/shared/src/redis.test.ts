import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JsonCache, type Redis } from './redis.ts';

/** Redis в памяти: get/set/unlink — всё, что нужно кешу. */
function memoryRedis() {
  const data = new Map<string, string>();
  return {
    data,
    redis: {
      get: async (k: string) => data.get(k) ?? null,
      set: async (k: string, v: string) => void data.set(k, v),
      unlink: async (...keys: string[]) => keys.forEach((k) => data.delete(k)),
    } as unknown as Redis,
  };
}

const later = <T>(value: T, ms = 20) => new Promise<T>((r) => setTimeout(() => r(value), ms));

test('одновременные промахи по ключу — одно вычисление', async () => {
  const { redis } = memoryRedis();
  const cache = new JsonCache(redis, 't');
  let calls = 0;
  const fn = () => {
    calls++;
    return later({ n: 1 });
  };
  const all = await Promise.all([cache.wrap('k', 60, fn), cache.wrap('k', 60, fn), cache.wrap('k', 60, fn)]);
  assert.equal(calls, 1);
  assert.deepEqual(all, [{ n: 1 }, { n: 1 }, { n: 1 }]);
  // дальше — из кеша
  await cache.wrap('k', 60, fn);
  assert.equal(calls, 1);
});

test('сброс во время вычисления — старое значение не записывается, новые запросы считают заново', async () => {
  const { redis, data } = memoryRedis();
  const cache = new JsonCache(redis, 't');
  const stale = cache.wrap('k', 60, () => later('старое', 30));
  await later(null, 5);
  await cache.del('k');
  const fresh = await cache.wrap('k', 60, () => later('новое', 5));
  assert.equal(fresh, 'новое');
  assert.equal(await stale, 'старое');
  assert.equal(data.get('t:k'), JSON.stringify('новое'));
});

test('ошибка вычисления — у всех ждущих, следующий запрос считает заново', async () => {
  const { redis } = memoryRedis();
  const cache = new JsonCache(redis, 't');
  const fail = () => later(null).then(() => Promise.reject(new Error('нет базы')));
  const results = await Promise.allSettled([cache.wrap('k', 60, fail), cache.wrap('k', 60, fail)]);
  assert.deepEqual(
    results.map((r) => r.status),
    ['rejected', 'rejected'],
  );
  assert.equal(await cache.wrap('k', 60, () => later('есть')), 'есть');
});
