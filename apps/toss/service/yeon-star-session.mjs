import {snapshotKey} from '../../../lib/guided-flow/step-controller.mjs';
export const starHugScope=owner=>'toss:yeon-star-hug:'+String(owner||'guest').trim().toLowerCase();
export function clearStarHugSession(storage,owner){
 if(!owner)return;
 const scope=starHugScope(owner);
 storage.removeItem(scope+':result');storage.removeItem(snapshotKey(scope));
}
export function isStarHugSession(key,raw){
 if(!raw||raw.length>64000)return false;
 if(!/^(?:cd:toss:yeon-star-hug:[^:]{1,128}:guided:v1|toss:yeon-star-hug:[^:]{1,128}:result)$/.test(key))return false;
 try{
  const entry=JSON.parse(raw);
  return entry?.version===1&&(key.endsWith(':result')?Boolean(entry.reading?.displayCard&&entry.consultation?.sign):Boolean(entry.answers&&typeof entry.answers==='object'&&!Array.isArray(entry.answers)));
 }catch{return false;}
}
