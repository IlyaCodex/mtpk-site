import { bigserial, boolean, index, integer, jsonb, pgSchema, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Схема админки: пользователи и журнал действий. Сессии — в Redis
 * (живут неделю, отзываются удалением ключа).
 */
export const adminSchema = pgSchema('admin');

/**
 * Пользователь админки. Роли:
 *   admin   — всё, включая пользователей;
 *   editor  — контент: страницы, медиа, редиректы, наличие, настройки;
 *   manager — заявки (просмотр и повторная отправка в CRM).
 */
export const users = adminSchema.table('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** scrypt: 'scrypt$N$r$p$соль$хеш' (base64url) */
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('editor'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Журнал действий в админке: кто, когда и что изменил. */
export const auditLog = adminSchema.table(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    userId: integer('user_id'),
    userEmail: text('user_email'),
    /** page.update, page.create, settings.update, redirect.delete, lead.resend, login… */
    action: text('action').notNull(),
    /** адрес страницы, id записи, ключ файла */
    target: text('target'),
    details: jsonb('details').$type<Record<string, unknown>>(),
    ip: text('ip'),
  },
  (t) => [index('audit_at_idx').on(t.at), index('audit_target_idx').on(t.target)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditEntry = typeof auditLog.$inferSelect;
