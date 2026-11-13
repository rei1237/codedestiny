import {tossExpertResultHref} from '../../../../lib/fortune/toss-expert-result.mjs';

// Local SDK devtools only. The same input, paid order and owner must be present on every read.
const services=[
  ['fusion','fusion-fortune','fusion-fortune-consultation','초융합 운세','generate/stream'],
  ['love-secret','love-secret-ai','love-secret-ai-consultation','연애비책','generate'],
  ['astrology','astrology-ai','astrology-ai-consultation','서양 점성술','start'],
  ['vedic','vedic-ai','vedic-ai-consultation','베다점','start'],
  ['ziwei','ziwei-ai','ziwei-ai-consultation','자미두수','generate'],
  ['new-year','new-year-ai','new-year-ai-consultation','신년 운세','start'],
  ['karma','karma-destiny-ai','karma-destiny-ai-consultation','운명의 업','start'],
];
export const expertProducts=services.map(([service,api,featureKey,label,generation])=>({
  service,api,featureKey,label,generation,id:'native:'+service+':'+featureKey,name:'테스트 '+label,sku:'mock-expert-'+service,approvedPriceKRW:1,available:true,
}));
const json=(value,status=200)=>Response.json(value,{status});
const error=(code,status)=>json({ok:false,error:code,reason:code},status);
const paid=(state,row)=>row?.paid===true&&state.orders.get(row.orderId)===row.id;
const resultId=row=>row.result?.sessionId||'toss_'+row.id;
const fusionStatus={isLoggedIn:true,nextAction:'generate',canGenerate:true,cta:{}};

