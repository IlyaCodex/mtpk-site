import { z } from 'zod';
import { envParts, readEnv } from '@mtpk/shared';

export const env = readEnv(
  z.object({
    ...envParts.base,
    ...envParts.db,
    ...envParts.admin,
    MAILING_PORT: z.coerce.number().default(4105),
    /** smtp — письма уходят; log — тестовый режим: письма собираются, но не отправляются */
    MAILING_TRANSPORT: z.enum(['smtp', 'log']).default('log'),
    MAILING_SMTP_HOST: z.string().default(''),
    MAILING_SMTP_PORT: z.coerce.number().optional(),
    MAILING_SMTP_SECURE: z.enum(['ssl', 'tls']).default('ssl'),
    MAILING_SMTP_USER: z.string().default(''),
    MAILING_SMTP_PASS: z.string().default(''),
    /** адрес отправителя рассылок (имя отправителя — в каждой рассылке) */
    MAILING_FROM: z.string().default('news@uralinduktor.ru'),
    /** куда отвечать на письмо рассылки; пусто — на адрес отправителя */
    MAILING_REPLY_TO: z.string().default(''),
    /** писем в секунду: лимит почтового сервиса */
    MAILING_RATE: z.coerce.number().min(0.1).max(100).default(5),
    /** адрес сайта в письмах (ссылки отслеживания, отписка, картинки); пусто — SITE_URL, при разработке — WEB_URL */
    MAILING_PUBLIC_URL: z.string().default(''),
    WEB_URL: z.string().default(''),
    /** свои сайты: к ссылкам на них добавляются UTM-метки */
    MAILING_OWN_HOSTS: z.string().default('uralinduktor.ru,new.uralinduktor.ru'),
    /** вебхук Битрикс24 (как у сервиса заявок): импорт адресов из CRM */
    B24_WEBHOOK: z.string().default(''),
  }),
);

/** Адрес сайта, на который ведут ссылки из писем. */
export const PUBLIC_URL = (env.MAILING_PUBLIC_URL || (env.NODE_ENV === 'development' && env.WEB_URL) || env.SITE_URL).replace(/\/$/, '');

/** Свои домены: к ссылкам на них добавляются UTM-метки. */
export const OWN_HOSTS = [...new Set([...env.MAILING_OWN_HOSTS.split(','), new URL(PUBLIC_URL).host].map((h) => h.trim().toLowerCase()).filter(Boolean))];

/** Письма действительно уходят (SMTP настроен), иначе — тестовый режим. */
export const SENDS_FOR_REAL = env.MAILING_TRANSPORT === 'smtp' && Boolean(env.MAILING_SMTP_HOST && env.MAILING_SMTP_USER && env.MAILING_SMTP_PASS);
