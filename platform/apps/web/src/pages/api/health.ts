import type { NextApiRequest, NextApiResponse } from 'next';

/** Проверка живости для Docker healthcheck и шлюза. */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.json({ ok: true, service: 'web' });
}
