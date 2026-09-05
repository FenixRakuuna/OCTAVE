/* ОКТАВА · 10 — экспорт и свои звуки */
async function renderAudio(){
rebuildIdx();
const sr=44100,sd=stepDur();
const useArr=project.mode==='SONG'&&project.arr.length>0;
const total=useArr?songSteps():patSteps(curPat())*2;
const oc=new OfflineAudioContext(2,Math.ceil((total*sd+1.6)*sr),sr);
const R=makeRig(oc,project,0);
for(let g=0;g<total;g++){
const t=g*sd;
applyFxAutomation(R,g,t);
if(!useArr){triggerPat(R,curPat(),g%patSteps(curPat()),t);}
else for(const b of project.arr){
const p=project.patterns.find(x=>x.id===b.patId);if(!p)continue;
const L=patSteps(p);
if(g>=b.start&&g<b.start+L)triggerPat(R,p,(g-b.start)%L,t);
}
}
return oc.startRendering();
}
function bufToWav(buf){
const ch=buf.numberOfChannels,sr=buf.sampleRate,len=buf.length;
const bytes=44+len*ch*2,ab=new ArrayBuffer(bytes),v=new DataView(ab);
const wstr=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
wstr(0,'RIFF');v.setUint32(4,bytes-8,true);wstr(8,'WAVE');wstr(12,'fmt ');v.setUint32(16,16,true);
v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);
v.setUint16(32,ch*2,true);v.setUint16(34,16,true);wstr(36,'data');v.setUint32(40,len*ch*2,true);
let off=44;const chans=[];for(let c=0;c<ch;c++)chans.push(buf.getChannelData(c));
for(let i=0;i<len;i++)for(let c=0;c<ch;c++){let s=Math.max(-1,Math.min(1,chans[c][i]));v.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;}
return new Blob([ab],{type:'audio/wav'});
}
function download(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000);}
const fileName=ext=>((project.title||'oktava').replace(/[^\wа-яА-ЯёЁ -]/g,'').trim()||'track')+'.'+ext;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
async function ensureLame(){
if(window.lamejs&&window.lamejs.Mp3Encoder)return true;
for(const u of ['https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/lame.min.js','https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js']){
try{await loadScript(u);if(window.lamejs&&window.lamejs.Mp3Encoder)return true;}catch(e){}}
return false;
}
async function exportAudio(kind,btn){
btn.classList.add('busy');const old=btn.innerHTML;btn.innerHTML='⏳ Рендер…';
try{
const buf=await renderAudio();
if(kind==='wav'){download(bufToWav(buf),fileName('wav'));toast('✅ WAV готов');}
else{
if(await ensureLame()){
const L=buf.getChannelData(0),Rr=buf.numberOfChannels>1?buf.getChannelData(1):L;
const enc=new lamejs.Mp3Encoder(2,buf.sampleRate,192),chunks=[],BS=1152;
const iL=new Int16Array(L.length),iR=new Int16Array(Rr.length);
for(let i=0;i<L.length;i++){iL[i]=L[i]<0?L[i]*0x8000:L[i]*0x7FFF;iR[i]=Rr[i]<0?Rr[i]*0x8000:Rr[i]*0x7FFF;}
for(let i=0;i<L.length;i+=BS){const mp=enc.encodeBuffer(iL.subarray(i,i+BS),iR.subarray(i,i+BS));if(mp.length)chunks.push(mp);}
const end=enc.flush();if(end.length)chunks.push(end);
download(new Blob(chunks,{type:'audio/mp3'}),fileName('mp3'));toast('✅ MP3 готов (192 kbps)');
}else{download(bufToWav(buf),fileName('wav'));toast('MP3-кодек недоступен офлайн — скачали WAV','err');}
}
}catch(e){console.error(e);toast('Ошибка рендера: '+e.message,'err');}
btn.classList.remove('busy');btn.innerHTML=old;
}
$('#expWav').onclick=e=>exportAudio('wav',e.currentTarget);
$('#expMp3').onclick=e=>exportAudio('mp3',e.currentTarget);
/* MIDI текущего паттерна */
function vlq(n){const b=[n&0x7F];n>>=7;while(n>0){b.unshift((n&0x7F)|0x80);n>>=7;}return b;}
$('#expMidi').onclick=()=>{
const p=curPat(),DIV=480,ST=120,ev=[];
const tp=Math.round(60000000/project.bpm);
ev.push({t:0,d:[0xFF,0x51,0x03,(tp>>16)&255,(tp>>8)&255,tp&255]});
const push=(t,ch,note,len)=>{ev.push({t,d:[0x90|ch,note&127,100]});ev.push({t:t+len,d:[0x80|ch,note&127,60],off:1});};
let chN=0;const chMap={};
for(const id in p.channels){
const def=defById(id);if(!def||def.sample)continue;
let ch;
if(def.drum)ch=9;else{if(chMap[id]==null){if(chN===9)chN++;chMap[id]=chN++;}ch=chMap[id];}
if(!def.drum)ev.push({t:0,d:[0xC0|ch,def.prog||0]});
p.channels[id].forEach(n=>{
if(def.drum)push(n.s*ST,ch,def.gm||36,ST);
else push(n.s*ST,ch,clamp(noteMidi(def,n.p),0,127),Math.max(1,n.l)*ST);
});
}
ev.sort((a,b)=>a.t-b.t||(a.off?0:1)-(b.off?0:1));
const tr=[];let last=0,run=null;
ev.forEach(e=>{tr.push(...vlq(e.t-last));last=e.t;
const st=e.d[0];
if(st>=0xF0){tr.push(...e.d);run=null;}
else if(st===run){tr.push(...e.d.slice(1));}
else{tr.push(...e.d);run=st;}});
tr.push(0x00,0xFF,0x2F,0x00);
const hd=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(DIV>>8)&255,DIV&255];
const tl=[0x4D,0x54,0x72,0x6B,(tr.length>>>24)&255,(tr.length>>>16)&255,(tr.length>>>8)&255,tr.length&255];
download(new Blob([new Uint8Array([...hd,...tl,...tr])],{type:'audio/midi'}),(p.name||'pattern').replace(/[^\wа-яА-ЯёЁ -]/g,'')+'.mid');
toast('✅ MIDI паттерна скачан');
};
/* свои звуки */
function dataToBuf(data){
const b64=data.split(',')[1],bin=atob(b64),u8=new Uint8Array(bin.length);
for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
return u8.buffer;
}
async function addSoundFile(file){
try{
ensureAC();
const ab=await file.arrayBuffer();
const buffer=await ac.decodeAudioData(ab.slice(0));
const id='u'+uid();
let data=null,persist=false;
if(file.size<2_800_000){
data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(file);});
persist=true;
}
samples.push({id,name:file.name.replace(/\.[^.]+$/,''),buffer,data,persist});
const pat=curPat();pat.channels[id]=[];selCh=id;
renderSounds();renderChannels();renderRoll();changed();
audition(id,60,.6);
toast('🎧 Звук «'+file.name+'» добавлен — рисуйте им мелодию'+(persist?'':' (файл крупный: в сохранениях проекта его не будет)'));
}catch(e){toast('Не удалось декодировать аудио','err');}
}
$('#addSndBtn').onclick=()=>$('#fileAudio').click();
$('#fileAudio').onchange=e=>{if(e.target.files[0])addSoundFile(e.target.files[0]);e.target.value='';};
let dragC=0;
addEventListener('dragenter',e=>{e.preventDefault();dragC++;$('#drop').classList.add('show');});
addEventListener('dragleave',e=>{e.preventDefault();if(--dragC<=0){dragC=0;$('#drop').classList.remove('show');}});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dragC=0;$('#drop').classList.remove('show');
const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('audio'))addSoundFile(f);else toast('Нужен аудиофайл (мп3, вол…)','err');});