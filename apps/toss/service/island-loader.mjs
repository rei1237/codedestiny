// Reuse the complete standalone game. Only its transport, device storage and back button are bridged.
const guardians=['ming','siblings','spouse','children','wealth','health','travel','friends','career','home','fortune','parents'];
const neo='/images/master-profiles/neo-strategy-portrait.webp';
export const islandArtwork=[
 '/images/service-introductions/destiny-island-640.webp','/images/fortune-tea-house/flower-pig-single-a.webp',
 '/images/destiny-island/consult-reading.webp','/images/destiny-island/exploration-map-v3.webp',
 '/images/novel/pig-expressions.webp',neo,...guardians.map(slug=>'/images/destiny-island/guardians/'+slug+'-v1.webp'),
];
export function islandDocument(source){
 const bridge=`
 const initial=__TOSS_ISLAND_STATE__;
 const localStorage={getItem:(key)=>initial[key]||null,setItem(key,value){
   if(key!==GKEY&&key!==BKEY)return;
   initial[key]=String(value);
   parent.postMessage({type:'island-save',key,value:String(value)},'*');
 }};
 const sessionStorage={getItem:()=>null};
 const pending=new Map();
 function fetch(url,options){
   if(!url.endsWith('/api/ziwei-island/blueprint'))return Promise.reject(Error('Unknown island route'));
   const id=crypto.randomUUID();
   return new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{pending.delete(id);reject(Error('timeout'));},24000);
     pending.set(id,{resolve,reject,timer});
     parent.postMessage({type:'island-blueprint',id,input:JSON.parse(options.body)},'*');
   });
 }
 addEventListener('message',event=>{
   if(event.source!==parent)return;
   const cmd=event.data;
   if(cmd?.type==='island-back'){
     if(document.getElementById('renameIsland')?.open){document.getElementById('renameIsland').close();return;}
     if(openedSheet){closeSheet();return;}
     if($('dlgWrap').classList.contains('on')){dlgClose();return;}
     if($('scrForm').classList.contains('on')||$('scrIsland').classList.contains('on')){renderGatePicker();showScreen('scrGate');return;}
     parent.postMessage({type:'island-exit'},'*');return;
   }
   if(cmd?.type!=='island-result')return;
   const row=pending.get(cmd.id);if(!row)return;
   clearTimeout(row.timer);pending.delete(cmd.id);
   if(cmd.ok)row.resolve({ok:true,json:async()=>cmd.result});else row.reject(Error('blueprint unavailable'));
 });
 `;
 const boundaries=['"use strict";','var PROD=','var NEO_AV=','function loadGame()','return fetch(API_BASE+"/api/ziwei-island/blueprint"'];
 for(const marker of boundaries)if(!source.includes(marker))throw Error('Original island boundary changed: '+marker);
 return source.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src __TOSS_ISLAND_ORIGIN__ data:; media-src https://music.code-destiny.com https://assets.code-destiny.com; form-action 'none'">`)
  .replace(/<link rel="(?:icon|preconnect)"[^>]+>/g,'').replace(/@font-face\{[^}]*\}/g,'')
  .replace('"use strict";','"use strict";\n'+bridge)
  .replace(/var PROD=[^\n]+/,'var PROD=true;')
  .replace(/var NEO_AV=[\s\S]*?;/,'var NEO_AV="'+neo+'";')
  .replace(/<img src="https:\/\/assets\.code-destiny\.com\/cdn-cgi\/image\/[^"]+Photoroom.webp"/g,'<img src="'+neo+'"')
  .replaceAll('/images/service-introductions/destiny-island-960.webp','/images/service-introductions/destiny-island-640.webp')
  .replace('birthTimeUnknown:!birthTime,','birthTimeUnknown:p.birthTimeUnknown===true||!birthTime,')
  .replace('isLeapMonth:cal==="lunar_leap",','isLeapMonth:p.isLeapMonth===true||cal==="lunar_leap",')
  .replace(/var v=prompt\([^\n]+\n\s*if\(v!=null\)\{([^\n]+)\}/,
   `const dlg=$('renameIsland'),field=dlg.querySelector('input');field.value=G.name||'';dlg.showModal();
    dlg.querySelector('form').onsubmit=function(e){e.preventDefault();var v=field.value;$1;dlg.close();};`)
  .replace('<div class="toast" id="toast"',`<dialog id="renameIsland"><form><label>새 섬 이름<input maxlength="16" required></label><button>저장</button><button type="button" onclick="this.closest('dialog').close()">취소</button></form></dialog><div class="toast" id="toast"`);
}
