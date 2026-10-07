import type { Metadata } from 'next';
import { withBase } from '@/lib/base-path';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Админка · УралИндуктор', template: '%s · Админка УралИндуктор' },
  robots: { index: false, follow: false },
  icons: { icon: withBase('/favicon.svg') },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
