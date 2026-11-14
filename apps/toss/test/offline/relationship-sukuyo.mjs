// Synthetic local fixtures; no payment, database or LLM providers.
export const sukuyoProduct={id:'native:sukuyo:sukuyo-compatibility-ai',name:'테스트 숙요 상담',sku:'mock-sukuyo',featureKey:'sukuyo-compatibility-ai',approvedPriceKRW:1,available:true};
export const relationshipProduct={id:'native:relationship:relationship-boundary-test',name:'테스트 관계 상담',sku:'mock-relationship',featureKey:'relationship-boundary-test',approvedPriceKRW:1,available:true};
function sukuyoFixtureSummary(input){
 const person=(value,name,birthDate,birthTime,calendarType,gender,isLeapMonth)=>({
   name:value?.name||name||'',birthDate:value?.birthDate||birthDate||'',birthTime:value?.birthTime||birthTime||'',
   calendarType:value?.calendarType||calendarType||'solar',gender:value?.gender||gender||'unknown',isLeapMonth:Boolean(value?.isLeapMonth??isLeapMonth),
   timezone:'Asia/Seoul',timezoneOffset:null,latitude:null,longitude:null,
 });
 return {consultationType:input.consultationType||'compatibility',
   personA:person(input.personA,input.userName,input.birthDate,input.birthTime,input.calendarType,input.gender,input.isLeapMonth),
   personB:person(input.personB,input.partnerName,input.partnerBirthDate,input.partnerBirthTime,input.partnerCalendarType,input.partnerGender,input.partnerIsLeapMonth),
   question:input.question||'',topic:input.topic||'',relationshipType:input.relationshipType||''};
}

