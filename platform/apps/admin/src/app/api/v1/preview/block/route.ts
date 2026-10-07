import { z } from 'zod';
import { route } from '@/lib/api';
import { serviceJson } from '@/lib/services';

const input = z.object({ path: z.string().default('/'), block: z.record(z.string(), z.unknown()) });

/**
 * HTML одного блока с отступами — вкладка «HTML-код» у блоков с полями и
 * общих секций: та же разметка, что на сайте (рендер контент-сервиса).
 */
export const POST = route('content', async (req, user) => {
  const { path, block } = input.parse(await req.json());
  const { html } = await serviceJson<{ html: string }>('content', 'render', { method: 'POST', json: { path, blocks: [block], pretty: true }, user });
  return Response.json({ html }, { headers: { 'cache-control': 'no-store' } });
});
