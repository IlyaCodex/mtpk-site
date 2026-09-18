// Каталог запчастей: фильтры, поиск, сортировка, страницы, диалоги.
// Взято из прототипа пакета; убраны демо-режим и меню его шапки —
// шапка и отправка форм у сайта свои.
'use strict';
const $=id=>document.getElementById(id);
const listing=$('products'),cards=listing?[...listing.querySelectorAll('.product-card')]:[];
let pageNumber=1, pageSize=24, filteredCards=cards;
const normalize=t=>t.toLowerCase().replace(/ё/g,'е');
function filterCatalog(){
 const category=$('category-select').value,model=$('model-select').value,query=normalize($('search').value).trim().split(/\s+/).filter(Boolean);
 filteredCards=cards.filter(c=>(!category||c.dataset.category===category)&&(!model||c.dataset.scope==='turbine'||JSON.parse(c.dataset.models).includes(model))&&query.every(q=>normalize(c.dataset.search).includes(q)));
 if($('sort-select').value==='name')filteredCards.sort((a,b)=>a.dataset.name.localeCompare(b.dataset.name,'ru'));else filteredCards.sort((a,b)=>Number(a.dataset.order)-Number(b.dataset.order));
 pageNumber=1;drawPage();
}
function drawPage(){
 cards.forEach(c=>c.hidden=true);
 const pages=Math.max(1,Math.ceil(filteredCards.length/pageSize));pageNumber=Math.min(pageNumber,pages);
 filteredCards.forEach((c,i)=>{listing.append(c);c.hidden=i<(pageNumber-1)*pageSize||i>=pageNumber*pageSize;});
 $('result-heading').textContent='Найдено: '+filteredCards.length+' · Страница '+pageNumber+' из '+pages;
 $('no-results').hidden=filteredCards.length>0;
 const nav=$('pagination');nav.replaceChildren();
 if(pages>1)for(let n=1;n<=pages;n++){const b=document.createElement('button');b.textContent=String(n);b.type='button';b.dataset.page=n;if(n===pageNumber){b.className='current';b.setAttribute('aria-current','page')}b.onclick=()=>{pageNumber=n;drawPage();$('catalog').scrollIntoView({block:'start'})};nav.append(b);}
}
if(listing){
 ['category-select','model-select','sort-select'].forEach(id=>$(id).addEventListener('change',filterCatalog));$('search').addEventListener('input',filterCatalog);
 $('reset-filters').onclick=()=>{$('category-select').value='';$('model-select').value='';$('search').value='';$('sort-select').value='default';filterCatalog()};
 $('toggle-filters').onclick=()=>{const on=$('filters').classList.toggle('mobile-open');$('toggle-filters').setAttribute('aria-expanded',String(on))};
 filterCatalog();
}
// Увеличение фото: у транзисторных запчастей триггер — ссылка
// на файл картинки, поэтому переход отменяем; без скрипта
// ссылка продолжает работать как запасной путь.
document.addEventListener('click',event=>{
 const request=event.target.closest('[data-request]');
 if(request){const form=$('request-form');form.elements.part.value=request.dataset.part||'';form.elements.model.value=request.dataset.model||($('model-select')?.value||'');form.elements.quantity.value=$('quantity')?.value||'1';$('request-result').hidden=true;$('request-dialog').showModal();return}
 const close=event.target.closest('[data-close]');if(close){close.closest('dialog').close();return}
 const zoom=event.target.closest('[data-zoom]');if(zoom){event.preventDefault();$('zoom-image').src=zoom.dataset.zoom;$('zoom-image').alt=zoom.dataset.alt;$('zoom-caption').textContent=zoom.dataset.caption;$('image-dialog').showModal();return}
 const qty=event.target.closest('[data-qty]');if(qty)$('quantity').value=Math.max(1,Math.min(9999,(Number($('quantity').value)||1)+Number(qty.dataset.qty)));
});
// Preserve the existing site's public form contract. Capture precedes forms-current.js.
document.addEventListener('submit',event=>{
 const form=event.target;if(form.id!=='request-form')return;
 const text='Деталь: '+form.elements.part.value+'\nМодель: '+form.elements.model.value+'\nКоличество: '+form.elements.quantity.value;
 form.elements.message.value=text;
 // Метку берём из самой формы: обработчик обслуживает и запчасти
 // индукционных печей, у них должен быть свой источник заявки.
 form.elements.source.value=(form.dataset.form||'Запчасти')+' · '+location.pathname+' · '+text.replace(/\n/g,'; ');
},true);
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
