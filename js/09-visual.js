/* ОКТАВА · 09 — лента и эквалайзер */
const rib=$('#ribbon'),rctx=rib.getContext('2d'),eqBars=$$('#eq b');
const freq=new Uint8Array(1024);
function sizeRib(){rib.width=rib.clientWidth*devicePixelRatio;rib.height=rib.clientHeight*devicePixelRatio;}
addEventListener('resize',()=>{sizeRib();renderArr();});sizeRib();
let phase=0;
function drawRib(ts){
requestAnimationFrame(drawRib);
const w=rib.width,h=rib.height;rctx.clearRect(0,0,w,h);
const n=96,bw2=w/n;const grad=rctx.createLinearGradient(0,0,w,0);grad.addColorStop(0,'#ff2e5f');grad.addColorStop(1,'#9d5cff');
rctx.fillStyle=grad;
while(uiQ.length&&ac&&uiQ[0][1]<=ac.currentTime){
const g=uiQ[0][0];
if(project.mode==='PAT'||!project.arr.length){
rollPh.style.display='';rollPh.style.transform=`translateX(${g*cwPx}px)`;arrPh.style.opacity=0;
}else{
rollPh.style.display='none';arrPh.style.opacity=1;arrPh.style.left=ARR_GUTTER+g/4*barW()+'px';
}
$('#posEl').textContent=(Math.floor(g/4)+1)+':'+((g%4)+1);
uiQ.shift();
}
if(playing&&analyser){
analyser.getByteFrequencyData(freq);
for(let i=0;i<n;i++){const v=freq[Math.floor(i*3.2)]/255;const bh=Math.pow(v,1.4)*h*.92+2;
rctx.globalAlpha=.35+v*.65;rctx.fillRect(i*bw2+1,(h-bh)/2,Math.max(1,bw2-2),bh);}
}else{
phase+=.03;
for(let i=0;i<n;i++){const v=(Math.sin(i*.32+phase)*.5+.5)*(Math.sin(i*.11-phase*.6)*.5+.5);const bh=v*h*.4+3;
rctx.globalAlpha=.2+v*.4;rctx.fillRect(i*bw2+1,(h-bh)/2,Math.max(1,bw2-2),bh);}
}
rctx.globalAlpha=1;
eqBars.forEach((b,i)=>{const v=playing?(.3+Math.abs(Math.sin(ts/120+i*1.7))*.7):(.25+.12*Math.sin(ts/600+i));b.style.height=(v*100)+'%';});
}
requestAnimationFrame(drawRib);