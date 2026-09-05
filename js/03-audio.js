/* ОКТАВА · 03 — аудио-движок и голоса */
let ac=null,Rlive=null,playing=false,gStep=0,resumeStep=0,playOriginStep=0,playOriginTime=0,nextT=0,timer=null,uiQ=[],analyser=null,seekDrag=false;
const NC=new WeakMap(),IRC=new WeakMap();
function ensureAC(){if(!ac){const AC=window.AudioContext||window.webkitAudioContext;ac=new AC();}if(ac.state==='suspended')ac.resume();return ac;}
function noiseBuf(c){let b=NC.get(c);if(!b){b=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;NC.set(c,b);}return b;}
function nsrc(c){const s=c.createBufferSource();s.buffer=noiseBuf(c);return s;}
function makeIR(c,dur,dec){let b=IRC.get(c);if(b&&b._d===dur)return b;
b=c.createBuffer(2,c.sampleRate*dur,c.sampleRate);
for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,dec);}
b._d=dur;IRC.set(c,b);return b;}
function driveCurve(k){const n=256,cv=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;cv[i]=Math.tanh(x*k);}return cv;}
function route(R,g,rev,dl){
const fx=R.activeFx||{enabled:true,rev:30,delay:35};
g.connect(R.mus);
if(!fx.enabled)return;
if(rev){const s=R.c.createGain();s.gain.value=rev*(fx.rev/30);g.connect(s);s.connect(R.rev);}
if(dl){const s=R.c.createGain();s.gain.value=dl*(fx.delay/35);g.connect(s);s.connect(R.dl);}}
function makeRig(c,S,t0){
const master=c.createGain();master.gain.setValueAtTime(.85*(S.fx.vol/100),t0);
const comp=c.createDynamicsCompressor();
comp.threshold.value=-16;comp.knee.value=24;comp.ratio.value=5;comp.attack.value=.004;comp.release.value=.18;
master.connect(comp);comp.connect(c.destination);
const eqLow=c.createBiquadFilter();eqLow.type='lowshelf';eqLow.frequency.value=140;eqLow.gain.value=S.fx.eqLow||0;
const eqMid=c.createBiquadFilter();eqMid.type='peaking';eqMid.frequency.value=900;eqMid.Q.value=.8;eqMid.gain.value=S.fx.eqMid||0;
const eqHigh=c.createBiquadFilter();eqHigh.type='highshelf';eqHigh.frequency.value=5200;eqHigh.gain.value=S.fx.eqHigh||0;
const mus=c.createGain();mus.connect(eqLow);eqLow.connect(eqMid);eqMid.connect(eqHigh);eqHigh.connect(master);
const rev=c.createConvolver();rev.buffer=makeIR(c,2.6,2.8);
const rg=c.createGain();rg.gain.value=.3+S.fx.rev/100*1.5;rev.connect(rg);rg.connect(mus);
const dl=c.createDelay(2);dl.delayTime.setValueAtTime(stepDur()*1.5,t0);
const df=c.createBiquadFilter();df.type='lowpass';df.frequency.value=2400;
const fb=c.createGain();fb.gain.value=.34;dl.connect(df);df.connect(fb);fb.connect(dl);
const dg=c.createGain();dg.gain.value=.45;df.connect(dg);dg.connect(mus);
const channelBuses={};
const channelSettings=id=>Object.assign({enabled:true,rev:30,delay:35,eqLow:0,eqMid:0,eqHigh:0,volume:100},S.channelFx&&S.channelFx[id]||{});
const getBus=id=>{
if(channelBuses[id])return channelBuses[id].input;
const fx=channelSettings(id),input=c.createGain(),low=c.createBiquadFilter(),mid=c.createBiquadFilter(),high=c.createBiquadFilter(),out=c.createGain();
low.type='lowshelf';low.frequency.value=140;low.gain.value=fx.eqLow;
mid.type='peaking';mid.frequency.value=900;mid.Q.value=.8;mid.gain.value=fx.eqMid;
high.type='highshelf';high.frequency.value=5200;high.gain.value=fx.eqHigh;
out.gain.value=(fx.volume??100)/100;
input.connect(low);low.connect(mid);mid.connect(high);high.connect(out);out.connect(mus);
channelBuses[id]={input,low,mid,high,out,fx};
return input;
};
return {c,master,mus,rev,dl,delayGain:dg,eqLow,eqMid,eqHigh,channelBuses,getBus,lastF:0};
}
function duck(R,t,sd){const g=R.mus.gain;g.cancelScheduledValues(t);g.setTargetAtTime(.5,t,.012);g.setTargetAtTime(1,t+Math.max(.09,sd*.35),.12);}

