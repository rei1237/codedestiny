import {captureLetterDraft} from './letter-draft-bootstrap.mjs';
import {captureTeaDraft} from './tea-draft-bootstrap.mjs';
import {captureSukuyoDraft} from './sukuyo-draft-bootstrap.mjs';

// A session reset clears ordinary sessionStorage. Keep only validated recent
// drafts in a separate slot; only the existing owner checks may expose them.
const key='toss:pending-auth-drafts',maxAge=24*60*60*1000;
export function recallPendingAuthDrafts(storage,location,now=Date.now()){
 try{
  const raw=storage?.getItem(key);if(!raw||raw.length>40000)return {};
  const saved=JSON.parse(raw),age=now-Number(saved?.at);if(!Number.isFinite(age)||age<0||age>=maxAge)return {};
  const value=(entry)=>entry?JSON.stringify(entry):null;
  const source={getItem(name){return name==='toss:letter-draft'?value(saved.letter):name==='cd_tea_question_draft'?value(saved.tea?.draft):name==='cd_tea_draw_attempt'?value(saved.tea?.draw):name==='cd_toss_sukuyo_draft'?value(saved.sukuyo):null;}};
  return {letter:captureLetterDraft(source,location,now),tea:captureTeaDraft(source,location,now),sukuyo:captureSukuyoDraft(source,now)};
 }catch{return {};}
}
export function rememberPendingAuthDrafts(storage,drafts,now=Date.now()){
 try{if(!drafts?.letter&&!drafts?.tea&&!drafts?.sukuyo)return;const raw=JSON.stringify({at:now,letter:drafts.letter||null,tea:drafts.tea||null,sukuyo:drafts.sukuyo||null});if(raw.length<=40000)storage?.setItem(key,raw);}catch{/* Optional local draft. */}
}
export function clearPendingAuthDrafts(storage,drafts,user){
 const owner=String(user?.id||user?.userId||user?._id||user?.uid||'');if(!owner)return;
 const owners=[drafts?.letter?.owner,drafts?.tea?.draft?.owner,drafts?.sukuyo?.owner].filter(Boolean);
 if(owners.every(value=>value==='guest'||value===owner))try{storage?.removeItem(key);}catch{/* Optional local draft. */}
}
