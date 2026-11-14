import example from './astro-synastry-example.json' with {type:'json'};
const match=(birth,expected)=>['year','month','day','hour','minute','timeUnknown','calType'].every(key=>birth?.date?.[key]===expected.date[key])&&['lat','lng','tz'].every(key=>birth?.location?.[key]===expected.location[key]);
export function privateAstroSynastry(body){
 if(body===undefined)return Response.json(example.catalog);
 const key=body.featureKey;if(!Object.hasOwn(example.results,key))return Response.json({error:'SECTION_NOT_PUBLIC'},{status:404});
 const valid=match(body.birth,example.birth)&&(key==='compat-astro-direct-synastry'?match(body.partner?.birth,example.partnerBirth)&&body.partner?.name==='상대':body.celeb?.name===example.celeb.name&&body.celeb?.birth===example.celeb.birth);
 if(!valid)return Response.json({error:'ASTRO_SYNASTRY_EXAMPLE_REQUIRED',message:'모의 예시 입력과 뉴진스 하니를 선택해 주세요.'},{status:422});
 return Response.json(example.results[key]);
}
