import { pgSchema, bigserial, text, integer, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';

/** Схема сервиса заявок. Заменяет leads.log старого send.php: каждая заявка — строка. */
export const leadsSchema = pgSchema('leads');

export const leads = leadsSchema.table(
  'leads',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /** request_id формы (forms.js) — повторная отправка той же заявки не создаёт дубль. */
    requestId: text('request_id').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** data-form + путь: «Подбор и расчёт · /products/…» */
    source: text('source'),
    /** Полный URL страницы (из Referer, нормализован на боевой домен) */
    pageUrl: text('page_url'),
    phone: text('phone').notNull(),
    name: text('name'),
    email: text('email'),
    task: text('task'),
    /** Дополнительные поля форм запчастей и прочих: message, part, model, quantity… */
    fields: jsonb('fields').$type<Record<string, string>>().notNull().default({}),
    /** utm_*, yclid, gclid, fbclid, referrer, landing_url */
    utm: jsonb('utm').$type<Record<string, string>>().notNull().default({}),
    consent: text('consent'),
    b24Trace: text('b24_trace'),
    b24TraceValid: boolean('b24_trace_valid').notNull().default(false),
    ymUid: text('ym_uid'),
    roistatVisit: text('roistat_visit'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    /** Вложение «Прикрепить КП»: ключ в приватном бакете (удаляется после отправки письма). */
    attachmentKey: text('attachment_key'),
    attachmentName: text('attachment_name'),
    attachmentNote: text('attachment_note'),
    /** received → delivered | partial | failed */
    status: text('status').notNull().default('received'),
    mailStatus: text('mail_status').notNull().default('pending'),
    mailError: text('mail_error'),
    mailSentAt: timestamp('mail_sent_at', { withTimezone: true }),
    b24Status: text('b24_status').notNull().default('pending'),
    b24LeadId: integer('b24_lead_id'),
    b24Http: integer('b24_http'),
    b24TraceStatus: text('b24_trace_status'),
    b24TraceId: integer('b24_trace_id'),
    b24Error: text('b24_error'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('leads_created_idx').on(t.createdAt), index('leads_status_idx').on(t.status)],
);

/** Отброшенные попытки (honeypot, слишком быстрое заполнение) — как log_reject в send.php. */
export const leadRejects = leadsSchema.table('lead_rejects', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  reason: text('reason').notNull(),
  phone: text('phone'),
  name: text('name'),
  source: text('source'),
  ip: text('ip'),
  userAgent: text('user_agent'),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
