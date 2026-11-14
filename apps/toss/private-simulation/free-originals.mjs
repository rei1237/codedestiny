import example from './free-original-examples.json' with {type:'json'};
const sameBirth=(a,b)=>a?.gender===b.gender&&['year','month','day','hour','minute','timeUnknown','calType'].every(k=>a?.date?.[k]===b.date[k])&&['lat','lng','tz'].every(k=>a?.location?.[k]===b.location[k]);
export function privateFreeOriginal(path,body){
 let valid=false,result,code;
 if(path==='/vedic/compatibility'){valid=sameBirth(body?.birth,example.compatInput.birth)&&sameBirth(body?.partner?.birth,example.compatInput.partner.birth);result=structuredClone(example.compatibility);code='VEDIC_COMPATIBILITY_EXAMPLE_REQUIRED';if(valid){result.mine.input.name=String(body.name||'').slice(0,40);result.partner.input.name=String(body.partner.name||'').slice(0,40);}}
 else if(path==='/vedic/prashna'){valid=['question','latitude','longitude'].every(k=>body?.[k]===example.prashnaInput[k]);result=example.prashna;code='PRASHNA_EXAMPLE_REQUIRED';}
 else if(path==='/flower/match'){valid=sameBirth(body?.birth,example.compatInput.birth)&&(!body.sources||Array.isArray(body.sources)&&body.sources.length>0&&body.sources.every(k=>Object.hasOwn(example.flower.sources,k)));result={...example.flower,sources:Object.fromEntries(Object.entries(example.flower.sources).filter(([key])=>!body.sources||body.sources.includes(key)))};code='FLOWER_EXAMPLE_REQUIRED';}
 else return Response.json({error:'PRIVATE_SIMULATION_UNAVAILABLE'},{status:404});
 return valid?Response.json(result):Response.json({error:code},{status:422});
}
