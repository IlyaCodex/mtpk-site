import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Queue } from 'bullmq';
import { isAuthorized, type ZodTypeProvider } from '@mtpk/shared';
import type { Db, Prisma } from '@mtpk/db';
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
    const contains = q.search ? { contains: q.search, mode: 'insensitive' as const } : null;
    const where: Prisma.LeadWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gt: q.from } : {}), ...(q.to ? { lt: q.to } : {}) } } : {}),
      ...(contains
        ? { OR: [{ phone: contains }, { name: contains }, { email: contains }, { source: contains }, { task: contains }] }
        : {}),
    };
    const [total, rows] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          source: true,
          pageUrl: true,
          phone: true,
          name: true,
          email: true,
          status: true,
          mailStatus: true,
          b24Status: true,
          b24LeadId: true,
          attachmentName: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: q.offset,
        take: q.limit,
      }),
    ]);
    return { total, items: rows.map(({ attachmentName, ...r }) => ({ ...r, hasAttachment: attachmentName !== null })) };
  });

  app.get('/admin/v1/leads/stats', { schema: { tags: TAGS, summary: 'Сводка: по статусам и по дням (14 дней)', security: ADMIN } }, async () => {
    const byStatus = await db.lead.groupBy({ by: ['status'], _count: { _all: true } });
    const byDay = await db.$queryRaw<{ day: string; count: number }[]>`
      select to_char(date_trunc('day', created_at at time zone 'Asia/Yekaterinburg'), 'YYYY-MM-DD') as day, count(*)::int as count
      from leads.leads
      where created_at > now() - interval '14 days'
      group by 1 order by 1`;
    const rejects = await db.leadReject.count({ where: { createdAt: { gt: new Date(Date.now() - 14 * 24 * 3600 * 1000) } } });
    return {
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      byDay,
      rejects14d: rejects,
    };
  });

  app.get('/admin/v1/leads/:id', { schema: { tags: TAGS, summary: 'Заявка целиком', params: idParam, security: ADMIN } }, async (req, reply) => {
    const row = await db.lead.findUnique({ where: { id: req.params.id } });
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
      const row = await db.lead.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!row) return reply.code(404).send({ error: 'not_found' });
      await db.lead.update({ where: { id: row.id }, data: { status: 'received' } });
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
      const [total, items] = await Promise.all([
        db.leadReject.count(),
        db.leadReject.findMany({ orderBy: { createdAt: 'desc' }, skip: req.query.offset, take: req.query.limit }),
      ]);
      return { total, items };
    },
  );
}
