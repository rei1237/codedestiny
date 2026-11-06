import { calculateEquationOfTimeMinutes } from '../../../lib/birth-time-context.js';
import { ZIWEI_BIRTH_CLOCK_POLICY } from '../../../../lib/ziwei-birth-clock.js';
import { chartInput } from '../shared/time';
import { FortuneError, type BirthProfile } from '../shared/contracts';

/** UTC stays the astronomical instant. Only the Ziwei calendar clock is corrected.
 * Overseas uses UTC + longitude*4 + EOT, so historical DST cannot be applied twice.
 * The existing daily EOT approximation is preserved and explicitly identified.
 */
export function ziweiRelationshipClock(profile:BirthProfile){
 if(!profile.birthTime)throw new FortuneError('BIRTH_TIME_REQUIRED');
 if(!profile.birthPlace)throw new FortuneError('BIRTH_PLACE_REQUIRED');
 const t=chartInput(profile);
 // 한국 출생은 개인 명반과 같은 정본 보정(경도·과거 서머타임, lib/ziwei-birth-clock.js)을 엔진이 한 번 한다.
 if(profile.birthPlace.timezone==='Asia/Seoul')return {profile,corrected:false,audit:{policy:ZIWEI_BIRTH_CLOCK_POLICY,utc:t.utc.toISOString(),original:profile}};
 const eot=calculateEquationOfTimeMinutes(t.utc.getUTCFullYear(),t.utc.getUTCMonth()+1,t.utc.getUTCDate());
 const solar=new Date(t.utc.getTime()+(t.lon*4+eot)*60000);
 return {profile:{...profile,birthDate:solar.toISOString().slice(0,10),birthTime:solar.toISOString().slice(11,16)},corrected:true,
  audit:{policy:'overseas-true-solar-v1',utc:t.utc.toISOString(),original:profile,longitudeMinutes:t.lon*4,equationOfTimeMinutes:eot,correctedDate:solar.toISOString().slice(0,10),correctedTime:solar.toISOString().slice(11,16),calendar:'korean-lunisolar',precision:'existing-daily-equation-of-time-approximation'}};
}
