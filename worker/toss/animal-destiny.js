import {calculateNatalSaju} from '../../lib/korean-calendar/natal.js';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {buildAnimalDestinyReading} from '../lib/saju-section/animal-destiny.js';
import {createAnimalDestinyRuntime} from '../lib/saju-section/runtime.generated.mjs';
import {TossError} from './policy.js';
const {normalizeStem,normalizeBranch,getTwelveStagesForPillars,getAnimalBySajuResult,getAnimalDisplayData,calculateAnimalCompatibility,buildCompatibilityStageEvidence}=createAnimalDestinyRuntime();

function inputOf(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!['name','birthDate','birthTime','gender','calendarType','lunarLeap'].includes(key)))throw new TossError('INVALID_INPUT',400);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw.birthDate)||!['male','female','unknown'].includes(raw.gender)||!['solar','lunar'].includes(raw.calendarType||'solar')||(raw.birthTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.birthTime))||(raw.name!==undefined&&(typeof raw.name!=='string'||raw.name.length>40))||(raw.lunarLeap!==undefined&&typeof raw.lunarLeap!=='boolean'))throw new TossError('INVALID_INPUT',400);
 return {name:raw.name||'',birthDate:raw.birthDate,birthTime:raw.birthTime||'',gender:raw.gender,calendarType:raw.calendarType||'solar',lunarLeap:raw.calendarType==='lunar'&&raw.lunarLeap===true};
}
function chart(input){
 const timeUnknown=!input.birthTime,calendarType=input.calendarType==='lunar'?(input.lunarLeap?'lunar_leap':'lunar'):'solar';
 // Same Seoul-default, original-calendar contract as buildAnimalDestinyHtml.
 const natal=calculateNatalSaju({birthDate:input.birthDate,birthTime:input.birthTime||undefined,calendarType,isLeapMonth:input.lunarLeap,birthPlace:undefined},{allowMissingLongitude:false});
 const pillar=value=>{if(!value)return null;const stem=normalizeStem(value[0]),branch=normalizeBranch(value[1]);return {stem,branch,ganji:stem+branch};};
 const pillars=Object.fromEntries(Object.entries(natal.pillars).map(([key,value])=>[key,pillar(value)]));
 const sajuResult={dayStem:pillars.day.stem,pillars,timeUnknown,yearPillar:pillars.year,monthPillar:pillars.month,dayPillar:pillars.day,hourPillar:pillars.hour};
 const {animalId}=getAnimalBySajuResult(sajuResult),animal=getAnimalDisplayData(animalId);
 if(!animal)throw new TossError('ANIMAL_READING_UNAVAILABLE',503);
 return {animal,sajuResult,twelveStages:getTwelveStagesForPillars(sajuResult),timeUnknown,natalPillars:natal.pillars};
}
export function tossAnimalDestiny(body){
 if(!isFreeFortuneFeatureKey('animal-destiny-unlock'))throw new TossError('SECTION_NOT_PUBLIC',403);
 if(!body||typeof body!=='object'||Object.keys(body).some(key=>!['input','partner'].includes(key)))throw new TossError('INVALID_INPUT',400);
 const input=inputOf(body.input),partnerInput=body.partner===undefined?null:inputOf(body.partner);
 let mine,other;
 try{mine=chart(input);if(partnerInput)other=chart(partnerInput);}catch(error){if(error instanceof TossError)throw error;throw new TossError('INVALID_INPUT',400);}
 const reading=buildAnimalDestinyReading(mine.natalPillars,mine.timeUnknown);
 const partner=other?{input:partnerInput,animalId:other.animal.id,animalData:other.animal,primaryStage:other.twelveStages.primary||null,...calculateAnimalCompatibility(mine.animal.id,other.animal.id),stageEvidence:buildCompatibilityStageEvidence(mine.twelveStages.primary,other.twelveStages.primary)}:null;
 return {ok:true,accessSource:'public',stored:false,featureKey:'animal-destiny-unlock',animal:mine.animal,sajuResult:mine.sajuResult,twelveStages:mine.twelveStages,timeUnknown:mine.timeUnknown,reading,partner};
}
