import { pino, type Logger } from 'pino';

export type { Logger };

/** JSON-логгер сервиса: одна строка на событие, удобно для docker logs и сборщиков. */
export function createLogger(name: string, level: string = process.env.LOG_LEVEL ?? 'info'): Logger {
  return pino({
    name,
    level,
    base: { svc: name },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      // Персональные данные заявок не должны утекать в логи запросов целиком.
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-admin-token"]'],
      remove: true,
    },
  });
}
