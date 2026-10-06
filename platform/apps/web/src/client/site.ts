/**
 * Общий клиентский модуль — подключается на всех страницах: шапка и
 * мобильное меню, поиск (грузится по клику), формы заявок, «Запросить цену»,
 * скролл к форме, маска телефона, сравнение, согласие на cookie и аналитика.
 * Модули отдельных блоков (галерея, просмотр фото, оглавление, фильтр
 * каталога) страница подключает только там, где эти блоки есть.
 */
import { initCompare } from './compare';
import { initConsent } from './consent';
import { ready } from './dom';
import { initForms } from './forms';
import { initHeader } from './header';
import { initPage } from './page';

ready(() => {
  initHeader();
  initPage();
  initForms();
  initCompare();
  initConsent();
});
