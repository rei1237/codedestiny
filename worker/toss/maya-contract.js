import {calculateMayaCalendar,isValidGregorianDate} from '../../src/lib/maya-calendar.ts';
import {generateMayaReadingPrompt,MAYA_PROMPT_TOPICS} from '../../src/lib/maya-prompt-generator.ts';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {hash} from './crypto.js';
import {TossError} from './policy.js';

const FEATURE_KEY='maya-prompt-generator';
const REQUEST_ID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const DATE=/^(\d{4})-(\d{2})-(\d{2})$/;

function text(value,max){
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new TossError('MAYA_INPUT_INVALID',400);
  return value.trim();
}

/** Keep only the user's input; never accept a precomputed prompt or price. */
export function normalizeMayaInput(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.requestId!=='string'||!REQUEST_ID.test(input.requestId))throw new TossError('MAYA_INPUT_INVALID',400);
  const {year,month,day}=input;
  if(!Number.isInteger(year)||year>9999||!isValidGregorianDate(year,month,day))throw new TossError('MAYA_INPUT_INVALID',400);
  const name=text(input.name??'',120),birthDate=text(input.birthDate??'',10),question=text(input.question??'',3000),topic=text(input.topic,60);
  if(!MAYA_PROMPT_TOPICS.includes(topic))throw new TossError('MAYA_INPUT_INVALID',400);
  if(birthDate){const match=DATE.exec(birthDate);if(!match||!isValidGregorianDate(Number(match[1]),Number(match[2]),Number(match[3])))throw new TossError('MAYA_INPUT_INVALID',400);}
  return {requestId:input.requestId.toLowerCase(),year,month,day,name,birthDate,topic,question};
}

export async function mayaContract(input){
  const normalized=normalizeMayaInput(input),priced=getBillingFeaturePricing({featureKey:FEATURE_KEY});
  if(!priced.ok||priced.pricing.billingType!=='per_use')throw new TossError('PRICE_NOT_FOUND',503);
  const inputHash=await hash(JSON.stringify(normalized));
  return {input:normalized,contract:{requestId:normalized.requestId,resultId:'maya_'+await hash(JSON.stringify(['maya',normalized.requestId])),featureKey:FEATURE_KEY,inputHash,pricing:priced.pricing}};
}

/** Generate from validated input and the original calendar, after payment authorization. */
export function buildMayaPrompt(input){
  const value=normalizeMayaInput(input),source=calculateMayaCalendar(value.year,value.month,value.day);
  return generateMayaReadingPrompt({name:value.name,birthDate:value.birthDate,topic:value.topic,question:value.question,
    targetDate:source.gregorian.labelKo.replace(` ${source.gregorian.weekdayKo}`,''),weekdayKo:source.gregorian.weekdayKo,
    longCount:source.longCount.label,tzolkinNumber:source.tzolkin.number,tzolkinSign:source.tzolkin.sign,tzolkinKo:source.tzolkin.ko,
    tzolkinKeywords:source.tzolkin.keywords,haabDay:source.haab.day,haabMonth:source.haab.month,haabKo:source.haab.ko,haabKeywords:source.haab.keywords});
}
