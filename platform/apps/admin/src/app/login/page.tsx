import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { withBase } from '@/lib/base-path';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Вход' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/');
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6">
          <img src={withBase('/brand/logo.png')} alt="УралИндуктор · ООО МТПК" width={240} height={63} className="h-auto w-60" />
          <div className="mt-3 text-sm text-slate-500">Управление сайтом</div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
