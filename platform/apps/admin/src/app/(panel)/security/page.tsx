import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { twoFactorOn } from '@/lib/two-factor';
import { TwoFactorSettings } from './TwoFactorSettings';

export const metadata: Metadata = { title: 'Настройки входа' };

/** Свои настройки входа — для любой роли: двухфакторная защита. */
export default async function SecurityPage() {
  const user = await requireUser();
  const row = await db().user.findUniqueOrThrow({ where: { id: user.id }, select: { totpSecret: true, totpEnabledAt: true, recoveryCodes: true } });
  return (
    <>
      <PageHeader title="Настройки входа" description={`${user.name} · ${user.email}`} />
      <TwoFactorSettings
        email={user.email}
        initial={{ enabled: twoFactorOn(row), enabledAt: row.totpEnabledAt?.toISOString() ?? null, recoveryLeft: row.recoveryCodes.length }}
      />
    </>
  );
}
