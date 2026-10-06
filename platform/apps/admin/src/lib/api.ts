import { can, currentUser, type Area, type SessionUser } from './auth';
import { ServiceError } from './services';

/**
 * Изменяющие запросы — только со страниц самой админки (защита от CSRF
 * вдобавок к SameSite-cookie): Origin должен совпадать с адресом админки.
 */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const jsonError = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  Response.json({ error, ...extra }, { status });

/**
 * Обёртка маршрута REST API админки: вход, права на раздел, Origin,
 * единый формат ошибок ({ error, … }).
 */
export function route<C = unknown>(
  area: Area | null,
  handler: (req: Request, user: SessionUser, ctx: C) => Promise<Response>,
): (req: Request, ctx: C) => Promise<Response> {
  return async (req, ctx) => {
    const user = await currentUser();
    if (!user) return jsonError(401, 'unauthorized');
    if (area && !can(user, area)) return jsonError(403, 'forbidden');
    if (!['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) return jsonError(403, 'bad_origin');
    try {
      return await handler(req, user, ctx);
    } catch (err) {
      if (err instanceof ServiceError) return Response.json(err.body, { status: err.status });
      if (err instanceof Error && err.name === 'ZodError') {
        return jsonError(400, 'bad_request', { issues: (err as unknown as { issues: unknown }).issues });
      }
      console.error('API админки:', err);
      return jsonError(500, 'internal_error');
    }
  };
}
