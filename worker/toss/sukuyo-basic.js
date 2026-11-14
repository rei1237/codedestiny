import {solarToLunar} from '../../lib/korean-calendar/index.js';
import {buildSukuyoBasicFree} from '../lib/saju-section/report.js';
import {flowerBirthInput} from './birth-input.js';
import {TossError} from './policy.js';

// The domain engine owns calendar conversion and Swiss astronomy. Only the
// original free dashboard is returned; paid Sukuyo renderers remain gated.
export async function calculateTossSukuyoBasic(body,env,engine){
  let input,context;
  try{
    input=engine.validateInput(flowerBirthInput(body?.birth));
    if(!input.personA?.birthTime)throw new TossError('BIRTH_TIME_REQUIRED',400);
    context=await engine.calculate(input,{runtimeEnv:env});
  }catch(error){
    if(!(error instanceof TossError)&&(error?.status===401||error?.status===403)){
      const code=typeof error.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:error.status===401?'LOGIN_REQUIRED':'ACCESS_DENIED';
      throw new TossError(code,error.status);
    }
    throw error;
  }
  const natal=context.facts.find(fact=>fact.label==='personA')?.value;
  if(!Number.isFinite(natal?.moonEclipticLongitude)||!Number.isInteger(natal?.index))throw new TossError('SUKUYO_CHART_UNAVAILABLE',503);
  const [year,month,day]=input.personA.birthDate.split('-').map(Number);
  const lunar=solarToLunar(year,month,day);
  if(!lunar)throw new TossError('SUKUYO_CHART_UNAVAILABLE',503);
  const result=buildSukuyoBasicFree({lunarObj:{moonEclipticLongitude:natal.moonEclipticLongitude,
    year:lunar.lunarYear,month:lunar.lunarMonth,day:lunar.lunarDay,isLeap:lunar.isLeapMonth}});
  if(result.mansionIdx!==natal.index)throw new TossError('SUKUYO_CHART_UNAVAILABLE',503);
  return {stored:false,engineVersion:context.engineVersion,limitations:context.limitations,...result};
}