/* голоса */
function v_kick(R,t){const c=R.c;
const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.95,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.45);
const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(44,t+.11);
o.connect(g);g.connect(R.mus);
const n=nsrc(c),hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;
const ng=c.createGain();ng.gain.setValueAtTime(.28,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.02);
n.connect(hp);hp.connect(ng);ng.connect(R.mus);
o.start(t);o.stop(t+.5);n.start(t);n.stop(t+.03);}
function v_snare(R,t){const c=R.c;
const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(190,t);
og.gain.setValueAtTime(.28,t);og.gain.exponentialRampToValueAtTime(.0001,t+.11);
o.connect(og);og.connect(R.mus);o.start(t);o.stop(t+.15);
const n=nsrc(c),bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1900;bp.Q.value=.8;
const g=c.createGain();g.gain.setValueAtTime(.5,t);g.gain.exponentialRampToValueAtTime(.0001,t+.19);
n.connect(bp);bp.connect(g);route(R,g,.12,0);n.start(t);n.stop(t+.22);}
function v_clap(R,t){const c=R.c;
const n=nsrc(c),bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1300;bp.Q.value=1.1;
const g=c.createGain();g.gain.setValueAtTime(0,t);
for(let k=0;k<3;k++){const tk=t+k*.013;g.gain.setValueAtTime(.42,tk);g.gain.exponentialRampToValueAtTime(.08,tk+.011);}
g.gain.setValueAtTime(.4,t+.039);g.gain.exponentialRampToValueAtTime(.0001,t+.24);
n.connect(bp);bp.connect(g);route(R,g,.15,0);n.start(t);n.stop(t+.3);}
function v_hat(R,t,open){const c=R.c;
const n=nsrc(c),hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=7600;
const g=c.createGain();const d=open?.32:.05;
g.gain.setValueAtTime(open?.22:.17,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
n.connect(hp);hp.connect(g);g.connect(R.mus);n.start(t);n.stop(t+d+.02);}
function v_vinyl(R,t,dur){const c=R.c,D=Math.max(.16,Math.min(.8,dur));
const hiss=nsrc(c),filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=5000;
const hg=c.createGain();hg.gain.setValueAtTime(0,t);hg.gain.linearRampToValueAtTime(.13,t+.006);hg.gain.exponentialRampToValueAtTime(.0001,t+D);
hiss.connect(filter);filter.connect(hg);hg.connect(R.mus);hiss.start(t);hiss.stop(t+D+.02);
const crackBuf=c.createBuffer(1,Math.ceil(c.sampleRate*D),c.sampleRate),data=crackBuf.getChannelData(0);
for(let i=0;i<data.length;i++){
if(Math.random()<.002){
const len=20+Math.random()*100|0;
for(let k=0;k<len&&i+k<data.length;k++)data[i+k]+=(Math.random()*2-1)*Math.pow(1-k/len,2)*.8;
}
}
const crack=c.createBufferSource(),cg=c.createGain();crack.buffer=crackBuf;
cg.gain.value=.22;crack.connect(cg);cg.connect(R.mus);crack.start(t);crack.stop(t+D);}
function v_cow(R,t,f){const c=R.c;
const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.3);
const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f*1.5;bp.Q.value=.8;
[f*.675,f].forEach(fr=>{const o=c.createOscillator();o.type='square';o.frequency.value=fr;o.connect(bp);o.start(t);o.stop(t+.35);});
const ws=c.createWaveShaper();ws.curve=driveCurve(2.2);bp.connect(ws);ws.connect(g);
route(R,g,.14,.12);}
function v_bass808(R,t,f,dur){const c=R.c;
const o=c.createOscillator();o.type='sine';
const from=R.lastF&&R.lastF/f<1.6?R.lastF:f*2.4;
o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(f,t+.07);R.lastF=f;
const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=750;
const ws=c.createWaveShaper();ws.curve=driveCurve(3.5);
const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.85,t+.006);g.gain.setValueAtTime(.85,t+dur*.55);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
const center=c.createStereoPanner();center.pan.setValueAtTime(0,t);
o.connect(lp);lp.connect(ws);ws.connect(g);g.connect(center);route(R,center,0,.3);
o.start(t);o.stop(t+dur+.1);}
function v_dark(R,t,f,dur){const c=R.c;
const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.26,t+.025);g.gain.setValueAtTime(.26,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(2400,t);lp.frequency.exponentialRampToValueAtTime(850,t+dur);
const vib=c.createOscillator();vib.frequency.value=5.5;const vg=c.createGain();vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(9,t+.4);vib.connect(vg);
[-8,8].forEach(det=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;vg.connect(o.detune);o.connect(lp);o.start(t);o.stop(t+dur+.1);});
vib.start(t);vib.stop(t+dur+.1);lp.connect(g);route(R,g,.28,.35);}
function v_keys(R,t,f,dur){const c=R.c;
const D=Math.max(.7,dur),release=D+.65;
const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(2600,t);filter.Q.value=.45;
const g=c.createGain();
g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.28,t+.035);
g.gain.exponentialRampToValueAtTime(.13,t+.5);g.gain.exponentialRampToValueAtTime(.0001,t+release);
[[1,.72,-4],[2,.2,3],[3,.07,-3]].forEach(([ratio,level,detune])=>{
const o=c.createOscillator();o.type=ratio===1?'triangle':'sine';o.frequency.value=f*ratio;o.detune.value=detune;
const og=c.createGain();og.gain.value=level;
o.connect(og);og.connect(filter);o.start(t);o.stop(t+release+.08);
});
filter.connect(g);route(R,g,.18,.06);}
function v_sample(R,t,buf,midi,dur){
if(!buf)return;
const c=R.c;
// 72 = оригинальная высота сэмпла. Если свои звуки слишком высокие/низкие — поменяй число
const rate=clamp(Math.pow(2,(midi-72)/12),0.25,4);
const s=c.createBufferSource();s.buffer=buf;s.playbackRate.value=rate;
const D=Math.min(dur+.08,buf.duration/rate);
const g=c.createGain();
g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.9,t+.005);
g.gain.setValueAtTime(.9,t+Math.max(.01,D-.05));g.gain.linearRampToValueAtTime(0,t+D);
s.connect(g);route(R,g,.15,.05);
s.start(t);s.stop(t+D+.02);}
function playVoice(R,id,t,midi,dur){
const f=mtof(midi);
const previousBus=R.mus,previousFx=R.activeFx;
R.activeFx=Object.assign({enabled:true,rev:30,delay:35,eqLow:0,eqMid:0,eqHigh:0},project.channelFx&&project.channelFx[id]||{});
R.mus=R.getBus(id);
try{switch(id){
case 'kick808':v_kick(R,t);break;
case 'snare':v_snare(R,t);break;
case 'clap':v_clap(R,t);break;
case 'hat':v_hat(R,t,false);break;
case 'ohat':v_hat(R,t,true);break;
case 'vinyl':v_vinyl(R,t,dur);break;
case 'cow':v_cow(R,t,f);break;
case 'bass808':v_bass808(R,t,f,dur);break;
case 'dark':v_dark(R,t,f,dur);break;
case 'keys':v_keys(R,t,f,dur);break;
default:{
const s=samples.find(x=>x.id===id);
if(s&&s.buffer)v_sample(R,t,s.buffer,midi,dur);
}
}}finally{R.mus=previousBus;R.activeFx=previousFx;}
}
const noteMidi=(def,p)=>def.drum?60:(def.base+p-12);
let prevRig=null;
function audition(id,midi,dur=.5){
try{ensureAC();
if(!prevRig){prevRig=makeRig(ac,project,ac.currentTime);}
playVoice(prevRig,id,ac.currentTime+.02,midi,dur);
}catch(e){}
}