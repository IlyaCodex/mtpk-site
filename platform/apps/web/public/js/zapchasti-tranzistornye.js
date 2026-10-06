(function(global){
  'use strict';
  const normalize=value=>String(value||'').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
  function matches(item,filters){
    const query=normalize(filters.search);
    const text=normalize(item.search);
    return (!filters.category||item.category===filters.category)&&(!filters.voltage||item.voltage===filters.voltage)&&
      (!query||query.split(' ').every(word=>text.includes(word))||text.replace(/[\s-]/g,'').includes(query.replace(/[\s-]/g,'')));
  }
  function init(root){
    root.querySelectorAll('[data-catalog]').forEach(catalog=>{
      if(catalog.dataset.ready)return;
      catalog.dataset.ready='true';
      const grid=catalog.querySelector('.tr-product-grid');
      const cards=Array.from(grid.querySelectorAll('[data-card]'));
      const category=catalog.querySelector('[data-category-filter]');
      const voltage=catalog.querySelector('[data-voltage-filter]');
      const search=catalog.querySelector('[data-search-filter]');
      const sort=catalog.querySelector('[data-sort]');
      function update(){
        if(category&&voltage){
          voltage.disabled=Boolean(category.value&&category.value!=='igbt');
          if(voltage.disabled)voltage.value='';
        }
        const state={category:category?.value||'',voltage:voltage?.value||'',search:search.value};
        let count=0;
        cards.sort((a,b)=>sort.value==='name'?a.dataset.name.localeCompare(b.dataset.name,'ru'):Number(a.dataset.order)-Number(b.dataset.order));
        cards.forEach(card=>{card.hidden=!matches(card.dataset,state);if(!card.hidden)count++;grid.append(card);});
        catalog.querySelector('[data-count]').textContent='Найдено: '+count;
        catalog.querySelector('[data-empty]').hidden=count!==0;
      }
      search.addEventListener('input',update);
      [category,voltage,sort].filter(Boolean).forEach(el=>el.addEventListener('change',update));
      catalog.querySelector('[data-reset]').addEventListener('click',()=>{
        if(category)category.value='';if(voltage)voltage.value='';search.value='';sort.value='order';update();
      });
      update();
    });
    const menu=root.querySelector('.tr-menu-button');
    if(menu&&!menu.dataset.ready){
      menu.dataset.ready='true';
      menu.addEventListener('click',()=>{
        const header=menu.closest('.tr-header');
        const opened=header.classList.toggle('menu-open');
        menu.setAttribute('aria-expanded',String(opened));
        menu.setAttribute('aria-label',opened?'Закрыть меню':'Открыть меню');
      });
    }
  }
  global.TransistorCatalog={normalize,matches,init};
  if(typeof document!=='undefined'){
    const run=()=>document.querySelectorAll('.ui-transistor-site').forEach(init);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  }
})(globalThis);
