/**
 * Служебное API рассылок для админки (/admin/v1, заголовок X-Admin-Token):
 * базы и их пополнение (файл, текст, заявки сайта, CRM), контакты и отписки,
 * рассылки (черновик, предпросмотр, тестовое письмо, запуск, пауза, отмена),
 * статистика переходов и сводка для дашборда.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAuthorized, ServiceRefusal, type ZodTypeProvider } from '@mtpk/shared';
import { Prisma, type Db } from '@mtpk/db';
import { campaignUtm, compileCampaign, personalize, textVersion } from './compile.ts';
import { EMPTY_STATS, renderPreview, statsFor } from './campaigns.ts';
import { addContacts, contactsFromLeads } from './contacts.ts';
import { importFromCrm, type CrmEntity } from './crm.ts';
import { env, OWN_HOSTS, PUBLIC_URL, SENDS_FOR_REAL } from './env.ts';
import { createTransport, send } from './mailer.ts';
import { contactsFromText, normalizeEmail, parseContactsFile } from './parse.ts';
import { DEFAULT_TEMPLATE, SAMPLE } from './template.ts';

const ADMIN = [{ adminToken: [] }];
const LISTS = ['Рассылки: базы'];
const CAMPAIGNS = ['Рассылки: письма'];
const idParam = z.object({ id: z.coerce.number().int().positive() });
const page = { offset: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(500).default(50) };
const FILE_MAX = 25 * 1024 * 1024;

/** Рассылку можно править только черновиком. */
const EDITABLE = ['draft'];

