import {validateBirth} from './preparation.js';
import {TossError} from './policy.js';
import {matchDestinyFlower,matchAstrologyFlower,matchJamidusuFlower,matchSukuyoFlower} from '../lib/destiny-flower-engine.js';

export const FLOWER_SOURCES=Object.freeze(['saju','astrology','jamidusu','sukuyo']);
const matchers={saju:matchDestinyFlower,astrology:matchAstrologyFlower,jamidusu:matchJamidusuFlower,sukuyo:matchSukuyoFlower};
const factMap=context=>Object.fromEntries(context.facts.map(f=>[f.label,f.value]));
const pad=n=>String(n).padStart(2,'0');

export function flowerBirthInput(raw){
  const b=validateBirth(raw),d=b.date;
  return {personA:{birthDate:`${d.year}-${pad(d.month)}-${pad(d.day)}`,
    ...(!d.timeUnknown?{birthTime:`${pad(d.hour)}:${pad(d.minute)}`} : {}),
    ...(b.gender==='M'?{gender:'male'}:b.gender==='F'?{gender:'female'}:{}),
    calendarType:d.calType==='solar'?'solar':'lunar',leapMonth:d.calType==='lunar_leap',
    birthPlace:{name:b.location.label,latitude:b.location.lat,longitude:b.location.lng,timezone:b.location.tz}},
    readingMode:'personal',question:''};
}

function requireFact(value){if(value===undefined||value===null||value==='')throw new TossError('FLOWER_CHART_UNAVAILABLE',503);return value;}
function flowerProfile(source,input,context){
  const f=factMap(context),p=input.personA;
  // The original matcher derives season/phase from birth. Never let its noon default become a supplied time.
  if(!p.birthTime)throw new TossError('BIRTH_TIME_REQUIRED',400);
  const [year,month,day]=p.birthDate.split('-').map(Number),[hour,minute]=p.birthTime.split(':').map(Number);
  const profile={birth:{year,month,day,hour,minute}};
  if(source==='saju'){
    const weights=requireFact(f.fiveElements?.ratios);
    if(typeof weights!=='object'||!Object.values(weights).some(v=>Number.isFinite(v)&&v>0))throw new TossError('FLOWER_CHART_UNAVAILABLE',503);
    profile.elementWeights=weights;profile.saju={dayMaster:requireFact(f.dayMaster)};
  }else if(source==='astrology'){
    profile.astrology={sunSign:requireFact(f.planets?.Sun?.signKo),moonSign:requireFact(f.planets?.Moon?.signKo),risingSign:requireFact(f.ascendant?.signKo)};
  }else if(source==='jamidusu'){
    const palaces=requireFact(f.palaces);
    if(!Array.isArray(palaces)||!palaces.some(p=>p.mainStars?.length))throw new TossError('FLOWER_CHART_UNAVAILABLE',503);
    profile.ziweiChart={palacesByIndex:palaces.map(p=>p.name),stars:palaces.map(p=>({main:p.mainStars})),
      palaceStarData:palaces.map(p=>({stars:[...(p.mainStars||[]),...(p.assistantStars||[]),...(p.maleficStars||[])].map(name=>({name,brightness:p.brightness?.[name]}))}))};
  }else{
    const lunar=requireFact(f.personA);
    if(!Number.isInteger(lunar.index)||lunar.index<0||lunar.index>26)throw new TossError('FLOWER_CHART_UNAVAILABLE',503);
    // Prefer the existing name; numeric index is the matcher's one-based contract.
    profile.sukuyo={mansion:requireFact(lunar.mansion),mansionIndex:lunar.index+1};
  }
  return profile;
}

// Dependency injection is for offline engine parity tests, never a client-controlled bypass.
export async function matchTossFlowers(body,env,engines){
  const raw=flowerBirthInput(body?.birth);
  const requested=body?.sources??FLOWER_SOURCES;
  if(!Array.isArray(requested)||!requested.length||requested.some(s=>!FLOWER_SOURCES.includes(s)))throw new TossError('FLOWER_SOURCE_INVALID',400);
  const sources={};
  for(const source of new Set(requested)){
    try{
      const id=source==='jamidusu'?'ziwei':source,engine=engines[id];
      // Validation owns lunar conversion, historical clock handling and missing input rules.
      const input=engine.validateInput(raw);
      if(!input.personA?.birthTime)throw new TossError('BIRTH_TIME_REQUIRED',400);
      const context=await engine.calculate(input,id==='sukuyo'?env:{runtimeEnv:env});
      const matched=matchers[source](flowerProfile(source,input,context));
      if(!matched?.flower)throw new TossError('FLOWER_CHART_UNAVAILABLE',503);
      // Do not return the matcher's full profile, chart, birth or internal ranking payload.
      sources[source]={state:'ready',flower:matched.flower,narrative:matched.narrative,
        limitations:context.limitations,engineVersion:context.engineVersion,algorithmVersion:matched.algorithm?.version};
    }catch(error){
      const inputCodes=['BIRTH_TIME_REQUIRED','INVALID_BIRTH','INVALID_BIRTH_DATE','GENDER_REQUIRED','SAJU_KST_REQUIRED','HOUSE_SYSTEM_UNAVAILABLE'];
      sources[source]={state:'unavailable',code:inputCodes.includes(error?.code)?error.code:'FLOWER_CHART_UNAVAILABLE'};
    }
  }
  return {sources,stored:false};
}
