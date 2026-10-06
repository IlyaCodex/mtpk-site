import { z } from 'zod';
import { and, count, eq, ne, users } from '@mtpk/db';
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
  const [{ others }] = await db()
    .select({ others: count() })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.active, true), ne(users.id, id)));
  return others === 0;
}

export const PUT = route<Ctx>('users', async (req, user, ctx) => {
  const id = Number((await ctx.params).id);
  const input = updateInput.parse(await req.json());
  const [target] = await db().select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return jsonError(404, 'not_found');
  const demoting = target.role === 'admin' && ((input.role && input.role !== 'admin') || input.active === false);
  if (demoting && (await isLastAdmin(id))) return jsonError(409, 'last_admin', { message: 'Это последний администратор' });

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (input.name) patch.name = input.name;
  if (input.role) patch.role = input.role;
  if (input.active !== undefined) patch.active = input.active;
  if (input.password) {
    const problem = passwordProblem(input.password);
    if (problem) return jsonError(400, 'weak_password', { message: problem });
    patch.passwordHash = await hashPassword(input.password);
  }
  const [row] = await db().update(users).set(patch).where(eq(users.id, id)).returning(publicUser);
  // смена пароля или отключение — выход со всех устройств
  if (input.password || input.active === false) await revokeUserSessions(id);
  await audit(user, 'user.update', target.email, { ...input, password: input.password ? '***' : undefined });
  return Response.json(row);
});

export const DELETE = route<Ctx>('users', async (_req, user, ctx) => {
  const id = Number((await ctx.params).id);
  if (id === user.id) return jsonError(409, 'self', { message: 'Нельзя удалить себя' });
  const [target] = await db().select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return jsonError(404, 'not_found');
  if (target.role === 'admin' && (await isLastAdmin(id))) return jsonError(409, 'last_admin', { message: 'Это последний администратор' });
  await db().delete(users).where(eq(users.id, id));
  await revokeUserSessions(id);
  await audit(user, 'user.delete', target.email);
  return Response.json({ ok: true });
});