export async function adminRoutes(base: FastifyInstance, { db, adminToken }: { db: Db; adminToken: string }) {
  const app = base.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', async (req, reply) => {
    if (!isAuthorized(req.headers as Record<string, unknown>, adminToken)) return reply.code(401).send({ error: 'unauthorized' });
  });
  const transport = createTransport();
  const who = (h: unknown) => (typeof h === 'string' ? h : null);
  const listOr404 = async (id: number) => {
    const list = await db.mailList.findUnique({ where: { id } });
    if (!list) throw new ServiceRefusal(404, 'not_found', 'База не найдена.');
    return list;
  };

  // ── Сводка для дашборда ────────────────────────────────────────────────
  app.get('/admin/v1/summary', { schema: { tags: CAMPAIGNS, summary: 'Сводка: контакты, последние рассылки, переходы за 30 дней', security: ADMIN } }, async () => {
    const [contacts, lists, campaigns, byDay, month] = await Promise.all([
      db.mailContact.groupBy({ by: ['status'], _count: { _all: true } }),
      db.mailList.count(),
      db.mailCampaign.findMany({ where: { status: { not: 'draft' } }, orderBy: [{ startedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }], take: 5, select: { id: true, name: true, status: true, transport: true, startedAt: true, finishedAt: true, total: true } }),
      db.$queryRaw`
        SELECT to_char(date_trunc('day', at AT TIME ZONE 'Asia/Yekaterinburg'), 'YYYY-MM-DD') AS day, count(*)::int AS clicks
        FROM mailing.clicks WHERE at > now() - interval '30 days' GROUP BY 1 ORDER BY 1` as Promise<{ day: string; clicks: number }[]>,
      db.$queryRaw`
        SELECT count(*) FILTER (WHERE sent_at > now() - interval '30 days')::int AS sent,
          count(*) FILTER (WHERE opened_at > now() - interval '30 days')::int AS opened,
          count(*) FILTER (WHERE clicked_at > now() - interval '30 days')::int AS clicked
        FROM mailing.recipients` as Promise<{ sent: number; opened: number; clicked: number }[]>,
    ]);
    const stats = await statsFor(db, campaigns.map((c) => c.id));
    const count = (s: string) => contacts.find((c) => c.status === s)?._count._all ?? 0;
    return {
      sendsForReal: SENDS_FOR_REAL,
      contacts: { active: count('active'), unsubscribed: count('unsubscribed'), bounced: count('bounced') },
      lists,
      last30: { ...month[0]!, clicks: byDay.reduce((n, d) => n + d.clicks, 0) },
      clicksByDay: byDay,
      campaigns: campaigns.map((c) => ({ ...c, stats: stats.get(c.id) ?? EMPTY_STATS })),
    };
  });

  // ── Базы ───────────────────────────────────────────────────────────────
  app.get('/admin/v1/lists', { schema: { tags: LISTS, summary: 'Базы рассылок с числом адресов', security: ADMIN } }, async () => {
    return db.$queryRaw`
      SELECT l.id, l.name, l.description, l.source, l.created_at AS "createdAt", l.updated_at AS "updatedAt",
        count(m.contact_id)::int AS members,
        count(m.contact_id) FILTER (WHERE c.status = 'active')::int AS active
      FROM mailing.lists l
      LEFT JOIN mailing.list_members m ON m.list_id = l.id
      LEFT JOIN mailing.contacts c ON c.id = m.contact_id
      GROUP BY l.id ORDER BY l.updated_at DESC`;
  });

  app.get('/admin/v1/lists/:id', { schema: { tags: LISTS, summary: 'База: счётчики по статусам, последние импорты, рассылки по ней', params: idParam, security: ADMIN } }, async (req) => {
    const list = await listOr404(req.params.id);
    const [byStatus, imports, campaigns] = await Promise.all([
      db.$queryRaw`
        SELECT c.status, count(*)::int AS n FROM mailing.list_members m JOIN mailing.contacts c ON c.id = m.contact_id
        WHERE m.list_id = ${list.id} GROUP BY c.status` as Promise<{ status: string; n: number }[]>,
      db.mailImport.findMany({ where: { listId: list.id }, orderBy: { id: 'desc' }, take: 5 }),
      db.mailCampaign.findMany({ where: { listId: list.id }, orderBy: { id: 'desc' }, take: 10, select: { id: true, name: true, status: true, startedAt: true } }),
    ]);
    const n = (s: string) => byStatus.find((r) => r.status === s)?.n ?? 0;
    return { ...list, counts: { active: n('active'), unsubscribed: n('unsubscribed'), bounced: n('bounced'), total: byStatus.reduce((a, r) => a + r.n, 0) }, imports, campaigns };
  });

  const listBody = z.object({ name: z.string().trim().min(1).max(200), description: z.string().max(1000).optional() });
  app.post('/admin/v1/lists', { schema: { tags: LISTS, summary: 'Новая база', body: listBody, security: ADMIN } }, async (req) =>
    db.mailList.create({ data: { name: req.body.name, description: req.body.description || null } }),
  );
  app.put('/admin/v1/lists/:id', { schema: { tags: LISTS, summary: 'Переименовать базу', params: idParam, body: listBody, security: ADMIN } }, async (req) =>
    db.mailList.update({ where: { id: req.params.id }, data: { name: req.body.name, description: req.body.description || null } }),
  );
  app.delete('/admin/v1/lists/:id', { schema: { tags: LISTS, summary: 'Удалить базу (контакты остаются в других базах)', params: idParam, security: ADMIN } }, async (req) => {
    const busy = await db.mailCampaign.count({ where: { listId: req.params.id, status: { in: ['scheduled', 'sending', 'paused'] } } });
    if (busy) throw new ServiceRefusal(409, 'list_busy', 'База используется в рассылке, которая идёт или запланирована.');
    await db.mailList.delete({ where: { id: req.params.id } });
    // контакты, которых больше нет ни в одной базе и которые не отписывались, — удаляем
    await db.$executeRaw`DELETE FROM mailing.contacts c WHERE c.status = 'active' AND NOT EXISTS (SELECT 1 FROM mailing.list_members m WHERE m.contact_id = c.id)`;
    return { ok: true };
  });

  const membersQuery = z.object({ search: z.string().max(200).optional(), status: z.enum(['active', 'unsubscribed', 'bounced']).optional(), ...page });
  app.get('/admin/v1/lists/:id/members', { schema: { tags: LISTS, summary: 'Адреса базы', params: idParam, querystring: membersQuery, security: ADMIN } }, async (req) => {
    const q = req.query;
    const contains = q.search ? { contains: q.search.trim(), mode: 'insensitive' as const } : undefined;
    const where: Prisma.MailListMemberWhereInput = {
      listId: req.params.id,
      contact: {
        ...(q.status ? { status: q.status } : {}),
        ...(contains ? { OR: [{ email: contains }, { name: contains }, { company: contains }] } : {}),
      },
    };
    const [total, rows] = await Promise.all([
      db.mailListMember.count({ where }),
      db.mailListMember.findMany({ where, include: { contact: true }, orderBy: { addedAt: 'desc' }, skip: q.offset, take: q.limit }),
    ]);
    return { total, items: rows.map((r) => ({ ...r.contact, addedAt: r.addedAt })) };
  });
  app.post(
    '/admin/v1/lists/:id/remove',
    { schema: { tags: LISTS, summary: 'Убрать адреса из базы', params: idParam, body: z.object({ ids: z.array(z.number().int()).max(5000) }), security: ADMIN } },
    async (req) => ({ removed: (await db.mailListMember.deleteMany({ where: { listId: req.params.id, contactId: { in: req.body.ids } } })).count }),
  );
  app.get('/admin/v1/lists/:id/export', { schema: { tags: LISTS, summary: 'Адреса базы файлом CSV (Excel)', params: idParam, security: ADMIN } }, async (req, reply) => {
    const list = await listOr404(req.params.id);
    const rows = await db.mailListMember.findMany({ where: { listId: list.id }, include: { contact: true }, orderBy: { addedAt: 'asc' } });
    const cell = (s: string | null | undefined) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const STATUS: Record<string, string> = { active: 'активен', unsubscribed: 'отписался', bounced: 'недоставляем' };
    const csv = ['E-mail;Имя;Компания;Телефон;Статус', ...rows.map((r) => [r.contact.email, r.contact.name, r.contact.company, r.contact.phone, STATUS[r.contact.status] ?? r.contact.status].map(cell).join(';'))].join('\r\n');
    const file = `${list.name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'base'}.csv`;
    // BOM — чтобы Excel открыл кириллицу правильно
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="base-${list.id}.csv"; filename*=UTF-8''${encodeURIComponent(file)}`)
      .send(`﻿${csv}`);
  });

  // ── Пополнение базы ────────────────────────────────────────────────────

  app.post(
    '/admin/v1/lists/:id/import-file',
    { schema: { tags: LISTS, summary: 'Адреса из файла: .xlsx, .xls, .csv, .txt (multipart, поле file); ?dry=1 — только проверить', params: idParam, querystring: z.object({ dry: z.string().optional() }), security: ADMIN } },
    async (req) => {
      await listOr404(req.params.id);
      const file = await req.file({ limits: { fileSize: FILE_MAX } });
      if (!file) throw new ServiceRefusal(400, 'no_file', 'Файл не получен.');
      const buf = new Uint8Array(await file.toBuffer());
      if (file.file.truncated) throw new ServiceRefusal(413, 'too_big', 'Файл больше 25 МБ.');
      const parsed = parseContactsFile(file.filename, buf);
      const sample = parsed.contacts.slice(0, 10);
      if (req.query.dry) return { ...parsed, contacts: undefined, found: parsed.contacts.length, sample };
      const added = parsed.contacts.length ? await addContacts(db, req.params.id, parsed.contacts, 'file') : null;
      return { ...parsed, contacts: undefined, found: parsed.contacts.length, sample, result: added };
    },
  );

  app.post(
    '/admin/v1/lists/:id/import-text',
    {
      schema: {
        tags: LISTS,
        summary: 'Адреса из вставленного текста; ?dry=1 — только проверить',
        params: idParam,
        querystring: z.object({ dry: z.string().optional() }),
        body: z.object({ text: z.string().max(5_000_000), dry: z.boolean().optional() }),
        security: ADMIN,
      },
    },
    async (req) => {
      await listOr404(req.params.id);
      const parsed = contactsFromText(req.body.text);
      const sample = parsed.contacts.slice(0, 10);
      if (req.query.dry || req.body.dry) return { ...parsed, contacts: undefined, found: parsed.contacts.length, sample };
      const added = parsed.contacts.length ? await addContacts(db, req.params.id, parsed.contacts, 'text') : null;
      return { ...parsed, contacts: undefined, found: parsed.contacts.length, sample, result: added };
    },
  );

  const period = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });
  app.get('/admin/v1/leads-emails', { schema: { tags: LISTS, summary: 'Сколько адресов в заявках сайта за период', querystring: period, security: ADMIN } }, async (req) => {
    const all = await contactsFromLeads(db, req.query.from, req.query.to);
    return { count: all.filter((c) => normalizeEmail(c.email)).length };
  });
  app.post(
    '/admin/v1/lists/:id/import-leads',
    { schema: { tags: LISTS, summary: 'Адреса из заявок сайта за период', params: idParam, body: period, security: ADMIN } },
    async (req) => {
      await listOr404(req.params.id);
      const contacts = (await contactsFromLeads(db, req.body.from, req.body.to)).flatMap((c) => {
        const email = normalizeEmail(c.email);
        return email ? [{ ...c, email }] : [];
      });
      const result = contacts.length ? await addContacts(db, req.params.id, contacts, 'leads') : null;
      await db.mailList.update({ where: { id: req.params.id }, data: { source: { kind: 'leads', from: req.body.from ?? null, to: req.body.to ?? null, at: new Date() } } });
      return { found: contacts.length, result };
    },
  );

  app.get('/admin/v1/crm', { schema: { tags: LISTS, summary: 'Подключена ли CRM (Битрикс24)', security: ADMIN } }, async () => ({ connected: Boolean(env.B24_WEBHOOK) }));
  app.post(
    '/admin/v1/lists/:id/import-crm',
    {
      schema: {
        tags: LISTS,
        summary: 'Адреса из CRM Битрикс24 (в фоне): контакты, компании, лиды',
        params: idParam,
        body: z.object({ kinds: z.array(z.enum(['contact', 'company', 'lead'])).min(1) }),
        security: ADMIN,
      },
    },
    async (req) => {
      await listOr404(req.params.id);
      if (!env.B24_WEBHOOK) throw new ServiceRefusal(409, 'crm_off', 'CRM не подключена: на сервере не задан вебхук Битрикс24 (B24_WEBHOOK).');
      const running = await db.mailImport.findFirst({ where: { listId: req.params.id, status: 'running' } });
      if (running) return { importId: running.id };
      const job = await db.mailImport.create({ data: { listId: req.params.id, kind: 'crm' } });
      void importFromCrm(db, env.B24_WEBHOOK, job.id, req.params.id, req.body.kinds as CrmEntity[]);
      return { importId: job.id };
    },
  );
  app.get('/admin/v1/imports/:id', { schema: { tags: LISTS, summary: 'Ход импорта', params: idParam, security: ADMIN } }, async (req, reply) => {
    const job = await db.mailImport.findUnique({ where: { id: req.params.id } });
    return job ?? reply.code(404).send({ error: 'not_found' });
  });

  // ── Контакты ───────────────────────────────────────────────────────────
  const contactsQuery = z.object({ search: z.string().max(200).optional(), status: z.enum(['active', 'unsubscribed', 'bounced']).optional(), ...page });
  app.get('/admin/v1/contacts', { schema: { tags: LISTS, summary: 'Все адреса (поиск, отписавшиеся)', querystring: contactsQuery, security: ADMIN } }, async (req) => {
    const q = req.query;
    const contains = q.search ? { contains: q.search.trim(), mode: 'insensitive' as const } : undefined;
    const where: Prisma.MailContactWhereInput = { ...(q.status ? { status: q.status } : {}), ...(contains ? { OR: [{ email: contains }, { name: contains }, { company: contains }] } : {}) };
    const [total, items] = await Promise.all([
      db.mailContact.count({ where }),
      db.mailContact.findMany({ where, orderBy: q.status === 'unsubscribed' ? { unsubscribedAt: 'desc' } : { id: 'desc' }, skip: q.offset, take: q.limit }),
    ]);
    return { total, items };
  });
  app.put(
    '/admin/v1/contacts/:id',
    { schema: { tags: LISTS, summary: 'Отписать или вернуть адрес', params: idParam, body: z.object({ status: z.enum(['active', 'unsubscribed']) }), security: ADMIN } },
    async (req) =>
      db.mailContact.update({ where: { id: req.params.id }, data: { status: req.body.status, unsubscribedAt: req.body.status === 'unsubscribed' ? new Date() : null } }),
  );

  // ── Рассылки ───────────────────────────────────────────────────────────
  app.get('/admin/v1/campaigns', { schema: { tags: CAMPAIGNS, summary: 'Рассылки (новые сверху) со счётчиками', security: ADMIN } }, async () => {
    const rows = await db.mailCampaign.findMany({
      orderBy: { id: 'desc' },
      select: { id: true, name: true, subject: true, status: true, transport: true, listId: true, total: true, scheduledAt: true, startedAt: true, finishedAt: true, createdAt: true, updatedAt: true, list: { select: { name: true } } },
    });
    const stats = await statsFor(db, rows.map((r) => r.id));
    return rows.map(({ list, ...r }) => ({ ...r, listName: list?.name ?? null, stats: stats.get(r.id) ?? EMPTY_STATS }));
  });

  app.get('/admin/v1/template', { schema: { tags: CAMPAIGNS, summary: 'Фирменный шаблон письма', security: ADMIN } }, async () => ({ html: DEFAULT_TEMPLATE }));

  app.post('/admin/v1/campaigns', { schema: { tags: CAMPAIGNS, summary: 'Новая рассылка — черновик с фирменным шаблоном', body: z.object({ name: z.string().trim().min(1).max(200) }), security: ADMIN } }, async (req) =>
    db.mailCampaign.create({
      data: { name: req.body.name, subject: req.body.name, html: DEFAULT_TEMPLATE, utmCampaign: campaignUtm(req.body.name), createdBy: who(req.headers['x-admin-user']) },
    }),
  );

  const campaignOr404 = async (id: number) => {
    const c = await db.mailCampaign.findUnique({ where: { id } });
    if (!c) throw new ServiceRefusal(404, 'not_found', 'Рассылка не найдена.');
    return c;
  };

  app.get('/admin/v1/campaigns/:id', { schema: { tags: CAMPAIGNS, summary: 'Рассылка', params: idParam, security: ADMIN } }, async (req) => {
    const c = await campaignOr404(req.params.id);
    const audience = c.listId ? await db.mailListMember.count({ where: { listId: c.listId, contact: { status: 'active' } } }) : 0;
    return { ...c, compiled: undefined, audience, sendsForReal: SENDS_FOR_REAL, publicUrl: PUBLIC_URL, fromEmail: env.MAILING_FROM, rate: env.MAILING_RATE };
  });

  const draftBody = z.object({
    name: z.string().trim().min(1).max(200),
    subject: z.string().max(300),
    preheader: z.string().max(300).default(''),
    fromName: z.string().trim().min(1).max(100),
    html: z.string().max(2_000_000),
    listId: z.number().int().nullable(),
    utmCampaign: z.string().max(100).regex(/^[a-z0-9._-]*$/i, 'Метка — латиница, цифры, точка, дефис, подчёркивание'),
  });
  app.put('/admin/v1/campaigns/:id', { schema: { tags: CAMPAIGNS, summary: 'Сохранить черновик', params: idParam, body: draftBody, security: ADMIN } }, async (req) => {
    const c = await campaignOr404(req.params.id);
    if (!EDITABLE.includes(c.status)) throw new ServiceRefusal(409, 'not_draft', 'Рассылка уже запущена — письмо не меняется. Сделайте копию.');
    return db.mailCampaign.update({ where: { id: c.id }, data: req.body });
  });

  app.post('/admin/v1/campaigns/:id/duplicate', { schema: { tags: CAMPAIGNS, summary: 'Копия рассылки (черновик)', params: idParam, security: ADMIN } }, async (req) => {
    const c = await campaignOr404(req.params.id);
    return db.mailCampaign.create({
      data: { name: `${c.name} (копия)`, subject: c.subject, preheader: c.preheader, fromName: c.fromName, html: c.html, listId: c.listId, utmCampaign: campaignUtm(c.name), createdBy: who(req.headers['x-admin-user']) },
    });
  });

  app.delete('/admin/v1/campaigns/:id', { schema: { tags: CAMPAIGNS, summary: 'Удалить черновик, отменённую или тестовую рассылку', params: idParam, security: ADMIN } }, async (req) => {
    const c = await campaignOr404(req.params.id);
    // с отправленными письмами — только тестовые (режим log): в настоящих статистика переходов
    const delivered = c.transport === 'smtp' ? await db.mailRecipient.count({ where: { campaignId: c.id, status: 'sent' } }) : 0;
    if (!(c.status === 'draft' || ((c.status === 'sent' || c.status === 'cancelled') && !delivered))) {
      throw new ServiceRefusal(409, 'keep_stats', 'Рассылку с отправленными письмами не удаляем — в ней статистика переходов.');
    }
    await db.mailCampaign.delete({ where: { id: c.id } });
    return { ok: true };
  });

  const previewBody = draftBody.pick({ subject: true, preheader: true, html: true, utmCampaign: true }).partial();
  app.post(
    '/admin/v1/campaigns/:id/render',
    { schema: { tags: CAMPAIGNS, summary: 'Предпросмотр: письмо для примера получателя, ссылки с UTM, замечания', params: idParam, body: previewBody, security: ADMIN } },
    async (req) => {
      const c = await campaignOr404(req.params.id);
      return renderPreview({ subject: req.body.subject ?? c.subject, preheader: req.body.preheader ?? c.preheader, html: req.body.html ?? c.html, utmCampaign: req.body.utmCampaign ?? c.utmCampaign });
    },
  );

  app.post(
    '/admin/v1/campaigns/:id/test',
    {
      schema: {
        tags: CAMPAIGNS,
        summary: 'Тестовое письмо на свои адреса (до 5)',
        params: idParam,
        body: previewBody.extend({ emails: z.array(z.string()).min(1).max(5), fromName: z.string().optional() }),
        security: ADMIN,
      },
    },
    async (req) => {
      const c = await campaignOr404(req.params.id);
      const emails = req.body.emails.map((e) => normalizeEmail(e)).filter((e): e is string => Boolean(e));
      if (!emails.length) throw new ServiceRefusal(400, 'bad_email', 'Укажите правильный адрес.');
      const subject = req.body.subject ?? c.subject;
      const compiled = compileCampaign(req.body.html ?? c.html, { utmCampaign: req.body.utmCampaign ?? c.utmCampaign, ownHosts: OWN_HOSTS, publicUrl: PUBLIC_URL, preheader: req.body.preheader ?? c.preheader });
      // ссылки тестового письма — сразу на адреса с метками (переходы не считаются)
      const direct = compiled.html.replace(/\{\{link:(\d+)\}\}/g, (_m, n: string) => compiled.links[Number(n) - 1]?.target.replace(/&/g, '&amp;') ?? '#');
      for (const to of emails) {
        const html = personalize(direct, { token: 'test', name: SAMPLE.name, email: to, linkIds: new Map(), publicUrl: PUBLIC_URL });
        await send(transport, { to, fromName: req.body.fromName ?? c.fromName, subject: `[Тест] ${subject}`, html, text: textVersion(html) });
      }
      return { sent: emails.length, forReal: SENDS_FOR_REAL };
    },
  );

  app.post(
    '/admin/v1/campaigns/:id/schedule',
    { schema: { tags: CAMPAIGNS, summary: 'Запустить сейчас или в указанное время', params: idParam, body: z.object({ at: z.coerce.date().optional() }), security: ADMIN } },
    async (req) => {
      const c = await campaignOr404(req.params.id);
      // остановленную не перезапускаем: часть писем уже ушла — повтор только копией
      if (c.status !== 'draft') throw new ServiceRefusal(409, 'not_draft', 'Рассылка уже запускалась — сделайте копию.');
      const preview = renderPreview(c);
      const blocking = preview.warnings.filter((w) => /^Нет темы|^Нет ссылки отписки/.test(w));
      if (blocking.length) throw new ServiceRefusal(422, 'not_ready', blocking.join(' '));
      if (!c.listId) throw new ServiceRefusal(422, 'no_list', 'Выберите базу получателей.');
      const audience = await db.mailListMember.count({ where: { listId: c.listId, contact: { status: 'active' } } });
      if (!audience) throw new ServiceRefusal(422, 'empty_list', 'В базе нет активных адресов.');
      const at = req.body.at && req.body.at.getTime() > Date.now() ? req.body.at : new Date();
      return db.mailCampaign.update({ where: { id: c.id }, data: { status: 'scheduled', scheduledAt: at, transport: SENDS_FOR_REAL ? 'smtp' : 'log' } });
    },
  );

  const move = (from: string[], to: string, error: string) => async (req: { params: { id: number } }) => {
    const c = await campaignOr404(req.params.id);
    if (!from.includes(c.status)) throw new ServiceRefusal(409, 'bad_state', error);
    const data: Prisma.MailCampaignUpdateInput = { status: to };
    if (to === 'draft') data.scheduledAt = null;
    if (to === 'cancelled') {
      data.finishedAt = new Date();
      await db.mailRecipient.updateMany({ where: { campaignId: c.id, status: 'queued' }, data: { status: 'skipped', error: 'рассылка отменена' } });
    }
    return db.mailCampaign.update({ where: { id: c.id }, data });
  };
  app.post('/admin/v1/campaigns/:id/unschedule', { schema: { tags: CAMPAIGNS, summary: 'Снять с расписания — снова черновик', params: idParam, security: ADMIN } }, move(['scheduled'], 'draft', 'Рассылка не запланирована.'));
  app.post('/admin/v1/campaigns/:id/pause', { schema: { tags: CAMPAIGNS, summary: 'Приостановить отправку', params: idParam, security: ADMIN } }, move(['sending'], 'paused', 'Рассылка не отправляется.'));
  app.post('/admin/v1/campaigns/:id/resume', { schema: { tags: CAMPAIGNS, summary: 'Продолжить отправку', params: idParam, security: ADMIN } }, move(['paused'], 'sending', 'Рассылка не на паузе.'));
  app.post('/admin/v1/campaigns/:id/cancel', { schema: { tags: CAMPAIGNS, summary: 'Остановить: неотправленные письма не уйдут', params: idParam, security: ADMIN } }, move(['scheduled', 'sending', 'paused'], 'cancelled', 'Рассылку уже не остановить.'));

  app.get('/admin/v1/campaigns/:id/stats', { schema: { tags: CAMPAIGNS, summary: 'Статистика: отправка, открытия, переходы по ссылкам', params: idParam, security: ADMIN } }, async (req) => {
    const c = await campaignOr404(req.params.id);
    const [stats, links, byHour, recent] = await Promise.all([
      statsFor(db, [c.id]),
      db.mailLink.findMany({ where: { campaignId: c.id }, orderBy: { position: 'asc' } }),
      db.$queryRaw`
        SELECT to_char(date_trunc('hour', k.at AT TIME ZONE 'Asia/Yekaterinburg'), 'YYYY-MM-DD"T"HH24') AS hour, count(*)::int AS clicks
        FROM mailing.clicks k JOIN mailing.links l ON l.id = k.link_id WHERE l.campaign_id = ${c.id} GROUP BY 1 ORDER BY 1` as Promise<{ hour: string; clicks: number }[]>,
      db.mailClick.findMany({
        where: { link: { campaignId: c.id } },
        orderBy: { at: 'desc' },
        take: 50,
        select: { at: true, link: { select: { label: true, utmContent: true } }, recipient: { select: { email: true, name: true } } },
      }),
    ]);
    return { status: c.status, transport: c.transport, total: c.total, stats: stats.get(c.id) ?? EMPTY_STATS, links, byHour, recent };
  });

  const recipientsQuery = z.object({ status: z.enum(['queued', 'sending', 'sent', 'failed', 'skipped', 'opened', 'clicked']).optional(), search: z.string().max(200).optional(), ...page });
  app.get('/admin/v1/campaigns/:id/recipients', { schema: { tags: CAMPAIGNS, summary: 'Получатели рассылки', params: idParam, querystring: recipientsQuery, security: ADMIN } }, async (req) => {
    const q = req.query;
    const where: Prisma.MailRecipientWhereInput = {
      campaignId: req.params.id,
      ...(q.status === 'opened' ? { openedAt: { not: null } } : q.status === 'clicked' ? { clickedAt: { not: null } } : q.status ? { status: q.status } : {}),
      ...(q.search ? { OR: [{ email: { contains: q.search.trim(), mode: 'insensitive' } }, { name: { contains: q.search.trim(), mode: 'insensitive' } }] } : {}),
    };
    const [total, items] = await Promise.all([
      db.mailRecipient.count({ where }),
      db.mailRecipient.findMany({ where, orderBy: { id: 'asc' }, skip: q.offset, take: q.limit, select: { id: true, email: true, name: true, status: true, error: true, sentAt: true, openedAt: true, clickedAt: true, clicks: true } }),
    ]);
    return { total, items };
  });

}
