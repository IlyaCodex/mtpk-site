/**
 * Подробная страница проекта: галерея, письмо, окно связи.
 * Скрипт пакета. Обёрнут проверкой наличия галереи — он подключён
 * на всех страницах сайта и без неё падал бы на первой же строке.
 */
(() => {
  if (!document.querySelector('.ui-case .ui-main-photo')) return;
const photos=[document.querySelector('#main-photo'),...document.querySelectorAll('.ui-photo img')];const viewer=document.querySelector('#viewer');let current=0,viewCurrent=0;
function showPhoto(i){viewCurrent=(i+photos.length)%photos.length;viewer.querySelector('img').src=photos[viewCurrent].src;viewer.querySelector('img').alt=photos[viewCurrent].alt;document.querySelector('#viewer-controls').hidden=false;document.querySelector('#viewer-count').textContent=(viewCurrent+1)+' / '+photos.length;if(!viewer.open)viewer.showModal();}
document.querySelector('.ui-main-photo').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPhoto(0);}};document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>showPhoto(Number(b.dataset.photo)));document.querySelectorAll('[data-view-step]').forEach(b=>b.onclick=()=>showPhoto(viewCurrent+Number(b.dataset.viewStep)));
document.querySelectorAll('[data-letter]').forEach(b=>b.onclick=()=>{viewer.querySelector('img').src=document.querySelector('.ui-letter-hero img').src;viewer.querySelector('img').alt='Благодарственное письмо';document.querySelector('#viewer-controls').hidden=true;viewer.showModal();});
document.querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>document.querySelector('#contact').showModal());document.querySelectorAll('dialog .ui-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.onclick=e=>{if(e.target===d)d.close();});document.addEventListener('keydown',e=>{if(viewer.open&&!document.querySelector('#viewer-controls').hidden){if(e.key==='ArrowRight')showPhoto(viewCurrent+1);if(e.key==='ArrowLeft')showPhoto(viewCurrent-1);}});
})();
