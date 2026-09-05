/* ОКТАВА · 11 — сохранения и библиотека */
function lsGet(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
let saveT=null;
function changed(){clearTimeout(saveT);saveT=setTimeout(saveCur,400);}
function serialize(){
const pr=JSON.parse(JSON.stringify(project));
pr.patterns.forEach(p=>delete p._x);
pr.samples=samples.filter(s=>s.persist).map(s=>({id:s.id,name:s.name,data:s.data}));
pr.uidC=uidC;
return pr;
}
function saveCur(){lsSet('oktava4.cur',serialize());}
async function hydrate(data){
const pr=blankProject();
Object.assign(pr,data);
pr.fx=Object.assign(blankProject().fx,data.fx||{});
if(!pr.patterns||!pr.patterns.length)pr.patterns=[{id:pr.nextId++,name:'Паттерн 1',beats:8,channels:{}}];
samples=[];
for(const s of (data.samples||[])){
try{
const buf=await ensureAC().decodeAudioData(dataToBuf(s.data).slice(0));
samples.push({id:s.id,name:s.name,buffer:buf,data:s.data,persist:true});
}catch(e){}
}
uidC=data.uidC||1000;
project=pr;
pr.channelFx=pr.channelFx||{};pr.fxMarkers=Array.isArray(pr.fxMarkers)?pr.fxMarkers:[];
rebuildIdx();
selPatId=pr.patterns[0].id;selCh=null;
}
function fullRender(){
syncFxUI();renderPatterns();renderSounds();renderChannels();renderRoll();renderArr();
}
$('#saveBtn').onclick=()=>{
const lib=lsGet('oktava4.lib',[]);
lib.unshift({savedId:Date.now(),created:new Date().toISOString(),data:serialize()});
if(lsSet('oktava4.lib',lib))toast('💾 «'+(project.title||'Трек')+'» сохранён');
else toast('Не хватает места в хранилище браузера','err');
renderLib();
};
function renderLib(){
const lib=lsGet('oktava4.lib',[]),el=$('#cards');el.innerHTML='';
$('#libEmpty').style.display=lib.length?'none':'';
$('#libCnt').textContent=lib.length?lib.length+' шт.':'';
lib.forEach((item,ix)=>{
const d=new Date(item.created);
const card=document.createElement('div');card.className='card';card.style.animationDelay=(ix*.04)+'s';
card.innerHTML=`<div class="nm"></div><div class="meta">${item.data.bpm} BPM · ${item.data.patterns.length} патт. · ${d.toLocaleDateString('ru-RU')}</div><div class="cacts"><button class="btn acc" data-a="load">▶ Открыть</button><button class="btn ghost" data-a="del">🗑</button></div>`;
card.querySelector('.nm').textContent=item.data.title||'Без названия';
card.onclick=async e=>{
const a=e.target.closest('[data-a]');if(!a)return;
if(a.dataset.a==='del'){lsSet('oktava4.lib',lsGet('oktava4.lib',[]).filter(x=>x.savedId!==item.savedId));renderLib();toast('Удалено');}
if(a.dataset.a==='load'){
if(playing)stop();
await hydrate(item.data);fullRender();saveCur();
window.scrollTo({top:0,behavior:'smooth'});
toast('🎧 Проект открыт');
}
};
el.appendChild(card);
});
}