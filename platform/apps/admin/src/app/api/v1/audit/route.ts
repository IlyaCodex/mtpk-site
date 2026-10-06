import { auditLog, count, desc, ilike, or } from '@mtpk/db';
import { route } from '@/lib/api';
import { db } from '@/lib/db';

/** Журнал действий: ?search=…&offset=…&limit=… (только администратор). */
export const GET = route('audit', async (req) => {
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50));
  const where = search
    ? or(ilike(auditLog.action, `%${search}%`), ilike(auditLog.target, `%${search}%`), ilike(auditLog.userEmail, `%${search}%`))
    : undefined;
  const [{ total }] = await db().select({ total: count() }).from(auditLog).where(where);
  const items = await db().select().from(auditLog).where(where).orderBy(desc(auditLog.at)).offset(offset).limit(limit);
  return Response.json({ total, items });
});
