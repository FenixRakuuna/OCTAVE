/* ОКТАВА · 04 — планировщик и транспорт */
function triggerPat(R,p,local,t){
const sd=stepDur();
for(const id in p._x){
if(p.mutes&&p.mutes[id])continue;
const arr=p._x[id].get(local);if(!arr)continue;
const def=defById(id);if(!def)continue;
for(const n of arr){
if(def.drum&&id==='kick808'&&project.fx.side)duck(R,t,sd);
playVoice(R,id,t,noteMidi(def,n.p||0),Math.max(.12,n.l*sd));
}
}
}
function totalSteps(){
if(project.mode==='PAT'||!project.arr.length)return patSteps(curPat());
return songSteps();
}
const FX_PARAMS=['volume','delay','eqLow','eqMid','eqHigh'];
const FX_DEFAULTS={volume:100,delay:35,eqLow:0,eqMid:0,eqHigh:0};
function markerParamValue(m,param){
if(param==='volume')return Number(m.volume??FX_DEFAULTS.volume);
if(param==='delay')return Number(m.delay??FX_DEFAULTS.delay);
if(param==='eqLow')return Number(m.eqLow??FX_DEFAULTS.eqLow);
if(param==='eqMid')return Number(m.eqMid??FX_DEFAULTS.eqMid);
if(param==='eqHigh')return Number(m.eqHigh??FX_DEFAULTS.eqHigh);
return 0;
}
function channelParamMarkers(id,param){
return (project.fxMarkers||[]).filter(m=>m.id===id&&m.effect===param).sort((a,b)=>a.step-b.step);
}
function fxValueAtStep(id,param,step){
const def=FX_DEFAULTS[param]??0;
const markers=channelParamMarkers(id,param);
if(!markers.length)return def;
let prevStep=0,prevValue=def;
for(const m of markers){
if(m.step<=step){prevStep=m.step;prevValue=markerParamValue(m,param);continue;}
if(m.ramp){
const span=m.step-prevStep;
if(span<=0)return markerParamValue(m,param);
const k=clamp((step-prevStep)/span,0,1);
return prevValue+(markerParamValue(m,param)-prevValue)*k;
}
return prevValue;
}
return prevValue;
}
function fxEnabledAtStep(id,step){
const markers=(project.fxMarkers||[]).filter(m=>m.id===id).sort((a,b)=>a.step-b.step);
let enabled=true;
for(const m of markers){if(m.step<=step){enabled=m.enabled!==false;}else break;}
return enabled;
}
function applyFxAutomation(R,step,t){
if(!project)return;
project.channelFx=project.channelFx||{};
const ids=new Set([...Object.keys(project.channelFx),...(project.fxMarkers||[]).map(m=>m.id)]);
const now=t??(R&&R.c?R.c.currentTime:0);
const smooth=Math.max(0.02,stepDur()/3);
for(const id of ids){
const fx=channelFx(id);
fx.enabled=fxEnabledAtStep(id,step);
for(const param of FX_PARAMS){fx[param]=fxValueAtStep(id,param,step);}
const bus=R&&R.channelBuses?R.channelBuses[id]:null;
if(bus){
bus.low.gain.cancelScheduledValues(now);bus.mid.gain.cancelScheduledValues(now);
bus.high.gain.cancelScheduledValues(now);bus.out.gain.cancelScheduledValues(now);
bus.low.gain.setTargetAtTime(fx.eqLow??0,now,smooth);
bus.mid.gain.setTargetAtTime(fx.eqMid??0,now,smooth);
bus.high.gain.setTargetAtTime(fx.eqHigh??0,now,smooth);
bus.out.gain.setTargetAtTime((fx.volume??100)/100,now,smooth);
}
}
}
function scheduleGlobal(g,t){
applyFxAutomation(Rlive,g,t);
if(project.mode==='PAT'||!project.arr.length){triggerPat(Rlive,curPat(),g%patSteps(curPat()),t);return;}
let played=false;
for(const b of project.arr){
const p=project.patterns.find(x=>x.id===b.patId);if(!p)continue;
const L=patSteps(p);
if(g>=b.start&&g<b.start+L){triggerPat(Rlive,p,(g-b.start)%L,t);played=true;}
}
if(!played&&project.arr.length){triggerPat(Rlive,curPat(),g%patSteps(curPat()),t);}
}
function startPlaybackAt(startStep){
ensureAC();rebuildIdx();
project.channelFx=project.channelFx||{};
for(const id of Object.keys(project.channelFx))project.channelFx[id]={enabled:true,rev:30,delay:35,eqLow:0,eqMid:0,eqHigh:0,volume:100};
Rlive=makeRig(ac,project,ac.currentTime);
applyFxAutomation(Rlive,startStep,ac.currentTime+0.06);
analyser=ac.createAnalyser();analyser.fftSize=2048;Rlive.master.connect(analyser);
playing=true;gStep=startStep%totalSteps();nextT=ac.currentTime+.08;playOriginStep=gStep;playOriginTime=nextT;uiQ=[];
if(project.mode==='SONG'&&project.arr.length)showSongPosition(gStep);
timer=setInterval(()=>{while(nextT<ac.currentTime+.3){const tot=totalSteps();const g=gStep%tot;
scheduleGlobal(g,nextT);uiQ.push([g,nextT]);gStep=(gStep+1)%tot;nextT+=stepDur();}},30);
$('#playBtn').classList.add('live');$('#icPlay').style.display='none';$('#icStop').style.display='';
$('#hint').classList.add('gone');
}
function play(){startPlaybackAt(resumeStep);}
function restartPlaybackAt(step){
resumeStep=step;clearInterval(timer);uiQ=[];
if(Rlive){try{Rlive.master.disconnect()}catch(e){}}
Rlive=null;startPlaybackAt(step);
}
function stop(){
playing=false;clearInterval(timer);uiQ=[];
if(Rlive){try{Rlive.master.disconnect()}catch(e){}}
Rlive=null;playOriginTime=0;
$('#arrPh').style.opacity=0;
if(!(project.mode==='SONG'&&project.arr.length)){$('#rollPh').style.display='none';$('#posEl').textContent='1:1';}
$('#playBtn').classList.remove('live');$('#icPlay').style.display='';$('#icStop').style.display='none';
}
$('#playBtn').onclick=()=>playing?stop():play();
addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();playing?stop():play();}});
$('#modeSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;
project.mode=b.dataset.m;$$('#modeSeg button').forEach(x=>x.classList.toggle('on',x===b));
if(playing){stop();play();}changed();};