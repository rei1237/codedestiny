// Preserve a recent tea input across auth cleanup without crossing accounts.
const draftKey='cd_tea_question_draft',drawKey='cd_tea_draw_attempt',maxAge=24*60*60*1000;
function guestReturn(location){
 try{let url=new URL(location.href);if(/^\/login\/?$/.test(url.pathname)){const next=url.searchParams.get('next');if(!next||!next.startsWith('/')||next.startsWith('//'))return false;const target=new URL(next,url.origin);if(target.origin!==url.origin)return false;url=target;}return /^\/fortune-tea-house\/?$/.test(url.pathname)&&url.searchParams.get('restoreTeaDraft')==='1';}catch{return false;}
}
export function captureTeaDraft(storage,location,now=Date.now()){
 try{const raw=storage.getItem(draftKey);if(!raw||raw.length>20000)return null;const saved=JSON.parse(raw),age=now-Number(saved?.at);if(!saved||typeof saved.owner!=='string'||!saved.owner.trim()||typeof saved.cupId!=='string'||!saved.cupId||!saved.input||typeof saved.input!=='object'||Array.isArray(saved.input)||typeof saved.input.question!=='string'||!saved.input.question.trim()||!Number.isFinite(age)||age<0||age>=maxAge)return null;if(saved.owner==='guest'&&!guestReturn(location))return null;
  let draw=null;if(saved.owner!=='guest'){let candidate,identity;try{candidate=JSON.parse(storage.getItem(drawKey)||'null');identity=JSON.parse(candidate?.identity||'null');}catch{}if(Array.isArray(identity)&&identity[0]===saved.owner&&typeof candidate?.attemptId==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(candidate.attemptId))draw={identity:candidate.identity,attemptId:candidate.attemptId};}
  return {draft:{owner:saved.owner,at:Number(saved.at),cupId:saved.cupId,input:saved.input},draw};
 }catch{return null;}
}
export function restoreTeaDraft(storage,snapshot,{location,user,now=Date.now()}={}){
 const draft=snapshot?.draft,age=now-Number(draft?.at);if(!draft||!Number.isFinite(age)||age<0||age>=maxAge)return;
 const id=String(user?.id||user?.userId||user?._id||user?.uid||'');if(draft.owner==='guest'?!guestReturn(location):!id||id!==draft.owner)return;
 try{if(!storage.getItem(draftKey)){storage.setItem(draftKey,JSON.stringify(draft));if(snapshot.draw&&!storage.getItem(drawKey))storage.setItem(drawKey,JSON.stringify(snapshot.draw));}}catch{/* Optional local draft. */}
}
