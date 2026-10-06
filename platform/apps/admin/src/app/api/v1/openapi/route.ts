import { route } from '@/lib/api';
import { buildOpenApi } from '@/lib/openapi';

/** Описание REST API админки в формате OpenAPI 3 (для Postman, Swagger UI и т.п.). */
export const GET = route(null, async () => Response.json(await buildOpenApi()));
