/* ОКТАВА · 06 — пиано-ролл */
const RW=15,PITCHES=49,DRUM_H=48;
const rollGrid=$('#rollGrid'),rollKeys=$('#rollKeys'),notesLayer=$('#notesLayer'),rollPh=$('#rollPh'),rollEmpty=$('#rollEmpty');
let noteLen=2,rollDrag=null,cwPx=34;
function rollDef(){return selCh?defById(selCh):null;}
function noteLabel(midi){
const pitch=((midi%12)+12)%12;
return NOTE_RU[pitch]+(Math.floor(midi/12)-1);
}
function renderRoll(){
const p=curPat(),def=rollDef();
cwPx=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw'))||34;
if(!def){
rollGrid.style.width=p.beats*4*cwPx+'px';rollGrid.style.height=200+'px';
rollKeys.innerHTML='';notesLayer.innerHTML='';
rollEmpty.style.display='';rollEmpty.innerHTML='Выберите звук в списке <b>слева</b>,<br>чтобы писать в нём ноты';
$('#rollTitle').textContent='Пиано-ролл';$('#rollSub').textContent='';
return;
}
rollEmpty.style.display='none';
const drum=!!def.drum,rows=drum?1:PITCHES,rowH=drum?DRUM_H:RW;
rollGrid.style.width=patSteps(p)*cwPx+'px';rollGrid.style.height=rows*rowH+'px';
$('#rollTitle').textContent='Пиано-ролл · '+def.n;
$('#rollSub').textContent=drum?'драм-дорожка: одна строка':'диапазон: '+noteLabel(def.base-12)+' — '+noteLabel(def.base+PITCHES-13);
[...rollGrid.querySelectorAll('.rrow')].forEach(r=>r.remove());
for(let i=0;i<rows;i++){
const r=document.createElement('div');r.className='rrow'+(drum?' drumrow':'');
if(!drum){const midi=def.base+i-12,m=((midi%12)+12)%12;
if([1,3,6,8,10].includes(m))r.classList.add('bk');
if(m===0)r.classList.add('cc');}
r.style.top=(rows-1-i)*rowH+'px';r.style.height=rowH+'px';
rollGrid.insertBefore(r,rollPh);
}
rollKeys.innerHTML='';
if(drum){
const k=document.createElement('div');k.className='rk big';k.textContent=def.n;
k.onpointerdown=()=>{audition(def.id,60,.3);k.classList.add('down');setTimeout(()=>k.classList.remove('down'),150);};
rollKeys.appendChild(k);
}else for(let p2=PITCHES-1;p2>=0;p2--){
const midi=def.base+p2-12,k=document.createElement('div');k.className='rk';
const m=((midi%12)+12)%12;if([1,3,6,8,10].includes(m))k.classList.add('bk');
k.textContent=noteLabel(midi);
k.onpointerdown=()=>{audition(def.id,midi,.5);k.classList.add('down');setTimeout(()=>k.classList.remove('down'),150);};
rollKeys.appendChild(k);
}
renderNotes();
}
function renderNotes(){
const p=curPat(),def=rollDef();notesLayer.innerHTML='';
if(!def||!p.channels[selCh])return;
const drum=!!def.drum,rowH=drum?DRUM_H:RW,rows=drum?1:PITCHES;
p.channels[selCh].forEach((n,i)=>{
if(n.s>=patSteps(p))return;
const d=document.createElement('div');d.className='note';d.dataset.i=i;
d.style.left=n.s*cwPx+1+'px';
d.style.top=(rows-1-(drum?0:n.p))*rowH+1.5+'px';
d.style.width=Math.min(n.l,patSteps(p)-n.s)*cwPx-3+'px';
d.style.height=rowH-3+'px';
d.style.background=`linear-gradient(180deg,${lighten(def.c,.35)},${def.c})`;
d.style.setProperty('--nc',def.c);
notesLayer.appendChild(d);
});
}
function rollCell(e){
const p=curPat(),def=rollDef();if(!def)return null;
const r=rollGrid.getBoundingClientRect(),drum=!!def.drum,rowH=drum?DRUM_H:RW,rows=drum?1:PITCHES;
const col=clamp(Math.floor((e.clientX-r.left)/cwPx),0,patSteps(p)-1);
const pitch=drum?0:clamp(rows-1-Math.floor((e.clientY-r.top)/rowH),0,PITCHES-1);
return {col,pitch};
}
function tidy(ch,keep){
for(let i=ch.length-1;i>=0;i--){
const n=ch[i];if(n===keep)continue;
if(n.p===keep.p&&n.s<keep.s+keep.l&&keep.s<n.s+n.l)ch.splice(i,1);
}
}
rollGrid.addEventListener('contextmenu',e=>e.preventDefault());
rollGrid.addEventListener('pointerdown',e=>{
e.preventDefault();
const def=rollDef();if(!def)return;
const p=curPat(),cell=rollCell(e);if(!cell)return;
const ch=p.channels[selCh]=p.channels[selCh]||[];
const el=e.target.closest('.note');
if(e.button===2){
if(el){
const i=ch.indexOf(ch[+el.dataset.i]);
if(i>=0)ch.splice(i,1);
patDirty(p);renderNotes();renderChannels();changed();
}
return;
}
if(el){
const n=ch[+el.dataset.i];if(!n)return;
const rect=el.getBoundingClientRect();
const isResize=e.clientX>rect.right-9;
rollDrag=isResize?{mode:'resize',note:n,moved:false}:{mode:'move',note:n,startCell:cell,orig:{s:n.s,p:n.p},moved:false};
}else{
const l=clamp(noteLen,1,patSteps(p)-cell.col);
const n={s:cell.col,p:cell.pitch,l};
tidy(ch,n);ch.push(n);
rollDrag={mode:'draw',note:n,startCell:cell,moved:true};
audition(selCh,noteMidi(def,cell.pitch),.4);
patDirty(p);renderNotes();renderChannels();changed();
}
rollGrid.setPointerCapture(e.pointerId);
});
rollGrid.addEventListener('pointermove',e=>{
if(!rollDrag)return;
const def=rollDef();if(!def)return;
const p=curPat(),cell=rollCell(e);if(!cell)return;
const ch=p.channels[selCh],n=rollDrag.note;
if(rollDrag.mode==='draw'){
const nl=clamp(cell.col-n.s+1,1,patSteps(p)-n.s);
if(nl!==n.l){n.l=nl;rollDrag.moved=true;renderNotes();patDirty(p);}
}else if(rollDrag.mode==='resize'){
const nl=clamp(cell.col-n.s+1,1,patSteps(p)-n.s);
if(nl!==n.l){n.l=nl;rollDrag.moved=true;renderNotes();patDirty(p);}
}else{
const dCol=cell.col-rollDrag.startCell.col;
const ns=clamp(rollDrag.orig.s+dCol,0,patSteps(p)-n.l);
const np=def.drum?0:clamp(rollDrag.orig.p+(rollDrag.startCell.pitch-cell.pitch),0,PITCHES-1);
if(ns!==n.s||np!==n.p){n.s=ns;n.p=np;rollDrag.moved=true;renderNotes();patDirty(p);}
}
});
['pointerup','pointercancel'].forEach(ev=>rollGrid.addEventListener(ev,e=>{
if(!rollDrag)return;
const p=curPat(),ch=p.channels[selCh];
if((rollDrag.mode==='move'||rollDrag.mode==='resize')&&!rollDrag.moved&&ev.type==='pointerup'){
const i=ch.indexOf(rollDrag.note);
if(i>=0)ch.splice(i,1);
renderNotes();renderChannels();
}
rollDrag=null;patDirty(p);changed();
}));
$('#lenSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;noteLen=+b.dataset.l;$$('#lenSeg button').forEach(x=>x.classList.toggle('on',x===b));};
$('#rollClear').onclick=()=>{const p=curPat();if(selCh&&p.channels[selCh]){p.channels[selCh]=[];patDirty(p);renderNotes();renderChannels();changed();}};