import { route } from '@/lib/api';
import { listAudit } from '@/lib/audit';

/** Журнал действий: ?search=…&offset=…&limit=… (только администратор). */
export const GET = route('audit', async (req) => {
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50));
  return Response.json(await listAudit(search, offset, limit));
});
