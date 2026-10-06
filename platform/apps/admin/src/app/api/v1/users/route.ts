import { z } from 'zod';
import { asc, eq, users } from '@mtpk/db';
import { jsonError, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { ROLES } from '@/lib/auth';
import { db } from '@/lib/db';
import { hashPassword, passwordProblem } from '@/lib/password';
import { publicUser } from '@/lib/users';

/** Пользователи админки (только администратор). */
export const GET = route('users', async () => Response.json(await db().select(publicUser).from(users).orderBy(asc(users.email))));

const createInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(ROLES as [string, ...string[]]),
  password: z.string().max(200),
});

export const POST = route('users', async (req, user) => {
  const input = createInput.parse(await req.json());
  const problem = passwordProblem(input.password);
  if (problem) return jsonError(400, 'weak_password', { message: problem });
  const [dup] = await db().select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (dup) return jsonError(409, 'email_exists', { message: 'Пользователь с таким e-mail уже есть' });
  const [row] = await db()
    .insert(users)
    .values({ email: input.email, name: input.name, role: input.role, passwordHash: await hashPassword(input.password) })
    .returning(publicUser);
  await audit(user, 'user.create', input.email, { role: input.role });
  return Response.json(row, { status: 201 });
});
