import type { Metadata } from 'next';
import { MediaBrowser } from '@/components/media';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Медиатека' };

export default async function MediaPage() {
  await requireUser('media');
  return (
    <>
      <PageHeader
        title="Медиатека"
        description="Картинки и файлы сайта в хранилище S3. Адрес файла (/img/…) вставляется в поля блоков; имена с кириллицей и пробелами при загрузке переводятся в латиницу."
      />
      <MediaBrowser mode="manage" />
    </>
  );
}