export function expertLibrary(state){
  return [...state.intents.values()].flatMap(row=>{
    const product=expertProducts.find(p=>p.service===row.service);
    if(!product||!paid(state,row))return [];
    return [{orderId:row.orderId,serviceId:'yeoni',nativeService:row.service,featureKey:product.featureKey,requestId:row.id,sku:row.sku,productId:product.id,
      status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',resultId:resultId(row),href:tossExpertResultHref(row.service,resultId(row)),createdAt:row.createdAt}];
  });
}
function makeResult(product,row){
  const sessionId=row.id.slice(-24),input=row.input;
  const body='테스트 전용 예시 · '+product.label+'의 저장된 상담 원문입니다.';
  const base={ok:true,saved:true,status:'completed',id:sessionId,sessionId,requestId:row.requestKey,accessType:'paid',topic:input.topic||input.focusArea||'',userQuestion:input.userQuestion||input.question||input.concern||'',
    messages:[{role:'assistant',content:body,createdAt:row.createdAt}]};
  if(product.service==='fusion'){
    const sections=Object.fromEntries(['sajuSection','ziweiSection','vedicSection','sukuyoSection','astrologySection','tarotSection','integratedReading'].map(title=>[title,{title,content:body,keyPoints:[]}]));
    return {...base,result:{...sections,title:product.label,openingMessage:body,executiveSummary:body,closingMessage:body,timingAndAction:{title:'테스트 시기',content:body,luckyActions:[],cautionPatterns:[]}}};
  }
  if(product.service==='love-secret')return {...base,resultId:sessionId,sections:[{title:product.label,body}],strategy:body,finalLine:body,keywords:[]};
  if(product.service==='new-year')return {...base,sections:[{key:'test',label:product.label,text:body}],monthlyFlow:[]};
  if(product.service==='karma')return {...base,schemaVersion:2,userInput:input,chapters:[{id:'test',order:1,title:product.label,content:body}],finalLetter:body};
  if(product.service==='vedic')return {...base,birthInfo:input.birthInfo||input,vedicChart:{}};
  if(product.service==='ziwei')return {...base,birthInfo:input.birthInfo||input,ziweiChart:{}};
  return {...base,astrologyChart:null};
}
function resultResponse(row,stream=false){
  const result=row.result;
  if(row.service==='fusion'){
    if(stream){
      const payload={ok:true,status:'completed',consultationId:result.id,requestId:row.requestKey,result:result.result,fusionStatus};
      return new Response('event: result\ndata: '+JSON.stringify(payload)+'\n\nevent: complete\ndata: {}\n\n',{headers:{'content-type':'text/event-stream'}});
    }
    return json({ok:true,consultation:result});
  }
  if(['vedic','ziwei'].includes(row.service))return json({ok:true,status:'completed',sessionId:result.id,consultation:result});
  return json(result);
}
export async function mockExpertRequest(request,url,path,state,save,now,delay){
  if(path==='/orders/grant'&&request.method==='POST'){
    const {orderId,sku,requestId}=await request.clone().json();
    const product=expertProducts.find(item=>item.sku===sku);
    if(!product)return null;
    const row=state.intents.get(requestId);
    if(!orderId||row?.service!==product.service||row.sku!==sku)return error('ORDER_MISMATCH',403);
    if((row.orderId&&row.orderId!==orderId)||(state.orders.has(orderId)&&state.orders.get(orderId)!==row.id))return error('ORDER_ALREADY_ASSIGNED',409);
    if(!paid(state,row)){
      row.orderId=orderId;row.paid=true;state.orders.set(orderId,row.id);
      if(!save()){row.orderId=null;row.paid=false;state.orders.delete(orderId);return error('STORAGE_UNAVAILABLE',503);}
    }
    return json({orderId,requestId,entitlement:'granted',durable:true});
  }
  const [,boundary,key,...parts]=path.split('/');
  const product=expertProducts.find(item=>boundary==='native'?item.service===key:boundary==='canonical'&&item.api===key);
  if(!product)return null;
  const action=parts.join('/'),method=request.method,rows=[...state.intents.values()].filter(row=>row.service===product.service);
  if(boundary==='native'){
    if(action==='prepare'&&method==='POST'){
      const {input,orderId}=await request.json(),requestKey=input?.idempotencyKey||input?.requestId;
      if(typeof requestKey!=='string'||!requestKey)return error('INVALID_INPUT',400);
      const previous=rows.find(row=>row.requestKey===requestKey);
      if(previous&&JSON.stringify(input)!==JSON.stringify(previous.input))return error('REQUEST_INPUT_MISMATCH',409);
      if(orderId&&(!previous||previous.orderId!==orderId||!paid(state,previous)))return error('RESULT_NOT_FOUND',404);
      if(previous)return json(previous);
      const id=(++state.sequence).toString(16).padStart(64,'0');
      const row={id,requestKey,service:product.service,sku:product.sku,amountKRW:1,paid:false,orderId:null,input,createdAt:now().toISOString(),generationCount:0};
      state.intents.set(id,row);
      if(!save()){state.intents.delete(id);return error('STORAGE_UNAVAILABLE',503);}
      return json(row);
    }
    const intent=parts[0]==='intents'&&method==='GET'&&rows.find(row=>row.id===parts[1]);
    return intent?json(intent):error('RESULT_NOT_FOUND',404);
  }
  const body=method==='POST'?await request.json():{};
  if(product.service==='fusion'&&action==='status'&&method==='GET')return json({ok:true,...fusionStatus});
  if(['prepare','ensure-access'].includes(action)&&method==='POST')return json({ok:false,reason:'PAYMENT_REQUIRED',paymentPayload:{runtimeGate:{featureKey:product.featureKey}}},402);
  if(method==='GET'&&parts[0]!=='result')return error('NOT_FOUND',404);
  const requested=method==='GET'?(parts[1]||['id','sessionId','attemptId','requestId'].map(param=>url.searchParams.get(param)).find(Boolean))
    :(body.resumeSessionId||body.sessionId||body.idempotencyKey||body.requestId||request.headers.get('Idempotency-Key'));
  const row=rows.find(candidate=>requested&&[candidate.requestKey,'toss_'+candidate.id,candidate.result?.sessionId].includes(requested));
  if(!row||!paid(state,row)){
    if(!requested&&method==='GET')return json({ok:true,consultations:[],results:[],pendingSessionId:''});
    return error(method==='POST'?'PAYMENT_REQUIRED':'RESULT_NOT_FOUND',method==='POST'?402:404);
  }
  if(method==='GET'){
    if(row.result)return resultResponse(row);
    const id=resultId(row);
    return json(product.service==='fusion'?{ok:true,consultation:{id,requestId:row.requestKey,status:'partial',nextStage:1,resumeBody:row.input,result:null}}:
      {ok:true,status:'partial',sessionId:id,retryable:true,messages:[]},202);
  }
  if(![product.generation,...(product.service==='karma'?['generate-batch']:[])].includes(action))return error('NOT_FOUND',404);
  if(!row.result){
    if(delay)await new Promise(resolve=>setTimeout(resolve,Math.min(delay,2000)));
    if(!row.result){
      row.result=makeResult(product,row);row.generationCount++;
      if(!save()){delete row.result;row.generationCount--;return error('STORAGE_UNAVAILABLE',503);}
    }
  }
  return resultResponse(row,action==='generate/stream');
}
