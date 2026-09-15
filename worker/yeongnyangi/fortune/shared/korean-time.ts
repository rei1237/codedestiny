import {chartInput} from './time';
import {FortuneError,type BirthProfile} from './contracts';
// Calendar core uses fixed KST. Normalize historic Korean wall clocks once, before
// applying longitude correction to the hour pillar. Never reinterpret overseas births.
export function koreanCivilProfile(profile:BirthProfile) {
 if(profile.birthPlace&&profile.birthPlace.timezone!=='Asia/Seoul')throw new FortuneError('SAJU_KST_REQUIRED');
 if(!profile.birthTime)return {profile,offsetHours:null,adjustmentMinutes:0};
 const t=chartInput({...profile,birthPlace:profile.birthPlace||{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}});
 const kst=new Date(t.utc.getTime()+9*3600000);
 return {profile:{...profile,birthDate:kst.toISOString().slice(0,10),birthTime:kst.toISOString().slice(11,16)},offsetHours:t.timezone,adjustmentMinutes:(9-t.timezone)*60};
}
