// The ordinary service-shell auth reset must not discard an unfinished birth form.
// This validates the existing feature-session-draft envelope; UI reads remain account + route scoped.
export function profileEntryStoredEnvelope(key,raw,now=Date.now()){
 try{
  if(typeof raw!=='string'||raw.length>6000)return null;
  const row=JSON.parse(raw),owner=row?.profileId,age=now-Number(row?.savedAt),value=row?.value;
  if(row?.version!==1||row.featureKey!=='toss-profile-entry'||typeof owner!=='string'||!owner.startsWith('account:')||owner.length<=8||owner.length>180||!/^\/yeongnyangi\/fortune\/?(?:\?|$)/.test(row.route)||!Number.isFinite(age)||age<0||age>=86400000||!value||typeof value!=='object'||Array.isArray(value))return null;
  if(key!==['cd','feature-draft','v1','toss-profile-entry',encodeURIComponent(owner),encodeURIComponent(row.route)].join(':'))return null;
  for(const [field,max] of [['name',40],['date',10],['time',5],['gender',1],['calendar',10],['place',120]])if(typeof value[field]!=='string'||value[field].length>max)return null;
  if(!['F','M'].includes(value.gender)||!['solar','lunar','lunar_leap'].includes(value.calendar)||typeof value.unknown!=='boolean'||!Number.isInteger(value.step)||value.step<0||value.step>3)return null;
  return row;
 }catch{return null;}
}
