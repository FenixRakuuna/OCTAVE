/* ОКТАВА · 02 — инструменты и состояние проекта */
const DEFS=[
{id:'kick808',cat:'instruments',n:'808 Кик',drum:1,c:'#ff2e5f',gm:36},
{id:'snare',  cat:'instruments',n:'Снейр',drum:1,c:'#ff8b3d',gm:38},
{id:'clap',   cat:'instruments',n:'Клэп',drum:1,c:'#27e07c',gm:39},
{id:'hat',    cat:'instruments',n:'Хэт',drum:1,c:'#ffe14d',gm:42},
{id:'ohat',   cat:'instruments',n:'Открытый хэт',drum:1,c:'#ffb52e',gm:46},
{id:'vinyl',  cat:'instruments',n:'Винил',drum:1,c:'#d9a86c',gm:0},
{id:'cow',    cat:'instruments',n:'Каубелл',c:'#b06bff',base:74,prog:56},
{id:'bass808',cat:'instruments',n:'808 Бас',c:'#ff4d9d',base:40,prog:38},
{id:'dark',   cat:'instruments',n:'Дарк-лид',c:'#4db8ff',base:60,prog:81},
{id:'keys',   cat:'instruments',n:'Лоу-фай клавиши',c:'#7de3ff',base:60,prog:4},
];
let samples=[]; // {id,name,buffer,data,persist}
const defById=id=>DEFS.find(d=>d.id===id)||samples.map(s=>({id:s.id,cat:'user',n:s.name,c:'#9aa7ff',base:60,sample:true})).find(d=>d.id===id);

let project,selPatId=0,selCh=null,uidC=100;
const uid=()=>++uidC;
function blankProject(){return {title:'Мой трек',bpm:132,mode:'PAT',fx:{rev:30,delay:35,eqLow:0,eqMid:0,eqHigh:0,side:true,vol:90},channelFx:{},fxMarkers:[],songBars:16,patterns:[],arr:[],nextId:1};}
const curPat=()=>project.patterns.find(p=>p.id===selPatId)||project.patterns[0];
const patSteps=p=>p.beats*4;
const songSteps=()=>project.songBars*4;
const stepDur=()=>60/project.bpm/4;
function patDirty(p){const x={};for(const id in p.channels){const m=new Map();
p.channels[id].forEach(n=>{if(n.s<0||n.s>=patSteps(p))return;const a=m.get(n.s)||[];a.push(n);m.set(n.s,a);});x[id]=m;}p._x=x;}
function rebuildIdx(){project.patterns.forEach(patDirty);}