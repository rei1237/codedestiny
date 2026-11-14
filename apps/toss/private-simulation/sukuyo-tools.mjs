import example from './sukuyo-tools-examples.json' with {type:'json'};
const matches=(value,expected,keys)=>keys.every(key=>value?.[key]===expected[key]);
const unavailable=()=>Response.json({error:'SUKUYO_EXAMPLE_REQUIRED',message:'비공개 모의 상담의 예시 출생정보로 확인해 주세요.'},{status:422});
export function privateSukuyoTools(body,basic=false){
 if(basic){
  const row=example.basic[body?.birth?.date?.timeUnknown?'unknown':'known'];
  if(!matches(body?.birth?.date,row.input.birth.date,['year','month','day','hour','minute','timeUnknown','calType'])||!matches(body?.birth?.location,row.input.birth.location,['lat','lng','tz']))return unavailable();
  return Response.json(row.result);
 }
 const row=example.tools[body?.featureKey];if(!row)return Response.json({error:'SECTION_NOT_PUBLIC'},{status:404});
 if(!matches(body?.birth,row.input.birth,['date','calType','timeKnown','hour','minute'])||body.gender!==row.input.gender||!matches(body?.place,row.input.place,['latitude','longitude','timezone'])||row.input.partner&&!matches(body?.partner,row.input.partner,['date','calType','timeKnown','hour','minute','gender']))return unavailable();
 return Response.json(row.result);
}
