import { z } from 'zod';
import type { Prisma } from '@mtpk/db';
import { jsonError, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { ROLES, revokeUserSessions } from '@/lib/auth';
import { db } from '@/lib/db';
import { hashPassword, passwordProblem } from '@/lib/password';
import { publicUser } from '@/lib/users';

type Ctx = { params: Promise<{ id: string }> };

const updateInput = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(ROLES as [string, ...string[]]).optional(),
  active: z.boolean().optional(),
  password: z.string().max(200).optional(),
});

/** Последнего активного администратора нельзя отключить или понизить — иначе в админку не войти. */
async function isLastAdmin(id: number): Promise<boolean> {
  const others = await db().user.count({ where: { role: 'admin', active: true, id: { not: id } } });
  return others === 0;
}

export const PUT = route<Ctx>('users', async (req, user, ctx) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return jsonError(404, 'not_found');
  const input = updateInput.parse(await req.json());
  const target = await db().user.findUnique({ where: { id } });
  if (!target) return jsonError(404, 'not_found');
  const demoting = target.role === 'admin' && ((input.role && input.role !== 'admin') || input.active === false);
  if (demoting && (await isLastAdmin(id))) return jsonError(409, 'last_admin', { message: 'Это последний администратор' });

  const patch: Prisma.UserUpdateInput = {};
  if (input.name) patch.name = input.name;
  if (input.role) patch.role = input.role;
  if (input.active !== undefined) patch.active = input.active;
  if (input.password) {
    const problem = passwordProblem(input.password);
    if (problem) return jsonError(400, 'weak_password', { message: problem });
    patch.passwordHash = await hashPassword(input.password);
  }
  const row = await db().user.update({ where: { id }, data: patch, select: publicUser });
  // смена пароля или отключение — выход со всех устройств
  if (input.password || input.active === false) await revokeUserSessions(id);
  await audit(user, 'user.update', target.email, { ...input, password: input.password ? '***' : undefined });
  return Response.json(row);
});

export const DELETE = route<Ctx>('users', async (_req, user, ctx) => {
  const id = Number((await ctx.params).id);
  if (id === user.id) return jsonError(409, 'self', { message: 'Нельзя удалить себя' });
  if (!Number.isInteger(id)) return jsonError(404, 'not_found');
  const target = await db().user.findUnique({ where: { id } });
  if (!target) return jsonError(404, 'not_found');
  if (target.role === 'admin' && (await isLastAdmin(id))) return jsonError(409, 'last_admin', { message: 'Это последний администратор' });
  await db().user.delete({ where: { id } });
  await revokeUserSessions(id);
  await audit(user, 'user.delete', target.email);
  return Response.json({ ok: true });
});
