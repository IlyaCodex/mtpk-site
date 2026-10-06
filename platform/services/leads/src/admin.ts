import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Queue } from 'bullmq';
import { isAuthorized, type ZodTypeProvider } from '@mtpk/shared';
import { and, count, desc, eq, gt, leadRejects, leads, lt, or, sql, type Db } from '@mtpk/db';
import type { DeliveryJob, DeliveryResult } from './queue.ts';

interface Deps {
  db: Db;
  queue: Queue<DeliveryJob, DeliveryResult>;
  adminToken: string;
}

const ADMIN = [{ adminToken: [] }];
const TAGS = ['Админка: заявки'];

const listQuery = z.object({
  status: z.enum(['received', 'delivered', 'partial', 'failed']).optional().describe('Статус доставки'),
  search: z.string().max(200).optional().describe('Телефон, имя, e-mail, источник или текст задачи'),
  from: z.coerce.date().optional().describe('С даты (ISO)'),
  to: z.coerce.date().optional().describe('По дату (ISO)'),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
const idParam = z.object({ id: z.coerce.number().int().positive() });

/** Служебное API заявок для админки: список, карточка, повторная доставка, статистика. */
export async function adminRoutes(base: FastifyInstance, { db, queue, adminToken }: Deps) {
  const app = base.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', async (req, reply) => {
    if (!isAuthorized(req.headers as Record<string, unknown>, adminToken)) return reply.code(401).send({ error: 'unauthorized' });
  });

  app.get('/admin/v1/leads', { schema: { tags: TAGS, summary: 'Заявки (новые сверху)', querystring: listQuery, security: ADMIN } }, async (req) => {
    const q = req.query;
    const like = q.search ? `%${q.search}%` : null;
    const where = and(
      q.status ? eq(leads.status, q.status) : undefined,
      q.from ? gt(leads.createdAt, q.from) : undefined,
      q.to ? lt(leads.createdAt, q.to) : undefined,
      like
        ? or(
            sql`${leads.phone} ilike ${like}`,
            sql`${leads.name} ilike ${like}`,
            sql`${leads.email} ilike ${like}`,
            sql`${leads.source} ilike ${like}`,
            sql`${leads.task} ilike ${like}`,
          )
        : undefined,
    );
    const [{ total }] = await db.select({ total: count() }).from(leads).where(where);
    const items = await db
      .select({
        id: leads.id,
        createdAt: leads.createdAt,
        source: leads.source,
        pageUrl: leads.pageUrl,
        phone: leads.phone,
        name: leads.name,
        email: leads.email,
        status: leads.status,
        mailStatus: leads.mailStatus,
        b24Status: leads.b24Status,
        b24LeadId: leads.b24LeadId,
        hasAttachment: sql<boolean>`${leads.attachmentName} is not null`,
      })
      .from(leads)
      .where(where)
      .orderBy(desc(leads.createdAt))
      .offset(q.offset)
      .limit(q.limit);
    return { total, items };
  });

  app.get('/admin/v1/leads/stats', { schema: { tags: TAGS, summary: 'Сводка: по статусам и по дням (14 дней)', security: ADMIN } }, async () => {
    const byStatus = await db.select({ status: leads.status, count: count() }).from(leads).groupBy(leads.status);
    const byDay = await db.execute<{ day: string; count: number }>(sql`
      select to_char(date_trunc('day', created_at at time zone 'Asia/Yekaterinburg'), 'YYYY-MM-DD') as day, count(*)::int as count
      from leads.leads
      where created_at > now() - interval '14 days'
      group by 1 order by 1`);
    const [{ rejects }] = await db
      .select({ rejects: count() })
      .from(leadRejects)
      .where(gt(leadRejects.createdAt, sql`now() - interval '14 days'`));
    return {
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
      byDay: byDay.rows,
      rejects14d: rejects,
    };
  });

  app.get('/admin/v1/leads/:id', { schema: { tags: TAGS, summary: 'Заявка целиком', params: idParam, security: ADMIN } }, async (req, reply) => {
    const [row] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
    if (!row) return reply.code(404).send({ error: 'not_found' });
    const jobs = await Promise.all(
      (await queue.getJobs(['active', 'waiting', 'delayed', 'failed', 'completed'], 0, 200))
        .filter((j) => j?.data?.leadId === row.id)
        .map(async (j) => ({ id: j.id, state: await j.getState(), attempts: j.attemptsMade, failedReason: j.failedReason ?? null })),
    );
    return { ...row, jobs };
  });

  app.post(
    '/admin/v1/leads/:id/resend',
    { schema: { tags: TAGS, summary: 'Повторить доставку (только недоставленные каналы)', params: idParam, security: ADMIN } },
    async (req, reply) => {
      const [row] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, req.params.id)).limit(1);
      if (!row) return reply.code(404).send({ error: 'not_found' });
      await db.update(leads).set({ status: 'received', updatedAt: new Date() }).where(eq(leads.id, row.id));
      const job = await queue.add('deliver', { leadId: row.id }, { jobId: `lead-${row.id}-resend-${Date.now()}` });
      return { ok: true, jobId: job.id };
    },
  );

  app.get(
    '/admin/v1/rejects',
    {
      schema: {
        tags: TAGS,
        summary: 'Отброшенные антиспамом попытки',
        querystring: z.object({ offset: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(200).default(50) }),
        security: ADMIN,
      },
    },
    async (req) => {
      const [{ total }] = await db.select({ total: count() }).from(leadRejects);
      const items = await db.select().from(leadRejects).orderBy(desc(leadRejects.createdAt)).offset(req.query.offset).limit(req.query.limit);
      return { total, items };
    },
  );
}
