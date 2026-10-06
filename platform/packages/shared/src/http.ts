import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import swagger from '@fastify/swagger';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Logger } from './logger.ts';

export type { ZodTypeProvider };

export interface ServiceOptions {
  name: string;
  /** Описание сервиса — в OpenAPI (/openapi.json). */
  description?: string;
  port: number;
  host?: string;
  logger: Logger;
  /** Доверять X-Forwarded-For/X-Real-IP (только за своим шлюзом). */
  trustProxy?: boolean;
  bodyLimit?: number;
  setup: (app: FastifyInstance) => Promise<void> | void;
  /** Дополнительные проверки готовности (БД, Redis): бросают при проблеме. */
  readiness?: () => Promise<void>;
  onClose?: () => Promise<void> | void;
  fastify?: Partial<FastifyServerOptions>;
}

/**
 * Единый каркас HTTP-сервиса: логгер, /health (жив ли процесс),
 * /ready (доступны ли зависимости), OpenAPI-описание /openapi.json
 * (из zod-схем маршрутов), корректная остановка по SIGTERM —
 * Docker даёт контейнеру время закрыть соединения.
 */
export async function startService(opts: ServiceOptions): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: opts.logger,
    trustProxy: opts.trustProxy ?? false,
    bodyLimit: opts.bodyLimit ?? 1024 * 1024,
    ...opts.fastify,
  });

  // Схемы маршрутов — zod: проверка входа и описание API из одного источника.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(swagger, {
    openapi: {
      info: { title: `МТПК · ${opts.name}`, version: '1.0.0', description: opts.description },
      components: {
        securitySchemes: { adminToken: { type: 'apiKey', in: 'header', name: 'x-admin-token' } },
      },
    },
    transform: jsonSchemaTransform,
  });

  // Ошибки валидации входа — 400 с перечнем полей, а не 500.
  app.setErrorHandler((err: Error & { statusCode?: number; issues?: unknown }, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      reply.code(400).send({ error: 'bad_request', issues: err.validation });
      return;
    }
    if (err.name === 'ZodError') {
      reply.code(400).send({ error: 'bad_request', issues: err.issues });
      return;
    }
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, 'ошибка обработки запроса');
    reply.code(status).send({ error: status >= 500 ? 'internal_error' : err.message });
  });

  const hidden = { schema: { hide: true } };
  app.get('/health', hidden, async () => ({ ok: true, service: opts.name }));
  app.get('/ready', hidden, async (_req, reply) => {
    try {
      await opts.readiness?.();
      return { ok: true, service: opts.name };
    } catch (err) {
      reply.code(503);
      return { ok: false, service: opts.name, error: (err as Error).message };
    }
  });

  await opts.setup(app);
  app.get('/openapi.json', hidden, async () => app.swagger());

  // В разработке — только localhost (не светить сервисы в LAN/VPN), в контейнере — все интерфейсы.
  const host = opts.host ?? process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  await app.listen({ port: opts.port, host });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    opts.logger.info({ signal }, 'остановка сервиса');
    try {
      await app.close();
      await opts.onClose?.();
    } finally {
      process.exit(0);
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  return app;
}

/** Проверка служебного токена (заголовок X-Admin-Token или Bearer). */
export function isAuthorized(headers: Record<string, unknown>, token: string): boolean {
  const direct = headers['x-admin-token'];
  const auth = headers['authorization'];
  const bearer = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
  const given = typeof direct === 'string' ? direct : bearer;
  if (!given || given.length !== token.length) return false;
  // сравнение за постоянное время
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= given.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

