/** Проверка живости контейнера админки (без входа, без обращения к БД). */
export function GET() {
  return Response.json({ ok: true, service: 'admin' });
}
