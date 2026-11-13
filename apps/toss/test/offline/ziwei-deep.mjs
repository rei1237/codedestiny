
export const syntheticZiweiDeep={id:'native:ziwei-deep:ziwei-deep-pdf',name:'테스트 자미두수 심층 리포트',sku:'mock-ziwei-deep-pdf',featureKey:'ziwei-deep-pdf',approvedPriceKRW:1,available:true};
export function mockZiweiDeepLibrary(state){
  return [...state.intents.values()].filter(row=>row.service==='ziwei-deep'&&row.paid).map(row=>({
    serviceId:'yeoni',nativeService:'ziwei-deep',featureKey:syntheticZiweiDeep.featureKey,requestId:row.id,orderId:row.orderId,productId:syntheticZiweiDeep.id,
    status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',href:'/ziwei/chart?resultId='+row.id,createdAt:row.createdAt,
    completedSections:row.completed||0,totalSections:row.total,
  }));
}
export async function mockZiweiDeepRequest(path,request,state,save,now,delay){
  const {ZIWEI_DEEP_CHAPTERS}=await import('../../../../worker/lib/ziwei-deep-report-prompt.mjs');
  const reply=(data,status=200)=>Response.json(data,{status});
  if(path==='/native/ziwei-deep/prepare'&&request.method==='POST'){
    const {input,orderId}=await request.json();
    if(!input?.idempotencyKey||!input.birthInfo?.birthDate||(input.focusArea==='custom'&&input.question.trim().length<2)||orderId)return reply({error:'INVALID_INPUT'},400);
    const previous=[...state.intents.values()].find(row=>row.service==='ziwei-deep'&&row.input.idempotencyKey===input.idempotencyKey);
    if(previous&&JSON.stringify(input)!==JSON.stringify(previous.input))return reply({error:'REQUEST_INPUT_MISMATCH'},409);
    const id=previous?.id||(++state.sequence).toString(16).padStart(64,'0');
    const row=previous||{id,service:'ziwei-deep',sku:syntheticZiweiDeep.sku,amountKRW:1,paid:false,orderId:null,input,createdAt:now().toISOString(),completed:0,total:ZIWEI_DEEP_CHAPTERS.length};
    state.intents.set(id,row);save();return reply(row);
  }
  const match=/^\/native\/ziwei-deep\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(!match)return reply({error:'NOT_FOUND'},404);
  const row=state.intents.get(match[2]);
  if(!row||row.service!=='ziwei-deep'||!row.paid||state.orders.get(row.orderId)!==row.id)return reply({error:'RESULT_NOT_FOUND'},404);
  if(match[1]==='intents'&&request.method==='GET')return reply(row);
  if(row.result)return reply(row.result);
  if(request.method==='POST'){
    if(delay)await new Promise(resolve=>setTimeout(resolve,Math.min(delay,2000)));
    if(row.result)return reply(row.result);
    row.completed=Math.min(ZIWEI_DEEP_CHAPTERS.length,row.completed+3);
    row.chapters=ZIWEI_DEEP_CHAPTERS.slice(0,row.completed).map((section,i)=>({id:section.id,title:section.title,order:i+1,body:'오프라인 테스트 원문 · '+section.title}));
    if(row.completed===ZIWEI_DEEP_CHAPTERS.length)row.result={status:'completed',reportMeta:{label:'테스트 자미두수 심층 리포트',generatedAt:row.createdAt},totalChapters:row.total,progress:{completed:row.completed,total:row.total},chapters:row.chapters};
    save();
  }
  return reply(row.result||{status:'generating',chapters:row.chapters||[],progress:{completed:row.completed,total:ZIWEI_DEEP_CHAPTERS.length}});
}
