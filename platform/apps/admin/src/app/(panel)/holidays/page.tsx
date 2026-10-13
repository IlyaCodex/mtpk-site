import type { Metadata } from 'next';
import type { HolidaySettings } from '@mtpk/content-model';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { serviceJson } from '@/lib/services';
import { HolidaysEditor } from './HolidaysEditor';

export const metadata: Metadata = { title: 'Праздники' };

export default async function HolidaysPage() {
  const user = await requireUser('content');
  const settings = await serviceJson<HolidaySettings>('content', 'holidays', { user });
  return (
    <>
      <PageHeader
        title="Праздники"
        description="В дни праздников шапка главной меняется сама: баннер праздника, поздравление и эффект. Показ задаётся относительно даты праздника и повторяется каждый год; время — екатеринбургское (как режим работы в шапке сайта). После сохранения главная обновится в течение минуты."
      />
      <HolidaysEditor initial={settings} />
    </>
  );
}
