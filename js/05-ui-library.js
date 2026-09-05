/* ОКТАВА · 05 — звуки, каналы, паттерны (левая панель) */
function renderSounds(){
const el=$('#soundList');el.innerHTML='';
const pat=curPat();
const cats=[['instruments','ИНСТРУМЕНТЫ'],['user','СВОИ ЗВУКИ']];
cats.forEach(([cat,label])=>{
const items=cat==='user'?samples.map(s=>({id:s.id,cat:'user',n:s.name,c:'#9aa7ff',sample:true})):DEFS.filter(d=>d.cat===cat);
if(cat==='user'&&!items.length)return;
const h=document.createElement('div');h.className='sndCat';h.textContent=label;el.appendChild(h);
items.forEach(d=>{
const row=document.createElement('div');row.className='sndRow'+(pat.channels[d.id]?' inpat':'');
row.style.setProperty('--c',d.c);
row.innerHTML=`<span class="dot" style="background:${d.c};color:${d.c}"></span><span class="nm">${d.n}</span>${cat==='user'?'<button class="del" title="Удалить звук">✕</button>':'<span class="tag">'+(d.drum?'драм':'мелод')+'</span>'}`;
row.onclick=e=>{
if(e.target.classList.contains('del')){removeSample(d.id);return;}
if(!pat.channels[d.id])pat.channels[d.id]=[];
selCh=d.id;patDirty(pat);
renderSounds();renderChannels();renderRoll();
audition(d.id,noteMidi(d,d.drum?0:12),.4);
changed();
};
el.appendChild(row);
});
});
}
function removeSample(id){
samples=samples.filter(s=>s.id!==id);
project.patterns.forEach(p=>delete p.channels[id]);
if(selCh===id)selCh=null;
rebuildIdx();renderSounds();renderChannels();renderRoll();changed();
toast('Звук удалён');
}
function renderChannels(){
const pat=curPat(),el=$('#chanList');el.innerHTML='';
const ids=Object.keys(pat.channels);
$('#chanSub').textContent=ids.length?ids.length+' шт.':'';
if(!ids.length){el.innerHTML='<div class="emptyHint">Кликните по звуку в списке выше — он добавится в паттерн, и в нём можно рисовать ноты.</div>';return;}
ids.forEach(id=>{
const def=defById(id);if(!def)return;
const row=document.createElement('div');row.className='chanRow'+(selCh===id?' sel':'');
row.style.setProperty('--c',def.c);
row.innerHTML=`<span class="dot" style="background:${def.c}"></span><span class="nm">${def.n}</span><span class="cnt">${pat.channels[id].length}</span><button class="mb${(pat.mutes&&pat.mutes[id])?' on':''}" title="Мьют">M</button><button class="xb" title="Убрать из паттерна">✕</button>`;
row.querySelector('.mb').onclick=e=>{e.stopPropagation();pat.mutes=pat.mutes||{};pat.mutes[id]=!pat.mutes[id];renderChannels();changed();};
row.querySelector('.xb').onclick=e=>{e.stopPropagation();delete pat.channels[id];if(selCh===id)selCh=Object.keys(pat.channels)[0]||null;
patDirty(pat);renderSounds();renderChannels();renderRoll();changed();};
row.onclick=()=>{selCh=id;renderChannels();renderRoll();};
el.appendChild(row);
});
}
function renderPatterns(){
const wrap=$('#patCards');wrap.innerHTML='';
project.patterns.forEach(p=>{
const c=document.createElement('div');c.className='pcard'+(p.id===selPatId?' on':'');
const col=PCOL[(p.id-1)%PCOL.length];
c.style.setProperty('--pc',col);
c.innerHTML=`<span class="d" style="background:${col}"></span>${escapeHtml(p.name)}<span class="b">${p.beats} т.</span>`;
c.onclick=()=>{selPatId=p.id;renderPatterns();syncPatTools();renderChannels();renderSounds();renderRoll();renderArr();changed();};
wrap.appendChild(c);
});
syncPatTools();
}
function syncPatTools(){
const p=curPat();
$('#patName').value=p.name;
$$('#patBars button').forEach(b=>b.classList.toggle('on',+b.dataset.b===p.beats));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
$('#patName').oninput=e=>{curPat().name=e.target.value;renderPatterns();renderArr();changed();};
$('#patBars').onclick=e=>{
const b=e.target.closest('button');if(!b)return;
const p=curPat();p.beats=+b.dataset.b;
for(const id in p.channels)p.channels[id]=p.channels[id].filter(n=>n.s<patSteps(p));
patDirty(p);renderPatterns();renderRoll();changed();
toast('Длина паттерна: '+p.beats+' такт(ов) — лишние ноты обрезаны');
};
$('#patNew').onclick=()=>{
const p={id:project.nextId++,name:'Паттерн '+project.nextId,beats:8,channels:{}};
project.patterns.push(p);selPatId=p.id;selCh=null;
renderPatterns();renderSounds();renderChannels();renderRoll();changed();toast('➕ Новый паттерн');
};
$('#patCopy').onclick=()=>{
const p=curPat();
const c={id:project.nextId++,name:p.name+' (копия)',beats:p.beats,channels:JSON.parse(JSON.stringify(p.channels))};
project.patterns.push(c);selPatId=c.id;
renderPatterns();renderChannels();renderSounds();renderRoll();changed();toast('📋 Паттерн скопирован');
};
$('#patDel').onclick=()=>{
if(project.patterns.length<=1)return toast('Нужен хотя бы один паттерн','err');
const id=selPatId;
project.patterns=project.patterns.filter(p=>p.id!==id);
project.arr=project.arr.filter(b=>b.patId!==id);
selPatId=project.patterns[0].id;
rebuildIdx();renderPatterns();renderChannels();renderSounds();renderRoll();renderArr();changed();
toast('🗑 Паттерн удалён');
};