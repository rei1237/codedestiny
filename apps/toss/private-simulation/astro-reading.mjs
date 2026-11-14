import example from './astro-reading-example.json' with {type:'json'};
import {isTossAstroSection} from '../../../lib/fortune/toss-astro-sections.mjs';
export const astroExampleBirth=example.birth;
const matches=(value,expected,keys)=>keys.every(key=>value?.[key]===expected[key]);
export function privateAstroReading(body,kind='section'){
 const birth=body?.birth;
 if(!matches(birth?.date,example.birth.date,['year','month','day','hour','minute','timeUnknown','calType'])||!matches(birth?.location,example.birth.location,['lat','lng','tz']))return Response.json({error:'ASTRO_EXAMPLE_REQUIRED',message:'이 출생정보는 비공개 모의 상담에서 지원하지 않아요. 모의 예시 입력하기를 눌러 검증된 예시로 확인해 주세요.'},{status:422});
 if(kind==='chart')return example.chart?Response.json(example.chart):Response.json({error:'PRIVATE_SIMULATION_UNAVAILABLE'},{status:404});
 if(!isTossAstroSection(body.featureKey)||!Object.hasOwn(example.sections,body.featureKey))return Response.json({error:'SECTION_NOT_PUBLIC'},{status:404});
 return Response.json(example.sections[body.featureKey]);
}
