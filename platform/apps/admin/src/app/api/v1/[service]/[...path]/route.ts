import { audit } from '@/lib/audit';
import { jsonError, route } from '@/lib/api';
import { can, type SessionUser } from '@/lib/auth';
import { SERVICES, serviceFetch, type Service } from '@/lib/services';

type Ctx = { params: Promise<{ service: string; path: string[] }> };

/** Что записать в журнал о запросе: адрес страницы, редирект или размер файла — не тело целиком. */
function summarize(contentType: string, body: ArrayBuffer | undefined): Record<string, unknown> | undefined {
  if (!body?.byteLength) return undefined;
  if (!contentType.includes('json')) return { bytes: body.byteLength };
  try {
    const data = JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
    if (Array.isArray(data)) return { items: data.length };
    const pick = ['path', 'title', 'name', 'status', 'from', 'to', 'code'].filter((k) => data[k] !== undefined);
    return pick.length ? Object.fromEntries(pick.map((k) => [k, data[k]])) : { bytes: body.byteLength };
  } catch {
    return { bytes: body.byteLength };
  }
}

/**
 * REST API админки для данных сервисов: /api/v1/<сервис>/<путь> →
 * <сервис>/admin/v1/<путь>. Проверяет вход и права на раздел, подписывает
 * запрос служебным токеном, изменения пишет в журнал действий.
 * Описание всех методов (OpenAPI) — /api/v1/openapi.
 */
async function proxy(req: Request, user: SessionUser, ctx: Ctx): Promise<Response> {
  const { service, path } = await ctx.params;
  if (!(SERVICES as readonly string[]).includes(service)) return jsonError(404, 'unknown_service');
  if (!can(user, service as Service)) return jsonError(403, 'forbidden');

  const search = new URL(req.url).search;
  const target = `${path.map(encodeURIComponent).join('/')}${search}`;
  const mutating = !['GET', 'HEAD'].includes(req.method);
  const body = mutating ? await req.arrayBuffer() : undefined;
  const contentType = req.headers.get('content-type') ?? 'application/json';
  const res = await serviceFetch(service as Service, target, {
    method: req.method,
    body: body?.byteLength ? body : undefined,
    headers: body?.byteLength ? { 'content-type': contentType } : {},
    user,
  });
  // проверки без изменений (предпросмотр письма, проверка файла с адресами) — не в журнал
  const probe = /\/render$/.test(target.split('?')[0]!) || new URLSearchParams(search).has('dry');
  if (mutating && res.ok && !probe) {
    await audit(user, `${service}.${req.method.toLowerCase()}`, `/${path.join('/')}`, summarize(contentType, body));
  }
  const headers = new Headers({ 'content-type': res.headers.get('content-type') ?? 'application/json' });
  // выгрузки (CSV и т. п.) скачиваются под именем, которое дал сервис
  const disposition = res.headers.get('content-disposition');
  if (disposition) headers.set('content-disposition', disposition);
  return new Response(res.body, { status: res.status, headers });
}

export const GET = route<Ctx>(null, proxy);
export const POST = route<Ctx>(null, proxy);
export const PUT = route<Ctx>(null, proxy);
export const DELETE = route<Ctx>(null, proxy);
