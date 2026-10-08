/** Стрелка «→» в подписях кнопок (сдвигается при наведении — стили .btn__arrow). */
export const ARROW = '<span class="btn__arrow">→</span>';

/**
 * Адрес приёма заявок — прежний /api/send.php: на него отправляют все формы.
 * Обрабатывает сервис заявок (services/leads): проверка по правилам send.php,
 * запись в базу (раздел «Заявки» в админке), письмо и лид в Битрикс24.
 */
export const LEAD_ENDPOINT = '/api/send.php';

/** Какие файлы можно приложить к заявке (ТЗ, паспорт, КП). */
export const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
