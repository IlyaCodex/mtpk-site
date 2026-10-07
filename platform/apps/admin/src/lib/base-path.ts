/**
 * Админка живёт по адресу /admin (на домене сайта: uralinduktor.ru/admin).
 * Ссылки next/link и router Next дополняет сам; адреса в fetch, <img>,
 * <form action> и window.location — через withBase().
 */
export const BASE_PATH = '/admin';

export const withBase = (path: string) => `${BASE_PATH}${path}`;
