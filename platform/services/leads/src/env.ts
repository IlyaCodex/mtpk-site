import { z } from 'zod';
import { envParts, readEnv } from '@mtpk/shared';

export const env = readEnv(
  z.object({
    ...envParts.base,
    ...envParts.db,
    ...envParts.redis,
    ...envParts.s3,
    ...envParts.admin,
    LEADS_PORT: z.coerce.number().default(4102),
    /** Хосты, с которых принимаются формы (Origin/Referer) */
    LEADS_ALLOWED_HOSTS: z.string().default('uralinduktor.ru,new.uralinduktor.ru'),
    /** За своим шлюзом: брать IP клиента из X-Real-IP/X-Forwarded-For */
    LEADS_TRUST_PROXY: envParts.bool,
    /** Сколько ждать доставки в CRM/почту прежде чем ответить «принято в очередь», мс */
    LEADS_SYNC_WAIT_MS: z.coerce.number().default(8000),
    MAIL_TRANSPORT: z.enum(['smtp', 'log']).default('log'),
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z.enum(['ssl', 'tls']).default('ssl'),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    MAIL_TO: z.string().default(''),
    MAIL_FROM: z.string().default(''),
    B24_WEBHOOK: z.string().default(''),
    B24_YM_UID_FIELD: z.string().default('UF_CRM_YA_CID'),
  }),
);

export const ALLOWED_HOSTS = env.LEADS_ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean);
