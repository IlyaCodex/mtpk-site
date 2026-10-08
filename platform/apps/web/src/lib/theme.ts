/**
 * Светлая и тёмная тема сайта. Выбор посетителя — в localStorage; тему ставит
 * маленький скрипт в <head> до стилей (иначе страница мигнула бы светлой),
 * переключатель в шапке — client/theme.ts. Цвета тёмной темы — styles/theme-dark.css.
 */
export const THEME_KEY = 'ui_theme';

/** Скрипт в <head>: выбрана тёмная тема — атрибут на <html> до первой отрисовки. */
export const THEME_INIT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;
