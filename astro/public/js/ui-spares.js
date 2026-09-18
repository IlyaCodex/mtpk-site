(() => {
 'use strict';
 const items=JSON.parse(document.getElementById('catalog-data').textContent);
 const templates=JSON.parse(document.getElementById('catalog-templates').textContent);
 const lookup=new Map(items.map(x=>[x.id,x]));
 const key='ural-spares-request';let basket={};
 try{const stored=JSON.parse(localStorage.getItem(key)||'{}');for(const [id,qty] of Object.entries(stored)){if(lookup.has(id)&&Number.isInteger(qty)&&qty>0&&qty<=999)basket[id]=qty;}}catch{}
 const dialog=document.getElementById('request-dialog');
 const note=document.getElementById('request-note');
 const status=document.getElementById('request-status');
 function update(){
  try{localStorage.setItem(key,JSON.stringify(basket));}catch{}
  document.querySelectorAll('[data-request-count]').forEach(x=>x.textContent=Object.keys(basket).length);
  document.querySelectorAll('[data-add]').forEach(b=>{const yes=!!basket[b.dataset.add];b.textContent=yes?'В заявке ✓':'В заявку';b.setAttribute('aria-pressed',String(yes));});
 }
 function requestText(){
  return 'Запрос на подбор запчастей — УралИндуктор\r\n\r\n'+Object.entries(basket).map(([id,qty],i)=>`${i+1}. ${id} — ${lookup.get(id).name}; количество: ${qty}`).join('\r\n')+'\r\n\r\nМодель печи и комментарий:\r\n'+note.value.trim()+'\r\n\r\nПросим уточнить исполнение, комплектность, стоимость и срок поставки.';
 }
 function email(){document.getElementById('email-request').href='mailto:info@uralinduktor.ru?subject='+encodeURIComponent('Подбор запчастей для индукционной печи')+'&body='+encodeURIComponent(requestText());}
 function drawRequest(){
  const box=document.getElementById('request-items');box.replaceChildren();
  if(!Object.keys(basket).length){const p=document.createElement('p');p.textContent='Пока нет выбранных позиций. Добавьте детали из каталога или опишите нужный узел в комментарии.';box.append(p);}
  for(const [id,qty] of Object.entries(basket)){
   const row=document.createElement('div');row.className='v9-request-row';
   const label=document.createElement('span');label.textContent=`${id} · ${lookup.get(id).name}`;
   const input=document.createElement('input');input.type='number';input.min='1';input.max='999';input.step='1';input.value=qty;input.setAttribute('aria-label','Количество: '+lookup.get(id).name);
   input.addEventListener('input',()=>{const n=Number(input.value);basket[id]=Number.isInteger(n)?Math.max(1,Math.min(999,n)):1;input.value=basket[id];update();email();});
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Удалить '+lookup.get(id).name);remove.addEventListener('click',()=>{delete basket[id];update();drawRequest();});
   row.append(label,input,remove);box.append(row);
  }
  email();
 }
 document.addEventListener('click',ev=>{
  const add=ev.target.closest('[data-add]');if(add){const id=add.dataset.add;if(basket[id])delete basket[id];else basket[id]=1;update();}
  if(ev.target.closest('[data-open-request]')){drawRequest();status.textContent='';dialog.showModal();}
 });
 document.getElementById('close-request').addEventListener('click',()=>dialog.close());
 note.addEventListener('input',email);
 document.getElementById('download-request').addEventListener('click',()=>{
  if(!Object.keys(basket).length&&!note.value.trim()){status.textContent='Добавьте позицию или описание нужной запчасти.';return;}
  const blob=new Blob(['\uFEFF'+requestText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='Заявка_на_запчасти.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Список подготовлен для сохранения. Заявка не отправлена.';
 });
 const q=document.getElementById('parts-search'),g=document.getElementById('parts-group'),toggle=document.getElementById('new-only');
 const full=/\/nomenklatura(?:\.html|\/)?$/.test(location.pathname);
 const norm=v=>String(v).toLowerCase().replace(/ё/g,'е').replace(/мпу/g,'mpu').replace(/(?<=\d),(?=\d)/g,'.').replace(/\s+/g,' ').trim();
 if(q){
  let onlyNew=false;
  function filter(){
   const words=norm(q.value).split(' ').filter(Boolean),active=words.length||g.value||onlyNew;
   const filtered=items.filter(r=>(!onlyNew||r.new)&&(!g.value||r.group===g.value)&&words.every(w=>norm([r.id,r.name,r.zh,r.params,r.purpose].join(' ')).includes(w)));
   const show=active||full;document.getElementById('search-results').hidden=!show;
   const groups=document.getElementById('catalog-groups');if(groups)groups.hidden=!!active;
   if(show){document.getElementById('results-list').innerHTML=filtered.map(r=>templates[r.id]).join('');update();}
   document.getElementById('no-results').hidden=filtered.length>0;
   document.getElementById('parts-status').textContent=active?`Найдено: ${filtered.length} из ${items.length}`:`${items.length} позиций и исполнений`;
  }
  q.addEventListener('input',filter);g.addEventListener('change',filter);
  toggle.addEventListener('click',()=>{onlyNew=!onlyNew;toggle.setAttribute('aria-pressed',String(onlyNew));filter();});
  document.getElementById('clear-search').addEventListener('click',()=>{q.value='';g.value='';onlyNew=false;toggle.setAttribute('aria-pressed','false');filter();q.focus();});
  q.addEventListener('keydown',ev=>{if(ev.key==='Escape'){q.value='';filter();}});
 }
 function revealHash(){try{const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target&&target.matches('details')){target.open=true;target.scrollIntoView({block:'start'});}}catch{}}
 window.addEventListener('hashchange',revealHash);revealHash();update();
})();
