import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Вход' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/');
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold text-slate-900">УралИндуктор</div>
            <div className="text-sm text-slate-500">Управление сайтом</div>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
