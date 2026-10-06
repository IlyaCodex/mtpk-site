/** Обращения страниц админки к её REST API (/api/v1/…) из браузера. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(errorText(status, body));
  }
}

type Issue = { path?: (string | number)[]; message?: string; instancePath?: string };

/** Понятный текст ошибки: сообщение сервиса, список полей zod или код ответа. */
function errorText(status: number, body: unknown): string {
  const b = (body ?? {}) as { message?: string; error?: string; issues?: Issue[] };
  if (b.message) return b.message;
  if (Array.isArray(b.issues) && b.issues.length) {
    return b.issues
      .slice(0, 4)
      .map((i) => `${(i.path ?? []).join('.') || i.instancePath || 'поле'}: ${i.message ?? 'ошибка'}`)
      .join('; ');
  }
  if (status === 401) return 'Сессия истекла — войдите заново';
  if (status === 403) return 'Недостаточно прав';
  if (status === 404) return 'Не найдено';
  if (status === 409) return b.error === 'path_exists' ? 'Страница с таким адресом уже есть' : 'Конфликт данных';
  return b.error ? `Ошибка: ${b.error}` : `Ошибка ${status}`;
}

export async function api<T = unknown>(
  path: string,
  init: { method?: string; json?: unknown; body?: BodyInit; headers?: Record<string, string> } = {},
): Promise<T> {
  const res = await fetch(`/api/v1/${path.replace(/^\/+/, '')}`, {
    method: init.method ?? (init.json !== undefined || init.body ? 'POST' : 'GET'),
    headers: init.json !== undefined ? { 'content-type': 'application/json', ...init.headers } : init.headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    credentials: 'same-origin',
  });
  const isJson = res.headers.get('content-type')?.includes('json');
  const data = isJson ? await res.json().catch(() => null) : await res.text();
  if (res.status === 401 && typeof window !== 'undefined') window.location.assign('/login');
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
