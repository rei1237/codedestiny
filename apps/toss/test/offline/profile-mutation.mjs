// Used only by the two isolated test APIs. The caller has already selected the authenticated account.
export function saveFixtureProfile(state,body,editing,save) {
  const profile=body?.profile,birth=profile?.birth,id=profile?.profileId;
  const error=(code,status)=>Response.json({error:code},{status});
  if(typeof id!=='string'||!id||!Number.isInteger(birth?.year))return error('BIRTH_INVALID',400);
  const index=state.profiles.findIndex(item=>item.profileId===id);
  const existing=state.profiles[index];
  if(!editing&&existing)return Response.json({ok:true,profile:existing});
  if(editing&&!existing)return error('PROFILE_NOT_FOUND',404);
  const unknown=birth.timeUnknown===true,pad=n=>String(n).padStart(2,'0');
  const month=birth.month??1,day=birth.day??1,calendar=birth.calType||'solar';
  const hour=unknown?null:birth.hour??8,minute=unknown?null:birth.minute??35;
  const fields={name:profile.name||'테스트 프로필',gender:profile.gender||'F',
    birthDate:[birth.year,pad(month),pad(day)].join('-'),birthTime:unknown?'':pad(hour)+':'+pad(minute),
    timeUnknown:unknown,calendarType:calendar,birth:{year:birth.year,month,day,hour,minute,timeUnknown:unknown,calType:calendar},
    location:profile.location||{label:'',lat:37.5,lng:127,tz:'Asia/Seoul'}};
  if(editing&&body.expectedUpdatedAt!==(existing.updatedAt??null)){
    const identical=Object.entries(fields).every(([key,value])=>JSON.stringify(existing[key])===JSON.stringify(value));
    return identical?Response.json({ok:true,profile:existing}):error('PROFILE_CHANGED',409);
  }
  const next={id,profileId:id,...fields,updatedAt:new Date(Math.max(Date.now(),Date.parse(existing?.updatedAt)||0)+1).toISOString()};
  if(editing)state.profiles[index]=next;else state.profiles.push(next);
  if(save())return Response.json({ok:true,profile:next});
  if(editing)state.profiles[index]=existing;else state.profiles.pop();
  return error('MOCK_STORAGE_UNAVAILABLE',503);
}
