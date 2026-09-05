/* ОКТАВА · 12 — запуск (пустой старт, без демо-музыки) */
(async function init(){
const saved=lsGet('oktava4.cur',null);
if(saved&&saved.patterns){await hydrate(saved);}
else{
project=blankProject();
project.patterns=[{id:project.nextId++,name:'Паттерн 1',beats:8,channels:{}}];
rebuildIdx();
selPatId=project.patterns[0].id;
}
fullRender();renderLib();
})();