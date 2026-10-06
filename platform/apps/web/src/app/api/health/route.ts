export const dynamic = 'force-dynamic';

/** Проверка живости для Docker healthcheck и шлюза. */
export function GET() {
  return Response.json({ ok: true, service: 'web' });
}
