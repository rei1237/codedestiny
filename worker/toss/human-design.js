import {calculateHumanDesignChart,resolveBirthMoment} from '../lib/human-design-ephemeris.js';
import {TossError} from './policy.js';

// The chart is free in the original service. Personal guides and paid reports
// are separate products and are deliberately not produced by this endpoint.
export function validateTossHumanDesignBirth(body){
  const birth=body?.birth;
  if(!birth||typeof birth.birthDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(birth.birthDate)
    ||typeof birth.birthTime!=='string'||!/^\d{2}:\d{2}$/.test(birth.birthTime)
    ||typeof birth.timezone!=='string'||!birth.timezone.trim()||birth.timezone.length>80
    ||!['solar','lunar','lunar-leap'].includes(birth.calendar))throw new TossError('BIRTH_INVALID',400);
  const [year,month,day]=birth.birthDate.split('-').map(Number),[hour,minute]=birth.birthTime.split(':').map(Number);
  if(year<1||month<1||month>12||day<1||day>31||hour>23||minute>59)throw new TossError('BIRTH_INVALID',400);
  if(birth.calendar==='solar'){
    const date=new Date(0);date.setUTCFullYear(year,month-1,day);
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new TossError('BIRTH_INVALID',400);
  }
  const input={birthDate:birth.birthDate,birthTime:birth.birthTime,timezone:birth.timezone.trim(),calendar:birth.calendar};
  const fixedOffset=/^(?:UTC|GMT)?\s*[+-](\d{1,2})(?::?(\d{2}))?$/i.exec(input.timezone);
  if(fixedOffset){const hours=Number(fixedOffset[1]),minutes=Number(fixedOffset[2]||0);if(hours>14||minutes>59||hours===14&&minutes!==0)throw new TossError('BIRTH_INVALID',400);}
  try{resolveBirthMoment(input);}catch{throw new TossError('BIRTH_INVALID',400);}
  return input;
}
export async function calculateTossHumanDesign(body,env,calculate=calculateHumanDesignChart){
  const input=validateTossHumanDesignBirth(body);
  let chart;
  try{chart=await calculate(env,input,{requestUrl:'https://code-destiny.com/api/toss/human-design/chart'});}
  catch(error){
    if(error?.status===401||error?.status===403)throw new TossError(typeof error.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:error.status===401?'LOGIN_REQUIRED':'ACCESS_DENIED',error.status);
    throw new TossError('HUMAN_DESIGN_UNAVAILABLE',503);
  }
  if(!chart||!Array.isArray(chart.activations)||chart.activations.length!==26||!Array.isArray(chart.channels)
    ||!Array.isArray(chart.definedCenters)||!Array.isArray(chart.undefinedCenters)||!Array.isArray(chart.activeGates)
    ||!chart.layers||typeof chart.type!=='string'||typeof chart.authority!=='string')throw new TossError('HUMAN_DESIGN_UNAVAILABLE',503);
  return {stored:false,chart:{...chart,birthInput:null,moments:null}};
}
