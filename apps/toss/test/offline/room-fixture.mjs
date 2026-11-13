// Local devtools only. No production price, receipt, calculation or generated text.
const tea={service:'tea',name:'가상 찻집 사주',featureKey:'fortune-tea-house-saju-consultation',path:'/fortune-tea-house/'};
const neo={service:'neo',name:'가상 네오 전략 상담',featureKey:'neo-operation-room-consultation',path:'/neo-operation-room/result/'};
const rooms=[tea,neo];
export const roomProducts=rooms.map(room=>({
  id:'native:'+room.service+':'+room.featureKey,name:room.name,featureKey:room.featureKey,
  sku:'mock-unregistered-room-'+room.service,available:true,approvedPriceKRW:1,
}));
export const roomSdkProducts=roomProducts.map(p=>({sku:p.sku,type:'CONSUMABLE',displayName:p.name,displayAmount:'1원',iconUrl:'',description:'오프라인 가상 결제'}));
const reply=(data,status=200)=>Response.json(data,{status});
const fail=(error,status)=>reply({ok:false,error,reason:error},status);
const requestKey=input=>input?.idempotencyKey||input?.requestId;
const example='[테스트 전용] 찻집에서 저장한 결과 원문입니다.';
function teaResult(row){
  return {resultId:row.resultId,sessionTitle:example,questionSummary:row.input.question,consultationMode:'saju',consultationVersion:'tea-v2',
    teaCup:{id:row.input.cupId||'offline',name:'가상 찻잔',topic:'가상 질문',reading:example},
    saju:{available:true,title:'가상 사주',summary:example,keyPoints:[example]},
    tarot:{cardId:'',number:0,nameEn:'',nameKo:'',orientation:'upright',keywords:[],meaning:'',reading:''},
    emotionAnalysis:[],yeoniReading:{intro:example,main:example,advice:example,caution:example},
    synthesis:{title:example,summary:example,sajuTarotBridge:''},choiceSimulation:[],actionPrescription:example,luckyKeywords:[],closingLine:example};
}
export function roomPurchases(state){
  return [...state.intents.values()].filter(row=>rooms.some(room=>room.service===row.service)&&row.paid).map(row=>{
    const room=rooms.find(item=>item.service===row.service);
    return {requestId:row.id,orderId:row.orderId,sku:row.sku,serviceId:room.service,nativeService:room.service,
      productId:room.featureKey,status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',createdAt:row.createdAt,
      href:room.service==='neo'?room.path+'?attemptId='+encodeURIComponent(row.result?row.resultId:'toss_'+row.id):
        room.path+'?'+(row.result?'resultId=':'recoverResultId=')+encodeURIComponent(row.resultId),
      question:row.input.question,resultId:row.resultId};
  });
}
export async function roomRequest(request,url,path,state,save,now){
  const post=request.method==='POST';
  const match=/^\/native\/(\w+)\/(prepare|intents\/([a-f0-9]{64}))$/.exec(path);
  const room=match&&rooms.find(item=>item.service===match[1]);
  if(room){
    if(!post&&match[3]){
      const row=state.intents.get(match[3]);
      return row?.service===room.service?reply(row):fail('RESULT_NOT_FOUND',404);
    }
    if(post&&match[2]==='prepare'){
      const {input,orderId}=await request.json(),key=requestKey(input);
      if(!key||!input?.question||input.featureKey&&input.featureKey!==room.featureKey)return fail('REQUEST_INPUT_MISMATCH',400);
      let row=[...state.intents.values()].find(item=>item.service===room.service&&requestKey(item.input)===key);
      if(row&&JSON.stringify(row.input)!==JSON.stringify(input))return fail('REQUEST_INPUT_MISMATCH',409);
      if(orderId&&(!row?.paid||row.orderId!==orderId))return fail('ORDER_MISMATCH',403);
      if(!row){
        const id=(++state.sequence).toString(16).padStart(64,'0');
        row={id,service:room.service,input,createdAt:now().toISOString(),resultId:'offline-'+id,paid:false,orderId:null,
          sku:roomProducts.find(p=>p.featureKey===room.featureKey).sku,amountKRW:1};
        state.intents.set(id,row);save();
      }
      return reply(row);
    }
  }
  if((path==='/orders/restore'||path==='/orders/grant')&&post){
    const {sku,orderId,requestId}=await request.clone().json();
    if(roomProducts.some(p=>p.sku===sku)){
      if(path==='/orders/grant'){
        const row=state.intents.get(requestId);
        if(!row||row.sku!==sku||!orderId)return fail('ORDER_MISMATCH',403);
        if(row.orderId&&row.orderId!==orderId||state.orders.has(orderId)&&state.orders.get(orderId)!==row.id)return fail('ORDER_ALREADY_ASSIGNED',409);
        if(!row.paid){
          row.paid=true;row.orderId=orderId;state.orders.set(orderId,row.id);
          if(!save()){row.paid=false;row.orderId=null;state.orders.delete(orderId);return fail('STORAGE_UNAVAILABLE',503);}
        }
        return reply({orderId,requestId:row.id,entitlement:'granted',durable:true});
      }
      const row=state.intents.get(state.orders.get(orderId));
      return row?.paid&&row.sku===sku&&row.orderId===orderId?reply({orderId,requestId:row.id,entitlement:'granted',durable:true}):fail('ORDER_MISMATCH',403);
    }
  }
  if(path==='/canonical/records'&&!post){
    const group=url.searchParams.get('group'),source=url.searchParams.get('source'),q=url.searchParams.get('q')?.trim();
    const items=roomPurchases(state).filter(r=>(!group||group==='all'||group==='report')&&(!source||source==='all'||source===r.serviceId)&&(!q||r.question.includes(q))).map(r=>({
      id:r.resultId,key:r.serviceId+':'+r.resultId,group:'report',source:r.serviceId,serviceId:r.serviceId,
      serviceName:rooms.find(room=>room.service===r.serviceId).name,title:r.question,question:r.question,
      createdAt:r.createdAt,status:r.state==='COMPLETED'?'completed':'generating',href:r.href,nativeHref:r.href,
    }));
    return reply({ok:true,items,failures:[],nextCursor:null});
  }
  if(path==='/canonical/fortune-tea-house/consult'&&post){
    const body=await request.json(),key=requestKey(body);
    const row=[...state.intents.values()].find(r=>r.service==='tea'&&requestKey(r.input)===key);
    if(!row?.paid)return fail('PAYMENT_REQUIRED',402);
    if(row.input.question!==body.question)return fail('REQUEST_INPUT_MISMATCH',409);
    if(!row.result){row.result=teaResult(row);row.generationCount=1;save();}
    return reply({ok:true,result:row.result});
  }
  if(path.startsWith('/canonical/fortune-tea-house/results/')&&!post){
    const id=path.split('/').at(-1);
    const row=[...state.intents.values()].find(r=>r.service==='tea'&&r.resultId===id);
    return row?.paid&&row.result?reply({ok:true,result:row.result}):fail('RESULT_NOT_FOUND',404);
  }
  if(path==='/canonical/fortune-tea-house/pending'&&!post){
    const id=url.searchParams.get('resultId');
    const row=[...state.intents.values()].reverse().find(r=>r.service==='tea'&&r.paid&&!r.result&&(!id||r.resultId===id));
    return row?reply({ok:true,status:'partial',retryable:true,resultId:row.resultId,completedSections:[],requestPayload:row.input},202):
      fail('RESULT_NOT_FOUND',404);
  }
  if(path==='/canonical/neo-operation-room/start'&&post){
    const body=await request.json(),key=requestKey(body);
    const row=[...state.intents.values()].find(r=>r.service==='neo'&&
      (key&&requestKey(r.input)===key||body.sessionId&&[r.resultId,'toss_'+r.id].includes(body.sessionId)));
    if(!row?.paid)return fail('PAYMENT_REQUIRED',402);
    if(key&&(row.input.question!==body.question||row.input.selectedMethod!==body.selectedMethod))return fail('REQUEST_INPUT_MISMATCH',409);
    if(!row.result){
      const text='[테스트 전용] 네오가 저장한 브리핑 원문입니다.';
      row.result={ok:true,id:row.resultId,sessionId:row.resultId,status:'completed',selectedMethod:row.input.selectedMethod,
        question:row.input.question,topic:row.input.topic,intensity:row.input.intensity,
        initialBriefing:{selectedMethod:row.input.selectedMethod,operationTitle:text,neoOpening:text,coreDiagnosis:text,
          frontlineSummary:text,actionOrders:[text],methodEvidence:[],sevenDayMission:[],realityCheckQuestions:[]},
        resultUrl:neo.path+'?attemptId='+encodeURIComponent(row.resultId),createdAt:row.createdAt};
      row.generationCount=1;save();
    }
    return reply(row.result);
  }
  if(path==='/canonical/neo-operation-room/result'&&!post){
    const id=url.searchParams.get('attemptId');
    const row=[...state.intents.values()].find(r=>r.service==='neo'&&[r.resultId,'toss_'+r.id,requestKey(r.input)].includes(id));
    if(!row?.paid)return fail('RESULT_NOT_FOUND',404);
    return row.result?reply(row.result):reply({ok:true,status:'generating',sessionId:'toss_'+row.id},202);
  }
  return null;
}
