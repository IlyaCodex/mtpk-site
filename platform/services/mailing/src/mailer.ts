/**
 * Почтовый транспорт рассылок. SMTP настроен (MAILING_TRANSPORT=smtp и
 * доступ) — письма уходят; иначе тестовый режим: письмо собирается целиком,
 * но не отправляется (локальная разработка — только он).
 * Заголовки массовой рассылки: отписка в один клик (RFC 8058) — без неё
 * Gmail и Яндекс чаще уводят письма в спам.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { env, SENDS_FOR_REAL } from './env.ts';

export function createTransport(): Transporter {
  if (!SENDS_FOR_REAL) return nodemailer.createTransport({ jsonTransport: true });
  return nodemailer.createTransport({
    pool: true,
    maxConnections: 2,
    host: env.MAILING_SMTP_HOST,
    port: env.MAILING_SMTP_PORT ?? (env.MAILING_SMTP_SECURE === 'tls' ? 587 : 465),
    secure: env.MAILING_SMTP_SECURE === 'ssl',
    requireTLS: env.MAILING_SMTP_SECURE === 'tls',
    auth: { user: env.MAILING_SMTP_USER, pass: env.MAILING_SMTP_PASS },
    // у почтового сервера несколько адресов: недоступный — к следующему через 10 с, а не через 2 мин
    connectionTimeout: 10_000,
    greetingTimeout: 15_000,
  });
}

export interface Outgoing {
  to: string;
  toName?: string | null;
  fromName: string;
  subject: string;
  html: string;
  text: string;
  /** ссылка отписки получателя (нет — тестовое письмо) */
  unsubscribeUrl?: string;
  campaignId?: number;
}

export async function send(transport: Transporter, m: Outgoing): Promise<void> {
  await transport.sendMail({
    from: { name: m.fromName, address: env.MAILING_FROM },
    to: m.toName ? { name: m.toName, address: m.to } : m.to,
    replyTo: env.MAILING_REPLY_TO || undefined,
    subject: m.subject,
    html: m.html,
    text: m.text,
    headers: {
      ...(m.unsubscribeUrl
        ? {
            'List-Unsubscribe': `<${m.unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : {}),
      Precedence: 'bulk',
      ...(m.campaignId ? { 'X-Campaign-Id': String(m.campaignId), 'Feedback-ID': `${m.campaignId}:mailing:uralinduktor` } : {}),
    },
  });
}

/** Ошибка SMTP временная (4xx, сеть) — письмо стоит отправить ещё раз. */
export function isTemporary(err: unknown): boolean {
  const e = err as { responseCode?: number; code?: string };
  if (typeof e.responseCode === 'number') return e.responseCode >= 400 && e.responseCode < 500;
  return ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ESOCKET', 'ECONNECTION', 'EDNS'].includes(String(e.code));
}

/** Адрес не существует (5.1.1 и т. п.) — контакт помечается недоставляемым. */
export function isBadAddress(err: unknown): boolean {
  const e = err as { responseCode?: number; response?: string };
  return e.responseCode === 550 || e.responseCode === 553 || /5\.1\.[0-9]|user unknown|no such user|does not exist|mailbox unavailable/i.test(e.response ?? '');
}
