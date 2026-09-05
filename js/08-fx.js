/* ОКТАВА · 08 — эффекты, транспорт-слайдеры, маркеры */
$('#bpmRange').oninput=e=>{project.bpm=+e.target.value;$('#bpmOut').textContent=e.target.value;
if(Rlive&&ac)Rlive.dl.delayTime.setTargetAtTime(stepDur()*1.5,ac.currentTime,.05);changed();};
$('#revR').oninput=e=>{project.fx.rev=+e.target.value;$('#revOut').textContent=e.target.value+'%';changed();};
$('#sideT').onchange=e=>{project.fx.side=e.target.checked;changed();};
$('#volR').oninput=e=>{project.fx.vol=+e.target.value;$('#volOut').textContent=e.target.value+'%';
if(Rlive&&ac)Rlive.master.gain.setTargetAtTime(.85*project.fx.vol/100,ac.currentTime,.05);changed();};
function channelFx(id){
project.channelFx=project.channelFx||{};
project.channelFx[id]=Object.assign({enabled:true,rev:30,delay:35,eqLow:0,eqMid:0,eqHigh:0,volume:100},project.channelFx[id]||{});
return project.channelFx[id];
}
function fxOptions(){return DEFS.map(d=>({id:d.id,name:d.n})).concat(samples.map(s=>({id:s.id,name:s.name})));}
function dbText(v){return `${v>0?'+':''}${v} dB`;}
const markerMenu=$('#markerMenu'),markerList=$('#markerList'),markerEffect=$('#markerEffect'),
markerInstrument=$('#markerInstrument'),markerValue=$('#markerValue'),markerValueOut=$('#markerValueOut'),
markerBarLabel=$('#markerBarLabel'),markerRampBtn=$('#markerRampBtn');
let markerStep=0,markerRamp=false,editingMarkerIndex=null;
function syncMarkerRamp(){
if(!markerRampBtn)return;
markerRampBtn.classList.toggle('acc',markerRamp);
markerRampBtn.textContent=markerRamp?'⛰ Горка: вкл':'⛰ Горка: выкл';
}
if(markerRampBtn){markerRampBtn.onclick=()=>{markerRamp=!markerRamp;syncMarkerRamp();};}
function syncMarkerInstruments(){
const options=fxOptions();markerInstrument.innerHTML=options.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('');
if(selCh&&options.some(x=>x.id===selCh))markerInstrument.value=selCh;
}
function markerEffectName(effect){return {delay:'Delay',eqHigh:'EQ High',eqMid:'EQ Mid',eqLow:'EQ Low',volume:'Volume'}[effect]||effect;}
function syncMarkerValue(){
const percent=markerEffect.value==='volume'||markerEffect.value==='delay';
markerValue.min=percent?'0':'-12';markerValue.max=percent?'100':'12';
markerValue.value=markerEffect.value==='delay'?70:markerEffect.value==='volume'?90:0;
markerValueOut.textContent=percent?markerValue.value+'%':dbText(+markerValue.value);
}
function renderFxMarkers(){
markerList.innerHTML='';
(project.fxMarkers||[]).forEach((m,i)=>{
const name=defById(m.id)?.n||m.id,d=document.createElement('div');d.className='markerItem';
d.innerHTML=`<span><b>${Math.floor(m.step/4)+1}</b> · ${escapeHtml(markerEffectName(m.effect||'delay'))} · ${escapeHtml(name)}${m.ramp?' · ⛰':''}</span><button type="button" title="Удалить маркер">×</button>`;
d.querySelector('button').onclick=()=>{project.fxMarkers.splice(i,1);renderFxMarkers();renderArr();changed();};
markerList.appendChild(d);
});
}
markerEffect.onchange=syncMarkerValue;
markerValue.oninput=()=>{markerValueOut.textContent=markerEffect.value==='volume'||markerEffect.value==='delay'?markerValue.value+'%':dbText(+markerValue.value);};
$('#addMarkerBtn').onclick=()=>{
const effect=markerEffect.value,id=markerInstrument.value,value=+markerValue.value;
const markerData={step:markerStep,id,effect,enabled:true,ramp:markerRamp,rev:30,delay:35,eqLow:0,eqMid:0,eqHigh:0};
if(effect==='delay')markerData.delay=value;
if(effect==='volume')markerData.volume=value;
if(effect==='eqLow')markerData.eqLow=value;
if(effect==='eqMid')markerData.eqMid=value;
if(effect==='eqHigh')markerData.eqHigh=value;
project.fxMarkers=project.fxMarkers||[];
if(editingMarkerIndex!=null&&project.fxMarkers[editingMarkerIndex]){
Object.assign(project.fxMarkers[editingMarkerIndex],markerData);
toast(markerRamp?'Маркер обновлён · горка включена':'Маркер обновлён');
}else{
project.fxMarkers=project.fxMarkers.filter(m=>!(m.step===markerStep&&m.id===id&&m.effect===effect));
project.fxMarkers.push(markerData);
toast(markerRamp?'Маркер добавлен · горка включена':'Маркер добавлен');
}
editingMarkerIndex=null;markerRamp=false;syncMarkerRamp();
markerMenu.hidden=true;renderFxMarkers();renderArr();changed();
};
function openMarkerMenu(step,x,y,markerIndex){
markerStep=step;
editingMarkerIndex=(markerIndex!=null)?markerIndex:null;
markerRamp=false;
markerBarLabel.textContent=Math.floor(step/4)+1;
syncMarkerInstruments();syncMarkerValue();
if(editingMarkerIndex!=null&&project.fxMarkers[editingMarkerIndex]){
const m=project.fxMarkers[editingMarkerIndex];
markerEffect.value=m.effect||'delay';syncMarkerValue();
if(m.id&&[...markerInstrument.options].some(o=>o.value===m.id))markerInstrument.value=m.id;
const val=m.effect==='volume'?m.volume:m.effect==='delay'?m.delay:m.effect==='eqLow'?m.eqLow:m.effect==='eqMid'?m.eqMid:m.effect==='eqHigh'?m.eqHigh:0;
markerValue.value=val??0;
const percent=markerEffect.value==='volume'||markerEffect.value==='delay';
markerValueOut.textContent=percent?markerValue.value+'%':dbText(+markerValue.value);
markerRamp=!!m.ramp;
}
syncMarkerRamp();renderFxMarkers();
markerMenu.hidden=false;
markerMenu.style.left=Math.min(x,innerWidth-250)+'px';
markerMenu.style.top=Math.min(y,innerHeight-330)+'px';
}
addEventListener('pointerdown',e=>{if(!markerMenu.hidden&&!markerMenu.contains(e.target)){markerMenu.hidden=true;editingMarkerIndex=null;}});
addEventListener('keydown',e=>{if(e.key==='Escape'){markerMenu.hidden=true;editingMarkerIndex=null;}});
$('#titleInp').oninput=e=>{project.title=e.target.value;changed();};
function syncFxUI(){
$('#titleInp').value=project.title;
$('#bpmRange').value=project.bpm;$('#bpmOut').textContent=project.bpm;
$('#revR').value=project.fx.rev;$('#revOut').textContent=project.fx.rev+'%';
$('#sideT').checked=project.fx.side;
$('#volR').value=project.fx.vol;$('#volOut').textContent=project.fx.vol+'%';
$$('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===project.mode));
$$('#songBars button').forEach(b=>b.classList.toggle('on',+b.dataset.b===project.songBars));
}