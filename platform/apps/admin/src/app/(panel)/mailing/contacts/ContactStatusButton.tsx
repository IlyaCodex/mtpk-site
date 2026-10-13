'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui';
import { api } from '@/lib/client-api';

/** Отписать адрес вручную (клиент попросил по телефону) или вернуть по его просьбе. */
export function ContactStatusButton({ id, email, status }: { id: number; email: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === 'active' ? 'unsubscribed' : 'active';
  const question =
    next === 'unsubscribed'
      ? `Отписать ${email}? Рассылки на этот адрес уходить не будут.`
      : `Вернуть ${email} в рассылки? Делайте это только по просьбе получателя — он отписывался или адрес был недоставляем.`;

  return (
    <Button
      size="sm"
      variant={next === 'unsubscribed' ? 'ghost' : 'secondary'}
      disabled={busy}
      onClick={async () => {
        if (!confirm(question)) return;
        setBusy(true);
        try {
          await api(`mailing/contacts/${id}`, { method: 'PUT', json: { status: next } });
          toast.ok(next === 'unsubscribed' ? `${email} отписан` : `${email} снова получает рассылки`);
          router.refresh();
        } catch (err) {
          toast.error(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      {next === 'unsubscribed' ? 'Отписать' : 'Вернуть'}
    </Button>
  );
}
