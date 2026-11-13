
export const syntheticCompass={id:'native:compass:destiny-compass-deep-report',name:'테스트 나침반 심층 리포트',sku:'mock-compass-deep',featureKey:'destiny-compass-deep-report',approvedPriceKRW:1,available:true};
export function mockCompassLibrary(state){
  return [...state.intents.values()].filter(row=>row.service==='compass'&&row.paid).map(row=>({
    serviceId:'yeoni',nativeService:'compass',featureKey:syntheticCompass.featureKey,requestId:row.id,orderId:row.orderId,productId:syntheticCompass.id,
    status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',href:'/destiny-compass?resultId='+row.id,createdAt:row.createdAt,
    completedSections:row.completed||0,totalSections:row.total,
  }));
}
export async function mockCompassRequest(path,request,state,save,now,delay){
  const {COMPASS_SECTIONS}=await import('../../../../worker/lib/destiny-compass-report-contract.js');
  const reply=(data,status=200)=>Response.json(data,{status});
  if(path==='/native/compass/prepare'&&request.method==='POST'){
    const {input,orderId}=await request.json();
    if(!input?.idempotencyKey||input.evidencePack?.systems?.length!==5||orderId)return reply({error:'INVALID_INPUT'},400);
    const previous=[...state.intents.values()].find(row=>row.service==='compass'&&row.input.idempotencyKey===input.idempotencyKey);
    if(previous&&JSON.stringify(input)!==JSON.stringify(previous.input))return reply({error:'REQUEST_INPUT_MISMATCH'},409);
    const id=previous?.id||(++state.sequence).toString(16).padStart(64,'0');
    const row=previous||{id,service:'compass',sku:syntheticCompass.sku,amountKRW:1,paid:false,orderId:null,input,createdAt:now().toISOString(),completed:0,total:COMPASS_SECTIONS.length};
    state.intents.set(id,row);save();return reply(row);
  }
  const match=/^\/native\/compass\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(!match)return reply({error:'NOT_FOUND'},404);
  const row=state.intents.get(match[2]);
  if(!row||row.service!=='compass'||!row.paid||state.orders.get(row.orderId)!==row.id)return reply({error:'RESULT_NOT_FOUND'},404);
  if(match[1]==='intents'&&request.method==='GET')return reply(row);
  if(row.result)return reply(row.result);
  if(request.method==='POST'){
    if(delay)await new Promise(resolve=>setTimeout(resolve,Math.min(delay,2000)));
    if(row.result)return reply(row.result);
    row.completed=Math.min(COMPASS_SECTIONS.length,row.completed+3);
    row.sections=COMPASS_SECTIONS.slice(0,row.completed).map((section,i)=>({key:section.key,title:section.title,order:i+1,body:'오프라인 테스트 원문 · '+section.title}));
    if(row.completed===COMPASS_SECTIONS.length)row.result={status:'completed',progress:{completed:row.completed,total:row.total},sections:row.sections};
    save();
  }
  return reply(row.result||{status:'generating',sections:row.sections||[],progress:{completed:row.completed,total:COMPASS_SECTIONS.length}});
}
