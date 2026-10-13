import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, formatDate, PageHeader, Table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmt, type MailingSummary, type MailListRow } from '@/lib/mailing';
import { serviceJson } from '@/lib/services';
import { MailingTabs, TestModeNote } from '../MailingTabs';
import { NewListButton } from '../NewButtons';

export const metadata: Metadata = { title: 'Базы адресов' };

export default async function MailingListsPage() {
  const user = await requireUser('mailing');
  const [lists, summary] = await Promise.all([serviceJson<MailListRow[]>('mailing', 'lists', { user }), serviceJson<MailingSummary>('mailing', 'summary', { user })]);

  return (
    <>
      <PageHeader
        title="Email-рассылки"
        description="База — список адресов, по которому уходит рассылка. Пополняется из файлов Excel, CSV и TXT, вставленным списком, из заявок сайта и из CRM Битрикс24. Один адрес может быть в нескольких базах; повторы не задваиваются, отписавшимся письма не уходят."
        actions={<NewListButton />}
      />
      <MailingTabs active="lists" />
      {!summary.sendsForReal && <TestModeNote />}
      {lists.length ? (
        <Table head={['База', 'Адресов', 'Получат письмо', 'Пополнение', 'Изменена']}>
          {lists.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50">
              <td className="max-w-md px-4 py-2.5">
                <Link href={`/mailing/lists/${l.id}`} className="font-medium text-brand-600 hover:underline">
                  {l.name}
                </Link>
                {l.description && <div className="truncate text-xs text-slate-500">{l.description}</div>}
              </td>
              <td className="px-4 py-2.5 tabular-nums">{fmt(l.members)}</td>
              <td className="px-4 py-2.5 tabular-nums">
                {fmt(l.active)}
                {l.members > l.active && <span className="ml-1 text-xs text-slate-400">({fmt(l.members - l.active)} отписались или недоставляемы)</span>}
              </td>
              <td className="px-4 py-2.5">{l.source?.kind === 'leads' ? <Badge tone="blue">из заявок сайта</Badge> : <span className="text-xs text-slate-400">—</span>}</td>
              <td className="px-4 py-2.5 text-xs whitespace-nowrap text-slate-500">{formatDate(l.updatedAt)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState>
          Баз пока нет. Нажмите «Новая база» и загрузите адреса: файл Excel или TXT, список через запятую, клиентов из заявок сайта или выгрузку из CRM.
        </EmptyState>
      )}
    </>
  );
}
