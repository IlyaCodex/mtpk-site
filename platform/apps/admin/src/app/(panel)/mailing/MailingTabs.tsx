import Link from 'next/link';
import { Icon } from '@/components/icons';
import { cx } from '@/components/ui';

const TABS = [
  { id: 'campaigns', href: '/mailing', label: 'Рассылки', icon: 'letter' },
  { id: 'lists', href: '/mailing/lists', label: 'Базы адресов', icon: 'users' },
  { id: 'contacts', href: '/mailing/contacts', label: 'Все адреса и отписки', icon: 'list' },
] as const;

/** Вкладки раздела «Email-рассылки». */
export function MailingTabs({ active }: { active: (typeof TABS)[number]['id'] }) {
  return (
    <nav className="mb-6 flex gap-1 border-b border-slate-200" aria-label="Разделы рассылок">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={t.id === active ? 'page' : undefined}
          className={cx(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition',
            t.id === active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
          )}
        >
          <Icon name={t.icon} className="h-4 w-4" />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Предупреждение: письма не уходят, пока на сервере не настроена почта для рассылок. */
export function TestModeNote() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <div className="font-medium">Тестовый режим — письма не отправляются</div>
        <div className="mt-0.5 text-amber-800">
          Рассылка проходит все шаги: получатели, ссылки с метками, переходы и отписки считаются, но письма только собираются. Реальная отправка включится, когда на
          сервере зададут почту для рассылок (MAILING_TRANSPORT=smtp и MAILING_SMTP_*).
        </div>
      </div>
    </div>
  );
}
