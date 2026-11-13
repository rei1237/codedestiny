// Preserve only a recent letter draft across the Toss shell's auth cleanup.
// An account draft may be restored only after the server confirms the same user.
const key='toss:letter-draft',maxAge=30*60*1000;
function guestReturn(location,persona='yeoni'){
 try{
  let url=new URL(location.href);
  if(/^\/login\/?$/.test(url.pathname)){
   const next=url.searchParams.get('next');
   if(!next||!next.startsWith('/')||next.startsWith('//'))return false;
   const target=new URL(next,url.origin);if(target.origin!==url.origin)return false;url=target;
  }
  return /^\/fortune-tea-house\/?$/.test(url.pathname)&&url.searchParams.get('counsel')==='letter'&&(url.searchParams.get('persona')||'yeoni')===persona&&url.searchParams.get('restoreDraft')==='1';
 }catch{return false;}
}
export function captureLetterDraft(storage,location,now=Date.now()){
 try{
  const saved=JSON.parse(storage.getItem(key)||'null'),age=now-Number(saved?.at);
  if(!saved||typeof saved.owner!=='string'||!saved.owner.trim()||typeof saved.question!=='string'||!saved.question.trim()||saved.question.length>300||!Number.isFinite(age)||age<0||age>=maxAge)return null;
  if(saved.owner==='guest'&&!guestReturn(location,saved.persona))return null;
  return {...(saved.persona==='neo'?{persona:'neo'}:{}),owner:saved.owner,question:saved.question,at:Number(saved.at)};
 }catch{return null;}
}
export function restoreLetterDraft(storage,draft,{location,user,now=Date.now()}={}){
 if(!draft||!Number.isFinite(draft.at)||now-draft.at<0||now-draft.at>=maxAge)return;
 const id=String(user?.id||user?.userId||user?._id||user?.uid||'');
 if(draft.owner==='guest'?!guestReturn(location,draft.persona):!id||draft.owner!==id)return;
 try{if(!storage.getItem(key))storage.setItem(key,JSON.stringify(draft));}catch{/* Draft storage is optional. */}
}
