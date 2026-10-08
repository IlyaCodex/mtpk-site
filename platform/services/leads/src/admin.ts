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

  app.get(
    '/admin/v1/leads/stats',
    {
      schema: {
        tags: TAGS,
        summary: 'Сводка для обзора: по дням за период, сравнение с прошлым периодом, формы, страницы, доставка, спам',
        querystring: z.object({ days: z.coerce.number().int().min(1).max(365).default(14).describe('Период, дней') }),
        security: ADMIN,
      },
    },
    async (req) => {
      const days = req.query.days;
      const since = new Date(Date.now() - days * 24 * 3600 * 1000);
      const prevSince = new Date(Date.now() - 2 * days * 24 * 3600 * 1000);
      const TZ = 'Asia/Yekaterinburg';
      const [byStatus, byDay, rejects14d, total, period, previous, today, bySource, byPage, mail, b24, rejects] = await Promise.all([
        db.lead.groupBy({ by: ['status'], _count: { _all: true } }),
        db.$queryRaw<{ day: string; count: number }[]>`
          select to_char(date_trunc('day', created_at at time zone ${TZ}), 'YYYY-MM-DD') as day, count(*)::int as count
          from leads.leads where created_at > ${since}
          group by 1 order by 1`,
        db.leadReject.count({ where: { createdAt: { gt: new Date(Date.now() - 14 * 24 * 3600 * 1000) } } }),
        db.lead.count(),
        db.lead.count({ where: { createdAt: { gt: since } } }),
        db.lead.count({ where: { createdAt: { gt: prevSince, lte: since } } }),
        db.$queryRaw<{ count: number }[]>`
          select count(*)::int as count from leads.leads
          where created_at >= (date_trunc('day', now() at time zone ${TZ}) at time zone ${TZ})`,
        // источник — «Название формы · /адрес/»: группируем по названию формы
        db.$queryRaw<{ name: string; count: number }[]>`
          select coalesce(nullif(split_part(source, ' · ', 1), ''), 'Без названия') as name, count(*)::int as count
          from leads.leads where created_at > ${since}
          group by 1 order by 2 desc limit 8`,
        db.$queryRaw<{ page: string; count: number }[]>`
          select coalesce(nullif(regexp_replace(page_url, '^https?://[^/]+', ''), ''), '—') as page, count(*)::int as count
          from leads.leads where created_at > ${since}
          group by 1 order by 2 desc limit 8`,
        db.lead.groupBy({ by: ['mailStatus'], where: { createdAt: { gt: since } }, _count: { _all: true } }),
        db.lead.groupBy({ by: ['b24Status'], where: { createdAt: { gt: since } }, _count: { _all: true } }),
        db.$queryRaw<{ reason: string; count: number }[]>`
          select split_part(reason, ':', 1) as reason, count(*)::int as count
          from leads.lead_rejects where created_at > ${since}
          group by 1 order by 2 desc`,
      ]);
      return {
        days,
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
        byDay,
        /** прежнее поле (14 дней) — для совместимости */
        rejects14d,
        total,
        period,
        previous,
        today: today[0]?.count ?? 0,
        bySource,
        byPage,
        mail: Object.fromEntries(mail.map((r) => [r.mailStatus, r._count._all])),
        b24: Object.fromEntries(b24.map((r) => [r.b24Status, r._count._all])),
        rejects,
      };
    },
  );

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
