
export const syntheticNakshatra={id:'native:nakshatra:nakshatra-ai-consultation',name:'테스트 두 별 통합 상담',sku:'mock-nakshatra-ai',featureKey:'nakshatra-ai-consultation',approvedPriceKRW:1,available:true};
export function mockNakshatraLibrary(state){
  return [...state.intents.values()].filter(row=>row.service==='nakshatra'&&row.paid).map(row=>({
    serviceId:'yeoni',nativeService:'nakshatra',featureKey:syntheticNakshatra.featureKey,requestId:row.id,orderId:row.orderId,productId:syntheticNakshatra.id,
    status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',href:'/nakshatra/ai?resultId='+row.id,createdAt:row.createdAt,
    completedSections:row.completed||0,totalSections:row.total,
  }));
}
export async function mockNakshatraRequest(path,request,state,save,now,delay){
  const {NAKSHATRA_SECTIONS}=await import('../../../../worker/lib/nakshatra-ai-prompt.js');
  const reply=(data,status=200)=>Response.json(data,{status});
  if(path==='/native/nakshatra/prepare'&&request.method==='POST'){
    const {input,orderId}=await request.json();
    if(!input?.requestId||!input.birthInfo||orderId)return reply({error:'INVALID_INPUT'},400);
    const previous=[...state.intents.values()].find(row=>row.service==='nakshatra'&&row.input.requestId===input.requestId);
    if(previous&&JSON.stringify(input)!==JSON.stringify(previous.input))return reply({error:'REQUEST_INPUT_MISMATCH'},409);
    const id=previous?.id||(++state.sequence).toString(16).padStart(64,'0');
    const row=previous||{id,service:'nakshatra',sku:syntheticNakshatra.sku,amountKRW:1,paid:false,orderId:null,input,createdAt:now().toISOString(),completed:0,total:NAKSHATRA_SECTIONS.length};
    state.intents.set(id,row);save();return reply(row);
  }
  const match=/^\/native\/nakshatra\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(!match)return reply({error:'NOT_FOUND'},404);
  const row=state.intents.get(match[2]);
  if(!row||row.service!=='nakshatra'||!row.paid||state.orders.get(row.orderId)!==row.id)return reply({error:'RESULT_NOT_FOUND'},404);
  if(match[1]==='intents'&&request.method==='GET')return reply(row);
  if(row.result)return reply(row.result);
  if(request.method==='POST'){
    if(delay)await new Promise(resolve=>setTimeout(resolve,Math.min(delay,2000)));
    if(row.result)return reply(row.result);
    row.completed=Math.min(NAKSHATRA_SECTIONS.length,row.completed+3);
    if(row.completed===NAKSHATRA_SECTIONS.length){
      const sections=NAKSHATRA_SECTIONS.map(section=>({id:section.id,title:section.title,topic:section.topic,body:'오프라인 테스트 원문 · '+section.title,keyInsight:'테스트 전용 저장 결과',vedicEvidence:'모의 베다 근거',sukuyoEvidence:'모의 숙요 근거'}));
      row.result={status:'completed',sessionId:row.id,question:row.input.question,natal:{sukuyoKo:'모의 숙',nakshatraKo:'모의 별'},decks:{consultation:sections},totalCharCount:sections.reduce((n,item)=>n+item.body.length,0)};
    }
    save();
  }
  return reply(row.result||{status:'generating',progress:{completed:row.completed,total:NAKSHATRA_SECTIONS.length}});
}
