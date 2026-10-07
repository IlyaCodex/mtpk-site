/**
 * Журнал действий по-русски: «Изменена страница „Пусконаладка…“» вместо
 * кода content.put и адреса /pages/941. Коды — «сервис.метод» запросов
 * админки (api/v1/[service]) и события входа и пользователей.
 */
type Entry = { action: string; target: string | null; details: unknown };

const plain = (s: unknown) =>
  String(s ?? '')
    .split('|')[0]
    .replace(/&nbsp;/g, ' ')
    .trim();

export function describeAction({ action, target, details }: Entry): string {
  const d = (details && typeof details === 'object' ? details : {}) as Record<string, unknown>;
  const t = target ?? '';
  const title = plain(d.title) || plain(d.path);
  const file = t.replace(/^\/objects\//, '');
  const verb = action.split('.').pop();
  const done = verb === 'post' ? 'Добавлен' : verb === 'delete' ? 'Удалён' : 'Изменён';
  switch (true) {
    case action === 'login':
      return 'Вход в админку';
    case action === 'login.failed':
      return `Неудачная попытка входа: ${t}`;
    case action === 'logout':
      return 'Выход из админки';
    case action === 'user.create':
      return `Добавлен пользователь ${t}`;
    case action === 'user.update':
      return `Изменён пользователь ${t}`;
    case action === 'user.delete':
      return `Удалён пользователь ${t}`;
    case action.startsWith('content.') && t.startsWith('/pages'):
      return `${verb === 'post' ? 'Создана' : verb === 'delete' ? 'Удалена' : 'Изменена'} страница${title ? ` «${title}»` : ''}`;
    case action.startsWith('content.') && t === '/settings':
      return 'Изменены шапка, меню и контакты';
    case action.startsWith('content.') && t.startsWith('/redirects'):
      return `${done} редирект${d.from ? ` ${String(d.from)} → ${String(d.to ?? '')}` : ''}`;
    case action.startsWith('content.') && t === '/stock':
      return 'Обновлено наличие на складе';
    case action.startsWith('content.') && t.startsWith('/cache'):
      return 'Обновлён кеш сайта';
    case action.startsWith('media.') && t.startsWith('/objects'):
      return verb === 'delete' ? `Удалён файл ${file}` : `Загружен файл ${file}`;
    case action.startsWith('leads.') && t.endsWith('/resend'):
      return `Повторная отправка заявки №${t.split('/')[2] ?? ''}`;
    case action.startsWith('search.'):
      return 'Пересобран поиск по сайту';
    default:
      return `${action} ${t}`.trim();
  }
}

/** Цвет метки действия: удаления и неудачные входы — красным. */
export const actionTone = (action: string) => (action.endsWith('.delete') || action === 'login.failed' ? 'red' : action.startsWith('login') || action === 'logout' ? 'gray' : 'blue');
