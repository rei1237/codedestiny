// Explicitly synthetic, local-only fixture for the official SDK devtools.
import {assembleChart} from '../../../../lib/human-design/chart.js';
import {DIRECT_PLANETS} from '../../../../lib/human-design/planets.js';
const chartFixture=()=>{const longitudes=shift=>Object.fromEntries(DIRECT_PLANETS.map((planet,index)=>[planet,(index*29+shift)%360]));return {stored:false,chart:assembleChart({personalityLongitudes:longitudes(12),designLongitudes:longitudes(284)})};};
export function createOfflineFixtureApi(storage){
 let saved;try{saved=JSON.parse(storage?.getItem('toss-offline-fixture')||'null');}catch{saved=null;}
 const state={loggedIn:saved?.loggedIn===true,intents:new Map(saved?.intents||[]),letters:new Map(saved?.letters||[]),orders:new Map(saved?.orders||[]),testOrderSkus:new Map(saved?.testOrderSkus||[]),sequence:Number.isSafeInteger(saved?.sequence)?saved.sequence:0};
 const save=()=>{try{storage?.setItem('toss-offline-fixture',JSON.stringify({loggedIn:state.loggedIn,intents:[...state.intents],letters:[...state.letters],orders:[...state.orders],testOrderSkus:[...state.testOrderSkus],sequence:state.sequence}));}catch{/* The test remains in memory when storage is unavailable. */}};
 const letterProduct={id:'yeoni:chat_saju',name:'테스트 연이 상담',sku:'mock-yeoni',approvedPriceKRW:1,available:true,chapters:1};
 const product={id:'native:maya:maya-prompt-generator',name:'테스트 상품',sku:'mock-maya',featureKey:'maya-prompt-generator',approvedPriceKRW:1,available:true};
 const sukuyoProduct={id:'native:sukuyo:sukuyo-compatibility-ai',name:'테스트 숙요 상담',sku:'mock-sukuyo',featureKey:'sukuyo-compatibility-ai',approvedPriceKRW:1,available:true};
 const relationshipProduct={id:'native:relationship:relationship-boundary-test',name:'테스트 관계 상담',sku:'mock-relationship',featureKey:'relationship-boundary-test',approvedPriceKRW:1,available:true};
 const respond=(value,status=200)=>Response.json(value,{status});
 const denied=()=>respond({error:'LOGIN_REQUIRED'},401);
 async function handle(request){
  const url=new URL(request.url),path=url.pathname.slice('/api/toss'.length),method=request.method;
  if(path==='/login'&&method==='POST'){state.loggedIn=true;save();return respond({token:'local-mock-token'});}
  if(!state.loggedIn||request.headers.get('Authorization')!=='Bearer local-mock-token')return denied();
  if(path==='/session'&&method==='GET')return respond({authenticated:true,environment:'SANDBOX'});
  // This fixed chart is synthetic and never uses the submitted birth data.
  // The offline shell labels all of its output as test-only.
  if(path==='/human-design/chart'&&method==='POST')return respond(chartFixture());
  if(path==='/canonical/auth/me'&&method==='GET')return respond({ok:true,authenticated:true,user:{id:'offline-test-user',name:'테스트 사용자',role:'user'}});
  if(path==='/native/catalog'&&method==='GET')return respond({products:[product,sukuyoProduct,relationshipProduct]});
  if(path==='/catalog'&&method==='GET')return respond({products:[letterProduct]});
  if(path==='/canonical/yeongnyangi/profiles'&&method==='GET')return respond({ok:true,profiles:[{id:'mock-profile',profileId:'mock-profile',name:'테스트 프로필',gender:'F',birthDate:'1990-01-01',timeUnknown:true,calendarType:'solar',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'solar'}}],currentId:'mock-profile'});
  if(path==='/canonical/profile'&&method==='GET')return respond({ok:true,profiles:[]});
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
   const summary=input=>{const a=input.personA||input,b=input.personB||{};const person=(value,name,date,time,calendar,gender)=>({name:value.name||name||'',birthDate:value.birthDate||date||'',birthTime:value.birthTime||time||'',calendarType:value.calendarType||calendar||'solar',gender:value.gender||gender||'unknown',isLeapMonth:false,timezone:'Asia/Seoul',timezoneOffset:null,latitude:null,longitude:null});return {consultationType:'compatibility',personA:person(a,input.userName,input.birthDate,input.birthTime,input.calendarType,input.gender),personB:person(b,input.partnerName,input.partnerBirthDate,input.partnerBirthTime,input.partnerCalendarType,input.partnerGender),question:input.question||'',topic:input.topic||'',relationshipType:input.relationshipType||''};};
   return respond({state:'UNASSIGNED',drafts:[...state.intents.values()].filter(row=>row.service==='sukuyo'&&!row.paid).map(row=>({id:row.id,input:summary(row.input),createdAt:row.createdAt||'2026-11-06T00:00:00.000Z'})),nextCursor:null});
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
   const id=previous?.id||(++state.sequence).toString(16).padStart(64,'0'),intent=previous||{id,service:'sukuyo',sku:sukuyoProduct.sku,amountKRW:sukuyoProduct.approvedPriceKRW,paid:false,orderId:null,input:body.input};
   if(body.orderId){if(intent.orderId&&intent.orderId!==body.orderId)return respond({error:'REQUEST_ALREADY_FUNDED'},409);state.orders.set(body.orderId,id);intent.orderId=body.orderId;intent.paid=true;}
   state.intents.set(id,intent);save();return respond(intent);
  }
  if(path==='/canonical/sukuyo-compatibility-ai/generate'&&method==='POST'){
   const body=await request.json(),intent=[...state.intents.values()].find(row=>row.service==='sukuyo'&&(body.idempotencyKey&&row.input.idempotencyKey===body.idempotencyKey||body.resumeSessionId&&(row.result?.id===body.resumeSessionId||'toss_'+row.id===body.resumeSessionId)));
   if(!intent?.paid)return respond({error:'PAYMENT_REQUIRED'},402);
   if(intent.result?.status==='generation_failed'){if(body.retryGeneration!==true||(intent.retryCount||0)>=2)return respond({error:'LLM_FAILED'},409);intent.retryCount=(intent.retryCount||0)+1;}
   intent.result={id:intent.id.slice(-24),idempotencyKey:intent.input.idempotencyKey,status:'completed',consultationType:'compatibility',personA:{name:'테스트 A'},personB:{name:'테스트 B'},sukuyoResult:{},relationshipType:'연인',topic:'전체 궁합',messages:[{role:'assistant',content:'[테스트 전용 예시] 실제 상담 결과가 아닙니다.'}]};save();return respond({ok:true,consultation:intent.result});
  }
  const sukuyoIntent=/^\/native\/sukuyo\/intents\/([a-f0-9]{64})$/.exec(path);
  if(sukuyoIntent&&method==='GET'){const intent=state.intents.get(sukuyoIntent[1]);return intent?.service==='sukuyo'?respond(intent):respond({error:'RESULT_NOT_FOUND'},404);}
  if(path==='/canonical/fortune-chat/consultations'&&method==='GET')return respond({ok:true,consultations:[...state.letters.values()].filter(row=>row.paid).map(row=>({id:row.id,persona:row.persona,state:row.state,paid:true,domain:'saju',completedChapters:1,totalChapters:1,question:row.consultation.question,createdAt:row.createdAt})),nextCursor:null});
  if(path==='/canonical/fortune-chat/consultations'&&method==='POST'){const body=await request.json(),id=(++state.sequence).toString(16).padStart(64,'0'),row={id,persona:'yeoni',productId:'chat_saju',state:'CREATED',paid:false,chapters:[],manifest:[{id:'test',title:'테스트 상담'}],consultation:{question:String(body.question||'테스트 질문')},createdAt:new Date().toISOString(),recovery:{canRetryNow:false,savedChapters:0,totalChapters:1}};state.letters.set(id,row);save();return respond({ok:true,consultation:row});}
  const letter=/^\/canonical\/fortune-chat\/consultations\/([a-f0-9]{64})(?:\/(generate))?$/.exec(path);
  if(letter){const row=state.letters.get(letter[1]);if(!row)return respond({error:'RESULT_NOT_FOUND'},404);if(letter[2]&&method==='POST'&&!row.paid)return respond({error:'PAYMENT_REQUIRED'},402);return respond({ok:true,consultation:row});}
  if(path==='/events'&&method==='POST')return respond({ok:true});
  if(path==='/native/maya/prepare'&&method==='POST'){
   const body=await request.json();if(!body.input||body.orderId)return respond({error:'MOCK_UNSUPPORTED'},400);
   const id=(++state.sequence).toString(16).padStart(64,'0');const intent={id,sku:product.sku,amountKRW:product.approvedPriceKRW,paid:false,orderId:null,input:body.input};state.intents.set(id,intent);save();return respond(intent);
  }
  if(path==='/orders/grant'&&method==='POST'){
   const body=await request.json(),letter=body.sku===letterProduct.sku?state.letters.get(body.requestId):null,intent=[product.sku,sukuyoProduct.sku,relationshipProduct.sku].includes(body.sku)?state.intents.get(body.requestId):letter;if(!intent||intent.sku&&intent.sku!==body.sku||typeof body.orderId!=='string')return respond({error:'ORDER_MISMATCH'},403);
   const prior=state.orders.get(body.orderId);if(prior&&prior!==intent.id||intent.orderId&&intent.orderId!==body.orderId)return respond({error:'ORDER_ALREADY_ASSIGNED'},409);
   state.orders.set(body.orderId,intent.id);intent.orderId=body.orderId;intent.paid=true;if(letter){letter.state='COMPLETED';letter.chapters=[{id:'test',title:'테스트 상담',summary:'[테스트 전용 예시] 실제 상담 결과가 아닙니다.',analysis:[],questionAnswers:[]}];letter.recovery={canRetryNow:false,savedChapters:1,totalChapters:1};}save();return respond({orderId:body.orderId,requestId:intent.id,entitlement:'granted',durable:true});
  }
  const match=/^\/native\/maya\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(match){const intent=state.intents.get(match[2]);if(!intent)return respond({error:'RESULT_NOT_FOUND'},404);if(match[1]==='intents'&&method==='GET')return respond(intent);if(!intent.paid)return respond({error:'PAYMENT_REQUIRED'},402);if(method==='POST'){intent.result='[테스트 전용 예시] 이 내용은 실제 운세나 상담 결과가 아닙니다.';save();}return respond({id:intent.id,state:intent.result?'COMPLETED':'PENDING',...(intent.result?{prompt:intent.result}:{})});}
  return respond({error:'OFFLINE_FIXTURE_NOT_IMPLEMENTED'},501);
 }
 return {handle,state,product,letterProduct,sukuyoProduct};
}
