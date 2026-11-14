import {buildSukuyoBasicFree} from '../lib/saju-section/report.js';
import {handleSukuyoRoutes} from '../routes/sukuyo.js';
import {flowerBirthInput} from './birth-input.js';
import {TossError} from './policy.js';

export function projectSukuyoPublicReading(natal){
 if(!Number.isFinite(natal?.moonEclipticLongitude)||!Number.isInteger(natal?.index))throw new TossError('SUKUYO_CHART_UNAVAILABLE',503);
 const result=buildSukuyoBasicFree({lunarObj:{moonEclipticLongitude:natal.moonEclipticLongitude,
  year:natal.lunarYear,month:natal.lunarMonth,day:natal.lunarDay,isLeap:natal.isLeapMonth}});
 if(result.mansionIdx!==natal.index)throw new TossError('SUKUYO_CHART_UNAVAILABLE',503);
 const limitations=['천문식 27숙 개인 분석입니다. 상대 정보 없이 궁합을 추정하지 않습니다.'];
 if(natal.birthTimeKnown===false)limitations.push('태어난 시각을 몰라 정오 기준으로 읽었어요. 숙의 경계에 가까운 날에는 실제 본명숙이 달라질 수 있어요.');
 return {stored:false,timeKnown:natal.birthTimeKnown!==false,engineVersion:natal.astronomyVersion,limitations,...result};
}

// The web's public astronomy endpoint owns calendar conversion, unknown-time
// handling and verified natal selection. No profile, order or LLM is involved.
export async function calculateTossSukuyoBasic(body,env,{handler=handleSukuyoRoutes}={}){
 const {personA}=flowerBirthInput({...body?.birth,gender:'OTHER'});
 const input={birthDate:personA.birthDate,birthTime:personA.birthTime||'',birthTimeUnknown:!personA.birthTime,
  calendarType:personA.calendarType==='solar'?'solar':personA.leapMonth?'lunar_leap':'lunar',
  latitude:personA.birthPlace.latitude,longitude:personA.birthPlace.longitude,timezone:personA.birthPlace.timezone,birthPlace:personA.birthPlace.name};
 const request=new Request('https://code-destiny.com/api/sukuyo/astronomy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const response=await handler(request,env);const value=await response.json();
 if(!response.ok||value.ok!==true){const code=/^[A-Z][A-Z0-9_]{0,79}$/.test(value.code||'')?value.code:'SUKUYO_CHART_UNAVAILABLE';throw new TossError(code,response.ok?503:response.status);}
 return projectSukuyoPublicReading(value.astronomy);
}
