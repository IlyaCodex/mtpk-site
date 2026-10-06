import { SERVICES, serviceBase } from './services';

export type OpenApi = {
  info?: { title?: string; description?: string };
  paths?: Record<string, Record<string, Record<string, unknown>>>;
  components?: Record<string, unknown>;
};

/** Собственные методы админки (не проксируются в сервисы). */
const OWN_PATHS: OpenApi['paths'] = {
  '/api/v1/auth/login': { post: { tags: ['Админка: вход'], summary: 'Вход: { email, password } → cookie сессии' } },
  '/api/v1/auth/logout': { post: { tags: ['Админка: вход'], summary: 'Выход' } },
  '/api/v1/me': { get: { tags: ['Админка: вход'], summary: 'Текущий пользователь и доступные разделы' } },
  '/api/v1/users': {
    get: { tags: ['Админка: пользователи'], summary: 'Пользователи' },
    post: { tags: ['Админка: пользователи'], summary: 'Создать пользователя { email, name, role, password }' },
  },
  '/api/v1/users/{id}': {
    put: { tags: ['Админка: пользователи'], summary: 'Изменить имя, роль, активность, пароль' },
    delete: { tags: ['Админка: пользователи'], summary: 'Удалить пользователя' },
  },
  '/api/v1/audit': { get: { tags: ['Админка: журнал'], summary: 'Журнал действий (?search, offset, limit)' } },
  '/api/v1/preview': { post: { tags: ['Админка: страницы'], summary: 'Предпросмотр блоков страницы (HTML-документ)' } },
};

/**
 * Описание REST API админки (OpenAPI 3): методы /admin/v1 всех сервисов под
 * их адресами в админке (/api/v1/<сервис>/…) плюс собственные методы.
 * Публичные методы сервисов (/v1, /api) — списком в x-services, для справки.
 */
export async function buildOpenApi() {
  const paths: NonNullable<OpenApi['paths']> = { ...OWN_PATHS };
  const services: { name: string; title?: string; description?: string; public: string[] }[] = [];
  await Promise.all(
    SERVICES.map(async (name) => {
      const spec = (await fetch(`${serviceBase(name)}/openapi.json`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as OpenApi | null;
      if (!spec) {
        services.push({ name, title: `${name}: недоступен`, public: [] });
        return;
      }
      const pub: string[] = [];
      for (const [p, ops] of Object.entries(spec.paths ?? {})) {
        if (p.startsWith('/admin/v1/')) paths[p.replace('/admin/v1/', `/api/v1/${name}/`)] = ops;
        else pub.push(...Object.keys(ops).map((m) => `${m.toUpperCase()} ${p}`));
      }
      services.push({ name, title: spec.info?.title, description: spec.info?.description, public: pub });
    }),
  );
  services.sort((a, b) => a.name.localeCompare(b.name));
  return {
    openapi: '3.0.3',
    info: {
      title: 'МТПК · REST API админки',
      version: '1.0.0',
      description: 'Все методы требуют входа (cookie сессии); изменяющие — запроса со страниц админки (Origin).',
    },
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
    'x-services': services,
  };
}
