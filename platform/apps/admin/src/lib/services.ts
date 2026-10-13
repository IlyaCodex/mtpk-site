import { env } from './env';
import type { SessionUser } from './auth';

/** Микросервисы, у которых есть служебное API /admin/v1. */
export const SERVICES = ['content', 'leads', 'media', 'search', 'mailing'] as const;
export type Service = (typeof SERVICES)[number];

export function serviceBase(service: Service): string {
  const e = env();
  return { content: e.CONTENT_URL, leads: e.LEADS_URL, media: e.MEDIA_URL, search: e.SEARCH_URL, mailing: e.MAILING_URL }[service].replace(/\/$/, '');
}

export class ServiceError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`сервис ответил ${status}`);
  }
}

/** Запрос к служебному API сервиса от имени пользователя админки. */
export function serviceFetch(service: Service, path: string, init: RequestInit & { user?: SessionUser } = {}): Promise<Response> {
  const { user, headers, ...rest } = init;
  const h = new Headers(headers);
  h.set('x-admin-token', env().ADMIN_TOKEN);
  if (user) h.set('x-admin-user', user.email);
  return fetch(`${serviceBase(service)}/admin/v1/${path.replace(/^\/+/, '')}`, { ...rest, headers: h, cache: 'no-store' });
}

/** То же, но сразу JSON; ошибка сервиса — исключение ServiceError. */
export async function serviceJson<T>(service: Service, path: string, init: RequestInit & { user?: SessionUser; json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await serviceFetch(service, path, {
    ...rest,
    ...(json !== undefined ? { body: JSON.stringify(json), headers: { ...rest.headers, 'content-type': 'application/json' } } : {}),
  });
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ServiceError(res.status, body);
  return body as T;
}
