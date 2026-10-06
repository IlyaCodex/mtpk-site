'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui';
import { api } from '@/lib/client-api';

/** Повторная доставка: отправляются только каналы, куда заявка ещё не дошла. */
export function ResendButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await api(`leads/leads/${id}/resend`, { method: 'POST' });
          toast.ok('Доставка поставлена в очередь');
          setTimeout(() => router.refresh(), 3000);
        } catch (err) {
          toast.error(err);
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Отправляем…' : 'Отправить повторно'}
    </Button>
  );
}