export async function relationshipSukuyoRequest(request,url,path,state,save,now){
 const method=request.method,respond=(body,status=200)=>Response.json(body,{status});
  if(path==='/native/relationship/prepare'&&method==='POST'){
   const body=await request.json();if(!body.input?.idempotencyKey||!body.input?.targetInfo||body.orderId)return respond({error:'MOCK_UNSUPPORTED'},400);
   const previous=[...state.intents.values()].find(row=>row.service==='relationship'&&row.input.idempotencyKey===body.input.idempotencyKey);
   if(previous&&JSON.stringify(previous.input)!==JSON.stringify(body.input))return respond({error:'REQUEST_INPUT_MISMATCH'},409);
   const id=previous?.id||(++state.sequence).toString(16).padStart(64,'0'),intent=previous||{id,service:'relationship',sku:relationshipProduct.sku,amountKRW:1,paid:false,orderId:null,input:body.input};state.intents.set(id,intent);save();return respond(intent);
  }
  if(path==='/canonical/relationship-boundary-test/result'&&method==='GET'){
   const id=url.searchParams.get('sessionId');if(!id)return respond({reason:'RESULT_NOT_FOUND'},404);
   const intent=[...state.intents.values()].find(row=>row.service==='relationship'&&('toss_'+row.id===id||row.result?.sessionId===id));
   if(!intent?.paid)return respond({reason:'RESULT_NOT_FOUND'},404);
   return intent.result?respond(intent.result):respond({ok:true,sessionId:id,status:'delivery_pending',retryable:true,resumeBody:{resumeSessionId:id}},202);
  }
  if(path==='/canonical/relationship-boundary-test/generate'&&method==='POST'){
   const {resumeSessionId}=await request.json(),intent=[...state.intents.values()].find(row=>row.service==='relationship'&&('toss_'+row.id===resumeSessionId||row.result?.sessionId===resumeSessionId));
   if(!intent?.paid)return respond({reason:'PAYMENT_REQUIRED'},402);
   intent.result={ok:true,sessionId:'rbt_'+intent.id.slice(-32),status:'completed',mode:'target',grade:'low',score:20,character:{title:'테스트 상담',caption:'실제 해석이 아닙니다.'},scoreFactors:['테스트 전용 예시'],summary:'실제 상담 결과가 아닙니다.',sections:Array.from({length:5},(_,i)=>({title:'테스트 '+(i+1),body:'[테스트 전용 예시] 실제 상담 결과가 아닙니다.'})),finalMessage:'이 내용은 테스트용입니다.'};save();return respond(intent.result);
  }
  if(path==='/canonical/sukuyo-compatibility-ai/result'&&method==='GET'){
   const id=url.searchParams.get('id');if(!id)return respond({ok:true,consultations:[],pendingSessionId:''});
   if(/^toss_[a-f0-9]{64}$/.test(id)){const intent=state.intents.get(id.slice(5));if(!intent?.paid||intent.service!=='sukuyo')return respond({error:'RESULT_NOT_FOUND'},404);if(intent.result?.status==='generation_failed')return respond({ok:true,status:'generation_failed',sessionId:intent.result.id,idempotencyKey:intent.input.idempotencyKey,retryable:(intent.retryCount||0)<2});return intent.result?respond({ok:true,consultation:intent.result}):respond({ok:true,status:'partial',sessionId:id,idempotencyKey:intent.input.idempotencyKey},202);}
   const intent=[...state.intents.values()].find(row=>row.service==='sukuyo'&&row.result?.id===id);
   if(intent?.paid&&intent.result?.status==='generation_failed')return respond({ok:true,status:'generation_failed',sessionId:id,idempotencyKey:intent.input.idempotencyKey,retryable:(intent.retryCount||0)<2});
   return intent?.paid?respond({ok:true,consultation:intent.result}):respond({error:'RESULT_NOT_FOUND'},404);
  }
  if(path==='/canonical/sukuyo-compatibility-ai/prepare'&&method==='POST')return respond({ok:false,reason:'PAYMENT_REQUIRED'},402);
  // Test-only unassigned order; this route cannot call an SDK or real payment.
  if(path==='/test/sukuyo/unassigned'&&method==='POST'){const {orderId}=await request.json();if(!/^[a-f0-9-]{36}$/i.test(orderId||'')||state.orders.has(orderId))return respond({error:'MOCK_ORDER_INVALID'},400);state.orders.set(orderId,null);state.testOrderSkus.set(orderId,sukuyoProduct.sku);save();return respond({ok:true});}
  if(path==='/test/sukuyo/fail'&&method==='POST'){const {intentId}=await request.json(),intent=state.intents.get(intentId);if(!intent?.paid||intent.service!=='sukuyo')return respond({error:'RESULT_NOT_FOUND'},404);intent.result={id:intent.id.slice(-24),status:'generation_failed'};intent.retryCount=0;save();return respond({ok:true,resultId:intent.result.id});}
  if(path==='/native/sukuyo/recovery/drafts'&&method==='POST'){
   const {orderId}=await request.json();if(!state.orders.has(orderId))return respond({error:'RESULT_NOT_FOUND'},404);if((state.testOrderSkus.get(orderId)||state.intents.get(state.orders.get(orderId))?.sku)!==sukuyoProduct.sku)return respond({error:'ORDER_PRODUCT_MISMATCH'},409);
   const assigned=state.orders.get(orderId);if(assigned)return respond({state:'ASSIGNED',intentId:assigned});

   return respond({state:'UNASSIGNED',drafts:[...state.intents.values()].filter(row=>row.service==='sukuyo'&&!row.paid).map(row=>({id:row.id,input:sukuyoFixtureSummary(row.input),createdAt:row.createdAt||'2026-11-06T00:00:00.000Z'})),nextCursor:null});
  }
  if(path==='/native/sukuyo/recovery/attach'&&method==='POST'){
   const {orderId,intentId}=await request.json(),intent=state.intents.get(intentId),assigned=state.orders.get(orderId);
   if(!state.orders.has(orderId)||!intent||intent.service!=='sukuyo')return respond({error:'RESULT_NOT_FOUND'},404);if((state.testOrderSkus.get(orderId)||state.intents.get(assigned)?.sku)!==sukuyoProduct.sku)return respond({error:'ORDER_PRODUCT_MISMATCH'},409);
   if(assigned&&assigned!==intentId||intent.orderId&&intent.orderId!==orderId)return respond({error:'ORDER_ALREADY_ASSIGNED'},409);
   state.orders.set(orderId,intentId);intent.orderId=orderId;intent.paid=true;save();return respond({state:'ASSIGNED',intentId});
  }
  if(path==='/native/sukuyo/prepare'&&method==='POST'){
   const body=await request.json();if(!body.input||!body.input.idempotencyKey)return respond({error:'MOCK_UNSUPPORTED'},400);
   if(body.orderId&&(!state.orders.has(body.orderId)||state.testOrderSkus.get(body.orderId)!==sukuyoProduct.sku))return respond({error:'RESULT_NOT_FOUND'},404);
   const previous=[...state.intents.values()].find(row=>row.service==='sukuyo'&&row.input.idempotencyKey===body.input.idempotencyKey);
   if(previous&&JSON.stringify(previous.input)!==JSON.stringify(body.input))return respond({error:'REQUEST_INPUT_MISMATCH'},409);
   const assigned=body.orderId&&state.orders.get(body.orderId);if(assigned&&assigned!==previous?.id)return respond({error:'ORDER_ALREADY_ASSIGNED'},409);
   const id=previous?.id||(++state.sequence).toString(16).padStart(64,'0'),intent=previous||{id,service:'sukuyo',sku:sukuyoProduct.sku,amountKRW:sukuyoProduct.approvedPriceKRW,paid:false,orderId:null,createdAt:now().toISOString(),input:body.input};
   if(body.orderId){if(intent.orderId&&intent.orderId!==body.orderId)return respond({error:'REQUEST_ALREADY_FUNDED'},409);state.orders.set(body.orderId,id);intent.orderId=body.orderId;intent.paid=true;}
   state.intents.set(id,intent);save();return respond(intent);
  }
  if(path==='/canonical/sukuyo-compatibility-ai/generate'&&method==='POST'){
   const body=await request.json(),intent=[...state.intents.values()].find(row=>row.service==='sukuyo'&&(body.idempotencyKey&&row.input.idempotencyKey===body.idempotencyKey||body.resumeSessionId&&(row.result?.id===body.resumeSessionId||'toss_'+row.id===body.resumeSessionId)));
   if(!intent?.paid)return respond({error:'PAYMENT_REQUIRED'},402);
   if(intent.result?.status==='completed')return respond({ok:true,consultation:intent.result});
   if(intent.result?.status==='generation_failed'){if(body.retryGeneration!==true||(intent.retryCount||0)>=2)return respond({error:'LLM_FAILED'},409);intent.retryCount=(intent.retryCount||0)+1;}
   intent.result={id:intent.id.slice(-24),idempotencyKey:intent.input.idempotencyKey,status:'completed',...sukuyoFixtureSummary(intent.input),sukuyoResult:{},messages:[{role:'assistant',content:'[테스트 전용 예시] 실제 상담 결과가 아닙니다.'}]};save();return respond({ok:true,consultation:intent.result});
  }
  const sukuyoIntent=/^\/native\/sukuyo\/intents\/([a-f0-9]{64})$/.exec(path);
  if(sukuyoIntent&&method==='GET'){const intent=state.intents.get(sukuyoIntent[1]);return intent?.service==='sukuyo'?respond(intent):respond({error:'RESULT_NOT_FOUND'},404);}

 return null;
}
