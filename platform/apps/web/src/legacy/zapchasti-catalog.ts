// Каталог запчастей: фильтры, поиск, сортировка, страницы.
// Взято из прототипа пакета; убраны демо-режим и меню его шапки —
// шапка и отправка форм у сайта свои.
'use strict';
const $=<T extends HTMLElement = HTMLInputElement>(id: string)=>document.getElementById(id) as T;
const listing=$<HTMLElement>('products'),cards=listing?[...listing.querySelectorAll<HTMLElement>('.product-card')]:[];
let pageNumber=1, pageSize=24, filteredCards=cards;
const normalize=(t: string)=>t.toLowerCase().replace(/ё/g,'е');
function filterCatalog(){
 const category=$('category-select').value,model=$('model-select').value,query=normalize($('search').value).trim().split(/\s+/).filter(Boolean);
 filteredCards=cards.filter(c=>(!category||c.dataset.category===category)&&(!model||c.dataset.scope==='turbine'||JSON.parse(c.dataset.models!).includes(model))&&query.every(q=>normalize(c.dataset.search!).includes(q)));
 if($('sort-select').value==='name')filteredCards.sort((a,b)=>a.dataset.name!.localeCompare(b.dataset.name!,'ru'));else filteredCards.sort((a,b)=>Number(a.dataset.order)-Number(b.dataset.order));
 pageNumber=1;drawPage();
}
function drawPage(){
 cards.forEach(c=>c.hidden=true);
 const pages=Math.max(1,Math.ceil(filteredCards.length/pageSize));pageNumber=Math.min(pageNumber,pages);
 filteredCards.forEach((c,i)=>{listing.append(c);c.hidden=i<(pageNumber-1)*pageSize||i>=pageNumber*pageSize;});
 $('result-heading').textContent='Найдено: '+filteredCards.length+' · Страница '+pageNumber+' из '+pages;
 $('no-results').hidden=filteredCards.length>0;
 const nav=$('pagination');nav.replaceChildren();
 if(pages>1)for(let n=1;n<=pages;n++){const b=document.createElement('button');b.textContent=String(n);b.type='button';b.dataset.page=n as unknown as string;if(n===pageNumber){b.className='current';b.setAttribute('aria-current','page')}b.onclick=()=>{pageNumber=n;drawPage();$('catalog').scrollIntoView({block:'start'})};nav.append(b);}
}
if(listing){
 ['category-select','model-select','sort-select'].forEach(id=>$(id).addEventListener('change',filterCatalog));$('search').addEventListener('input',filterCatalog);
 $('reset-filters').onclick=()=>{$('category-select').value='';$('model-select').value='';$('search').value='';$('sort-select').value='default';filterCatalog()};
 $('toggle-filters').onclick=()=>{const on=$('filters').classList.toggle('mobile-open');$('toggle-filters').setAttribute('aria-expanded',String(on))};
 filterCatalog();
}
// Окна «Запросить цену / подбор» и фото, «−/+» количества, текст заявки — модуль client/spare.ts.

export {};
