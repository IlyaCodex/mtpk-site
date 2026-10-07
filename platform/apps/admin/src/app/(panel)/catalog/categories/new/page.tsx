import type { Metadata } from 'next';
import { CategoryForm } from '@/components/catalog-forms';
import { CatalogFormHeader } from '@/components/catalog-trail';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Новая категория' };

export default async function NewCategoryPage() {
  await requireUser('content');
  return (
    <>
      <CatalogFormHeader
        trail={[{ href: '/catalog', label: 'Каталог' }]}
        title="Новая категория"
        description="Категория — карточка в сетке «Оборудование» на главной и своя страница с подкатегориями. Укажите название и обложку — адрес подставится сам."
      />
      <CategoryForm childCount={0} products={0} />
    </>
  );
}
