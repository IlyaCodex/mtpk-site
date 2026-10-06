import type { Metadata } from 'next';
import { asc, users } from '@mtpk/db';
import { PageHeader } from '@/components/ui';
import { requireUser, ROLE_LABELS } from '@/lib/auth';
import { db } from '@/lib/db';
import { publicUser } from '@/lib/users';
import { UsersManager } from './UsersManager';

export const metadata: Metadata = { title: 'Пользователи' };

export default async function UsersPage() {
  const me = await requireUser('users');
  const list = await db().select(publicUser).from(users).orderBy(asc(users.email));
  return (
    <>
      <PageHeader
        title="Пользователи"
        description="Редактор — страницы, медиатека, меню, редиректы и наличие; менеджер заявок — только заявки; администратор — всё, включая пользователей и журнал."
      />
      <UsersManager
        meId={me.id}
        roles={ROLE_LABELS}
        initial={list.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString() }))}
      />
    </>
  );
}
