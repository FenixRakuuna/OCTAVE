/* ОКТАВА · 07 — схема песни */
const arrGrid=$('#arrGrid'),arrPh=$('#arrPh'),arrNums=$('#arrNums');
const barW=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bw'))||84;
const ARR_TRACKS=8,TRACK_H=56,ARR_GUTTER=92;
let arrDrag=null,arrMarkerDrag=null;
function blockLen(b){const p=project.patterns.find(x=>x.id===b.patId);return p?patSteps(p):16;}
function blockTrack(b){return clamp(Number.isInteger(b.track)?b.track:0,0,ARR_TRACKS-1);}
function arrFits(track,start,len,ignore){
if(start<0||start+len>songSteps())return false;
return !project.arr.some(b=>b!==ignore&&blockTrack(b)===track&&start<b.start+blockLen(b)&&b.start<start+len);
}
function renderArr(){
const bw=barW();
$('#arrNums').innerHTML=Array.from({length:project.songBars},(_,i)=>`<span><b>${i+1}</b></span>`).join('');
$('#arrNums').style.width=ARR_GUTTER+project.songBars*bw+'px';
arrGrid.style.width=ARR_GUTTER+project.songBars*bw+'px';
arrGrid.style.height=ARR_TRACKS*TRACK_H+'px';
$$('#songBars button').forEach(b=>b.classList.toggle('on',+b.dataset.b===project.songBars));
[...arrGrid.querySelectorAll('.arrLane')].forEach(x=>x.remove());
[...arrGrid.querySelectorAll('.ablock')].forEach(x=>x.remove());
[...arrGrid.querySelectorAll('.fxMarkerPin')].forEach(x=>x.remove());
for(let track=0;track<ARR_TRACKS;track++){
const lane=document.createElement('div');lane.className='arrLane';lane.style.top=track*TRACK_H+'px';
lane.innerHTML='<span>Дорожка '+(track+1)+'</span>';
arrGrid.insertBefore(lane,arrPh);
}
project.arr.forEach(b=>{
const p=project.patterns.find(x=>x.id===b.patId);if(!p)return;
const col=PCOL[(p.id-1)%PCOL.length];
const d=document.createElement('div');d.className='ablock';d.dataset.bid=b.id;
d.style.left=ARR_GUTTER+b.start/4*bw+'px';d.style.top=blockTrack(b)*TRACK_H+9+'px';d.style.width=blockLen(b)/4*bw-3+'px';
d.style.background=`linear-gradient(135deg,${col},${lighten(col,.3)})`;
d.textContent=p.name;
arrGrid.appendChild(d);
});
(project.fxMarkers||[]).forEach((m,i)=>{
const pin=document.createElement('div');pin.className='fxMarkerPin';pin.dataset.marker=i;pin.textContent=m.ramp?'⛰':'◆';
pin.classList.toggle('ramp',!!m.ramp);
pin.title=`Такт ${Math.floor(m.step/4)+1}: ${markerEffectName(m.effect||'delay')} · ${defById(m.id)?.n||m.id}${m.ramp?' · горка':''}`;
pin.style.left=ARR_GUTTER+m.step/4*bw+'px';
arrGrid.appendChild(pin);
});
}
function arrPoint(e){
const r=arrGrid.getBoundingClientRect();
const x=e.clientX-r.left-ARR_GUTTER;
if(x<0)return null;
const step=clamp(Math.floor(x/(barW()/4)),0,project.songBars*4-1);
const track=clamp(Math.floor((e.clientY-r.top)/TRACK_H),0,ARR_TRACKS-1);
return {start:step,track};
}
function seekStep(e){
const r=arrGrid.getBoundingClientRect();
const x=e.clientX-r.left-ARR_GUTTER;
return clamp(Math.floor(x/(barW()/4)),0,songSteps()-1);
}
function markerStepFromEvent(e){
const r=arrGrid.getBoundingClientRect(),x=e.clientX-r.left-ARR_GUTTER;
return clamp(Math.floor(x/barW()),0,project.songBars-1)*4;
}
function showSongPosition(step){
arrPh.style.opacity=1;
arrPh.style.left=ARR_GUTTER+step/4*barW()+'px';
}
function jumpToSongStep(step){
project.mode='SONG';
$$('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m==='SONG'));
const target=clamp(step,0,songSteps()-1);
resumeStep=target;
showSongPosition(target);
if(playing)restartPlaybackAt(target);else startPlaybackAt(target);
changed();
}
arrNums.addEventListener('pointerdown',e=>{
e.preventDefault();
const rect=arrNums.getBoundingClientRect();
const x=e.clientX-rect.left-ARR_GUTTER;
if(x<0)return;
jumpToSongStep(clamp(Math.floor(x/barW()),0,project.songBars-1)*4);
});
arrGrid.addEventListener('contextmenu',e=>e.preventDefault());
arrNums.addEventListener('contextmenu',e=>{
const x=e.clientX-arrNums.getBoundingClientRect().left-ARR_GUTTER;
if(x<0)return;
e.preventDefault();
openMarkerMenu(clamp(Math.floor(x/barW()),0,project.songBars-1)*4,e.clientX,e.clientY);
});
arrGrid.addEventListener('pointerdown',e=>{
e.preventDefault();
const markerEl=e.target.closest('.fxMarkerPin');
if(markerEl){
arrMarkerDrag={index:+markerEl.dataset.marker,startX:e.clientX,moved:false};arrGrid.setPointerCapture(e.pointerId);return;
}
if(e.target===arrPh){
seekDrag=true;arrGrid.setPointerCapture(e.pointerId);
showSongPosition(seekStep(e));
return;
}
const el=e.target.closest('.ablock');
if(e.button===2){
if(el){
const block=project.arr.find(x=>x.id==el.dataset.bid);
if(block){project.arr=project.arr.filter(x=>x!==block);renderArr();changed();toast('Блок убран из схемы');}
}
return;
}
if(el){
const b=project.arr.find(x=>x.id==el.dataset.bid);if(!b)return;
arrDrag={block:b,moved:false};
}else{
const pt=arrPoint(e),p=curPat(),L=patSteps(p);if(!pt)return;
if(!arrFits(pt.track,pt.start,L,null))return;
project.arr.push({id:uid(),patId:p.id,start:pt.start,track:pt.track});
renderArr();changed();
return;
}
arrGrid.setPointerCapture(e.pointerId);
});
arrGrid.addEventListener('pointermove',e=>{
if(arrMarkerDrag){
const marker=project.fxMarkers[arrMarkerDrag.index];
if(marker){
if(Math.abs(e.clientX-arrMarkerDrag.startX)>4)arrMarkerDrag.moved=true;
if(arrMarkerDrag.moved){
marker.step=markerStepFromEvent(e);
const current=document.querySelector(`.fxMarkerPin[data-marker="${arrMarkerDrag.index}"]`);
if(current)current.style.left=ARR_GUTTER+marker.step/4*barW()+'px';
}
}
return;
}
if(seekDrag){showSongPosition(seekStep(e));return;}
if(!arrDrag)return;
const pt=arrPoint(e),b=arrDrag.block,L=blockLen(b);if(!pt)return;
if(pt.start!==b.start||blockTrack(b)!==pt.track){
if(arrFits(pt.track,pt.start,L,b)){b.start=pt.start;b.track=pt.track;arrDrag.moved=true;renderArr();}
}
});
['pointerup','pointercancel'].forEach(ev=>arrGrid.addEventListener(ev,e=>{
if(arrMarkerDrag){
if(ev==='pointerup'){
const marker=project.fxMarkers[arrMarkerDrag.index];
if(marker&&arrMarkerDrag.moved){
marker.step=markerStepFromEvent(e);
renderArr();renderFxMarkers();changed();
}
else if(marker)openMarkerMenu(marker.step,e.clientX,e.clientY,arrMarkerDrag.index);
}
arrMarkerDrag=null;
return;
}
if(seekDrag){
if(ev==='pointerup'){
const step=seekStep(e);showSongPosition(step);
if(playing)restartPlaybackAt(step);
}
seekDrag=false;return;
}
if(!arrDrag)return;
if(!arrDrag.moved&&ev.type==='pointerup'){
project.arr=project.arr.filter(b=>b!==arrDrag.block);
renderArr();toast('Блок убран из схемы');
}
arrDrag=null;changed();
}));
$('#songBars').onclick=e=>{const b=e.target.closest('button');if(!b)return;
project.songBars=+b.dataset.b;
project.arr=project.arr.filter(x=>x.start+blockLen(x)<=songSteps());
renderArr();changed();};
$('#arrClear').onclick=()=>{project.arr=[];renderArr();changed();};