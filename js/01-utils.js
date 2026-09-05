/* ОКТАВА · 01 — утилиты */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mtof=m=>440*Math.pow(2,(m-69)/12);
function toast(message,type=''){const el=document.createElement('div');el.className='toast'+(type?' '+type:'');el.textContent=message;$('#toasts').appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},2600);}
const NOTE_RU=['До','До#','Ре','Ре#','Ми','Фа','Фа#','Соль','Соль#','Ля','Ля#','Си'];
const PCOL=['#ff2e5f','#27e07c','#ffc933','#37b6ff','#b06bff','#ff8c42','#7de3ff','#f2c14e','#ff4d9d','#9d5cff'];
const lighten=(h,f)=>{h=h.replace('#','');const x=i=>parseInt(h.slice(i,i+2),16);const L=v=>Math.round(v+(255-v)*f);return `rgb(${L(x(0))},${L(x(2))},${L(x(4))})`;};