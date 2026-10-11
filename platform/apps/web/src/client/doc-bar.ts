import { mountAdminBar } from './admin-bar';

/**
 * Панель администратора на страницах-документах (Практикум): у них нет общего
 * каркаса сайта с модулем site, поэтому её подключает маршрут /api/praktikum —
 * только тем, кто вошёл в админку (флажок mtpk_bar).
 */
if (/(?:^|;\s*)mtpk_bar=1/.test(document.cookie)) void mountAdminBar();
