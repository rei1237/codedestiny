// Captured with calculateHat and the checked-in Swiss ephemeris on a blocked network.
import cases from './hat-cases.json' with {type:'json'};
export function privateHat(profiles,body){
 const id=body?.profileId;
 const error=(code,message,status)=>Response.json({code,message},{status});
 if(typeof id!=='string'||!id.trim()||id.length>120)return error('FREE_PROFILE_REQUIRED','출생 프로필을 선택해 주세요.',400);
 const profile=profiles.find(row=>row.profileId===id);
 if(!profile)return error('PROFILE_NOT_FOUND','내 프로필 목록에서 다시 선택해 주세요.',404);
 const birth=profile.birth,place=profile.location,pad=n=>String(n).padStart(2,'0');
 const birthTime=birth&&!birth.timeUnknown&&Number.isInteger(birth.hour)&&Number.isInteger(birth.minute)?pad(birth.hour)+':'+pad(birth.minute):undefined;
 const sample=cases.find(({input})=>birth&&place&&input.birthDate===[birth.year,pad(birth.month),pad(birth.day)].join('-')&&
   input.birthTime===birthTime&&input.calendarType===(birth.calType==='solar'?'solar':'lunar')&&input.leapMonth===(birth.calType==='lunar_leap')&&
   profile.gender===(input.gender==='female'?'F':'M')&&place.tz===input.birthPlace.timezone&&place.lat===input.birthPlace.latitude&&place.lng===input.birthPlace.longitude);
 if(!sample)return error('MOCK_HAT_INPUT_UNAVAILABLE','모의 배정은 1990년 1월 1일 양력, 서울 출생 여성의 시간 미상 또는 오전 8시 35분 프로필로 확인해 주세요.',422);
 return Response.json({ok:true,result:sample.result});
}
