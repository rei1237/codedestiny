// Preserve a recent, account-owned form across the shell's authentication reset.
const key='cd_toss_sukuyo_draft',maxAge=24*60*60*1000;
const ownerOf=user=>String(user?.id||user?.userId||user?._id||user?.uid||'');
function person(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const text=(name,max)=>typeof value[name]==='string'?value[name].slice(0,max):'';
 return {name:text('name',80),gender:text('gender',40),birthDate:text('birthDate',10),birthTime:text('birthTime',5),birthTimeUnknown:value.birthTimeUnknown===true,calendarType:value.calendarType==='lunar'?'lunar':'solar',isLeapMonth:value.isLeapMonth===true};
}
export function captureSukuyoDraft(storage,now=Date.now()){
 try{
  const raw=storage?.getItem(key);if(!raw||raw.length>12000)return null;
  const draft=JSON.parse(raw),age=now-Number(draft?.at);
  if(typeof draft?.owner!=='string'||!draft.owner||draft.owner==='guest'||!Number.isFinite(age)||age<0||age>=maxAge)return null;
  const personA=person(draft.personA),personB=person(draft.personB);if(!personA||!personB)return null;
  return {owner:draft.owner,at:Number(draft.at),personA,personB};
 }catch{return null;}
}
export function readSukuyoDraft(storage,user,now=Date.now()){
 const draft=captureSukuyoDraft(storage,now);return draft&&ownerOf(user)===draft.owner?draft:null;
}
export function saveSukuyoDraft(storage,user,personA,personB,now=Date.now()){
 const owner=ownerOf(user),a=person(personA),b=person(personB);if(!owner||!a||!b)return;
 try{storage?.setItem(key,JSON.stringify({owner,at:now,personA:a,personB:b}));}catch{/* Optional local draft. */}
}
export function clearSukuyoDraft(storage,user){
 try{if(readSukuyoDraft(storage,user))storage?.removeItem(key);}catch{/* Optional local draft. */}
}
export function restoreSukuyoDraft(storage,draft,{user,now=Date.now()}={}){
 const age=now-Number(draft?.at),owner=ownerOf(user);
 if(!owner||owner!==draft?.owner||!Number.isFinite(age)||age<0||age>=maxAge)return;
 try{if(!storage?.getItem(key))storage?.setItem(key,JSON.stringify(draft));}catch{/* Optional local draft. */}
}
