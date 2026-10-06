import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { serviceJson } from '@/lib/services';
import { StockEditor, type StockRow } from './StockEditor';

export const metadata: Metadata = { title: 'Наличие на складе' };

export default async function StockPage() {
  const user = await requireUser('content');
  const items = await serviceJson<StockRow[]>('content', 'stock', { user });
  return (
    <>
      <PageHeader
        title="Наличие на складе"
        description="Позиции страницы /nalichie/. Товар из списка получает бейдж «В наличии» в каталоге и статус «отгрузка от 1 рабочего дня» на своей странице. Название, фото и характеристики подставляются со страницы товара, если не заданы здесь."
      />
      <StockEditor initial={items} />
    </>
  );
}
