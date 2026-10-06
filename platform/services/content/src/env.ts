import { z } from 'zod';
import { envParts, readEnv } from '@mtpk/shared';

export const env = readEnv(
  z.object({
    ...envParts.base,
    ...envParts.db,
    ...envParts.redis,
    ...envParts.admin,
    CONTENT_PORT: z.coerce.number().default(4101),
    /** Куда слать сигнал «страницы изменились» (Next.js /api/revalidate). Пусто — не слать. */
    WEB_URL: z.string().default(''),
    REVALIDATE_SECRET: z.string().default(''),
    /** TTL кеша страниц в Redis, сек. Инвалидация — по событиям, TTL — страховка. */
    CONTENT_CACHE_TTL: z.coerce.number().default(3600),
  }),
);
