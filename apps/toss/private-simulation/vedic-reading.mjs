import example from './vedic-reading-example.json' with {type:'json'};
export const vedicExampleBirth=example.birth;
const matches=(value,expected,keys)=>keys.every(key=>value?.[key]===expected[key]);
// This fixture is calculated from the canonical local Swiss engine, once for
// the explicit example. Other birth inputs never receive its chart silently.
export function privateVedicReading(body){
 const birth=body?.birth;
 if(birth?.gender!==example.birth.gender||!matches(birth?.date,example.birth.date,['year','month','day','hour','minute','timeUnknown','calType'])||!matches(birth?.location,example.birth.location,['lat','lng','tz']))return Response.json({error:'VEDIC_EXAMPLE_REQUIRED',message:'이 출생정보는 비공개 모의 상담에서 지원하지 않아요. 모의 예시 입력하기를 눌러 검증된 예시로 확인해 주세요.'},{status:422});
 return Response.json({...example.result,input:{...example.result.input,name:typeof body.name==='string'?body.name.slice(0,40):example.result.input.name}});
}
