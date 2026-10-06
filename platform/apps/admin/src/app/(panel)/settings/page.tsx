import type { Metadata } from 'next';
import type { JsonSchema } from '@/components/schema-form';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { serviceJson } from '@/lib/services';
import { SettingsEditor } from './SettingsEditor';

export const metadata: Metadata = { title: 'Шапка, меню, контакты' };

export default async function SettingsPage() {
  const user = await requireUser('content');
  const [settings, schemas] = await Promise.all([
    serviceJson<Record<string, unknown>>('content', 'settings', { user }),
    serviceJson<{ settings: JsonSchema }>('content', 'block-schemas', { user }),
  ]);
  return (
    <>
      <PageHeader
        title="Шапка, меню, контакты"
        description="Телефоны, почта и мессенджеры, главное меню с мегаменю, мобильное меню и подвал — одинаковы на всех страницах. После сохранения сайт обновится целиком в течение минуты."
      />
      <SettingsEditor initial={settings} schema={schemas.settings} />
    </>
  );
}
