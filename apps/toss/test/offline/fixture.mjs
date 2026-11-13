// Explicitly synthetic, local-only fixture for the official SDK devtools.
import {handleReviewFixture,reviewCatalog,offlineCatalog,safetyResponse} from './review-fixture.mjs';
import {roomProducts,roomRequest} from './room-fixture.mjs';
import {assembleChart} from '../../../../lib/human-design/chart.js';
import {DIRECT_PLANETS} from '../../../../lib/human-design/planets.js';
const chartFixture=()=>{const longitudes=shift=>Object.fromEntries(DIRECT_PLANETS.map((planet,index)=>[planet,(index*29+shift)%360]));return {stored:false,chart:assembleChart({personalityLongitudes:longitudes(12),designLongitudes:longitudes(284)})};};
export function createOfflineFixtureApi(storage,{now=()=>new Date()}={}){
 // Both synthetic people use the same device storage and API. Authenticate the
 // request before selecting a person's records, including on a fresh app launch.
 const primary=createAccountFixture(storage,'offline-test-user','local-mock-token',now);
 const secondary=createAccountFixture(storage,'offline-test-user-2','local-mock-token-2',now);
 return {...primary,async handle(request){
   const path=new URL(request.url).pathname;
   const second=path==='/api/toss/login'
     ?storage?.getItem('toss-offline-login-person')==='second'
     :request.headers.get('Authorization')==='Bearer local-mock-token-2';
   const current=second?secondary:primary,other=second?primary:secondary;
   if(path==='/api/toss/orders/grant'&&request.method==='POST'){
     const {orderId}=await request.clone().json();
     if(other.state.orders.has(orderId))return Response.json({error:'ORDER_MISMATCH'},{status:403});
   }
   return current.handle(request);
 }};
}
function createAccountFixture(storage,owner,token,now){
 const secondary=owner==='offline-test-user-2';
 const key=secondary?'toss-offline-fixture-2':'toss-offline-fixture';
 let saved;try{saved=JSON.parse(storage?.getItem(key)||'null');}catch{saved=null;}
 const state={profiles:saved?.profiles||[{id:'mock-profile',profileId:'mock-profile',name:'테스트 프로필',gender:'F',birthDate:'1990-01-01',timeUnknown:true,calendarType:'solar',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'solar'}}],loggedIn:saved?.loggedIn===true,intents:new Map(saved?.intents||[]),letters:new Map(saved?.letters||[]),fortunes:new Map(saved?.fortunes||[]),
  daily:saved?.daily||{day:null,balance:2,attended:false,unlocked:false,readings:{}},orders:new Map(saved?.orders||[]),testOrderSkus:new Map(saved?.testOrderSkus||[]),sequence:Number.isSafeInteger(saved?.sequence)?saved.sequence:(secondary?2**40:0)};
 const save=()=>{try{storage?.setItem(key,JSON.stringify({profiles:state.profiles,loggedIn:state.loggedIn,intents:[...state.intents],letters:[...state.letters],fortunes:[...state.fortunes],daily:state.daily,orders:[...state.orders],testOrderSkus:[...state.testOrderSkus],sequence:state.sequence}));return Boolean(storage);}catch{return false;}};
 const letterProduct=reviewCatalog.find(p=>p.id==='yeoni:chat_saju');
 const product={id:'native:maya:maya-prompt-generator',name:'테스트 상품',sku:'mock-maya',featureKey:'maya-prompt-generator',approvedPriceKRW:1,available:true};
 const sukuyoProduct={id:'native:sukuyo:sukuyo-compatibility-ai',name:'테스트 숙요 상담',sku:'mock-sukuyo',featureKey:'sukuyo-compatibility-ai',approvedPriceKRW:1,available:true};
 const relationshipProduct={id:'native:relationship:relationship-boundary-test',name:'테스트 관계 상담',sku:'mock-relationship',featureKey:'relationship-boundary-test',approvedPriceKRW:1,available:true};
 const respond=(value,status=200)=>Response.json(value,{status});
 const denied=()=>respond({error:'LOGIN_REQUIRED'},401);
 async function handle(request){
  const url=new URL(request.url),path=url.pathname.slice('/api/toss'.length),method=request.method;
  if(path==='/login'&&method==='POST'){state.loggedIn=true;save();return respond({token});}
  // Public product lists mirror worker/toss/routes.js; private requests below still require the mock session.
  if(path==='/catalog'&&method==='GET')return respond({products:offlineCatalog});
  if(path==='/tarot-library/free'&&method==='POST'){
   const {freeTarotReading}=await import('../../../../worker/toss/tarot-library.js');const {flowId,input}=await request.json();return respond(await freeTarotReading(flowId,input));
  }
  if(path==='/tarot-library/catalog'&&method==='GET')return respond({flows:[]});
  if(path==='/canonical/yeongnyangi/products'&&method==='GET')return handleReviewFixture(request,url,path,state,save,now);
  if(!state.loggedIn||request.headers.get('Authorization')!=='Bearer '+token)return denied();
  if(path==='/logout'&&method==='POST'){state.loggedIn=false;save();return respond({ok:true});}
  if(path==='/session'&&method==='GET')return respond({authenticated:true,environment:'SANDBOX'});
  if(path==='/today-hub'&&method==='POST'){
   const {profileId,period}=await request.json();
   if(!['today','tomorrow'].includes(period)||typeof profileId!=='string')return respond({error:'INVALID_INPUT'},400);
   if(profileId&&!state.profiles.some(p=>p.profileId===profileId))return respond({error:'PROFILE_NOT_FOUND'},404);
   const {hubDay}=await import('../../../../lib/fortune/hub-period.mjs');
   const {buildTodayNumberDetail,buildTodayNumberPublic}=await import('../../../../worker/lib/today-number-detail.js');
   const target=hubDay(period,now()),number=profileId?buildTodayNumberDetail({month:1,day:1},target):buildTodayNumberPublic(target);
   const demo=(system,label)=>({system,label,anchor:'모의 차트',headline:'테스트용 '+label,body:'오프라인 차트 입력 표시 확인',sections:[]});
   return respond({ok:true,date:[target.year,target.month,target.day].map(n=>String(n).padStart(2,'0')).join('-'),personalized:!!profileId,
    systems:{saju:demo('saju','사주 일진'),sukuyo:demo('sukuyo','숙요 27수'),vedic:demo('vedic','베다 판창가'),number}});
  }
  if(path==='/canonical/geocode'&&method==='GET'){
   return url.searchParams.get('place')==='서울'
    ?respond({name:'서울',lat:37.5665,lng:126.978,timezone:'Asia/Seoul',fallback:false})
    :respond({error:'PLACE_NOT_FOUND'},404);
  }
  const delay=Number(storage?.getItem('toss-offline-generation-delay-ms'));
  const roomResponse=await roomRequest(request,url,path,state,save,now);if(roomResponse)return roomResponse;
  const reviewResponse=await handleReviewFixture(request,url,path,state,save,now,Number.isFinite(delay)?Math.max(0,delay):0);if(reviewResponse)return reviewResponse;
  // This fixed chart is synthetic and never uses the submitted birth data.
  // The offline shell labels all of its output as test-only.
  if((path==='/charts/astrology'||path==='/charts/vedic')&&method==='POST'){
   const body=await request.json();
   const system=path.endsWith('/vedic')?'vedic':'astrology';
   if(body?.birth?.date?.timeUnknown)return respond({error:'BIRTH_TIME_REQUIRED'},400);
   const names=system==='vedic'?['태양','달','화성','수성','목성','금성','토성','라후','케투']:['태양','달','수성','금성','화성','목성','토성','천왕성','해왕성','명왕성'];
   return respond({system,ascendant:'양자리',positions:names.map((name,i)=>({name,sign:'양자리',house:i+1})),...(system==='vedic'?{mansion:{name:'아슈위니',pada:1}}:{})});
  }
  if(path==='/human-design/chart'&&method==='POST')return respond(chartFixture());
  if(path==='/canonical/auth/me'&&method==='GET')return respond({ok:true,authenticated:true,user:{id:owner,name:'테스트 사용자',role:'user'}});
  if(path==='/native/catalog'&&method==='GET')return respond({products:[product,sukuyoProduct,relationshipProduct,...roomProducts]});
  if(path==='/canonical/yeongnyangi/profiles'&&method==='GET')return respond({ok:true,profiles:state.profiles,currentId:state.profiles.at(-1)?.profileId});
  if(path==='/canonical/yeongnyangi/profiles'&&method==='POST'){
   const {profile}=await request.json();if(!profile?.profileId||!profile.birth?.year)return respond({error:'BIRTH_INVALID'},400);
   // Persist only a synthetic profile associated with the generated ID.
   const row={...state.profiles[0],id:profile.profileId,profileId:profile.profileId};
   if(!state.profiles.some(p=>p.id===row.id))state.profiles.push(row);save();return respond({ok:true,profile:row});
  }
  if(path==='/canonical/profile'&&method==='GET')return respond({ok:true,profiles:[]});
  if(path==='/canonical/saju/career-style'&&['GET','POST'].includes(method)){
   const profileId=method==='GET'?url.searchParams.get('profileId'):(await request.json()).profileId;
   const profile=state.profiles.find(p=>p.profileId===profileId);
   if(!profile)return respond({error:'INVALID_PROFILE'},403);
   const access={ok:true,profileId,unlocked:true,priceKRW:0,accessSource:'public'};
   if(method==='GET')return respond(access);
   const {buildCareerReport}=await import('../../../../lib/saju/career-style/report.mjs');
   return respond({...access,saved:false,report:buildCareerReport({birthDate:profile.birthDate,birthTimeUnknown:profile.timeUnknown,calendarType:profile.calendarType})});
  }
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
  if(path==='/canonical/fortune-chat/consultations'&&method==='POST'){const body=await request.json(),notice=safetyResponse(body);if(notice)return notice;const id=(++state.sequence).toString(16).padStart(64,'0'),row={id,persona:'yeoni',productId:'chat_saju',state:'CREATED',paid:false,chapters:[],manifest:[{id:'test',title:'테스트 상담'}],consultation:{question:String(body.question||'테스트 질문')},createdAt:new Date().toISOString(),recovery:{canRetryNow:false,savedChapters:0,totalChapters:1}};state.letters.set(id,row);save();return respond({ok:true,consultation:row});}
  const letter=/^\/canonical\/fortune-chat\/consultations\/([a-f0-9]{64})(?:\/(generate))?$/.exec(path);
  if(letter){const row=state.letters.get(letter[1]);if(!row)return respond({error:'RESULT_NOT_FOUND'},404);if(letter[2]&&method==='POST'&&!row.paid)return respond({error:'PAYMENT_REQUIRED'},402);return respond({ok:true,consultation:row});}
  if(path==='/events'&&method==='POST')return respond({ok:true});
  if(path==='/native/maya/prepare'&&method==='POST'){
   const body=await request.json();if(!body.input||body.orderId)return respond({error:'MOCK_UNSUPPORTED'},400);
   const id=(++state.sequence).toString(16).padStart(64,'0');const intent={id,sku:product.sku,amountKRW:product.approvedPriceKRW,paid:false,orderId:null,input:body.input};state.intents.set(id,intent);save();return respond(intent);
  }
  if(path==='/orders/grant'&&method==='POST'){
   const body=await request.json(),intent=[product.sku,sukuyoProduct.sku,relationshipProduct.sku,...roomProducts.map(p=>p.sku)].includes(body.sku)?state.intents.get(body.requestId):null;if(!intent||intent.sku&&intent.sku!==body.sku||typeof body.orderId!=='string')return respond({error:'ORDER_MISMATCH'},403);
   const prior=state.orders.get(body.orderId);if(prior&&prior!==intent.id||intent.orderId&&intent.orderId!==body.orderId)return respond({error:'ORDER_ALREADY_ASSIGNED'},409);
   state.orders.set(body.orderId,intent.id);intent.orderId=body.orderId;intent.paid=true;save();return respond({orderId:body.orderId,requestId:intent.id,entitlement:'granted',durable:true});
  }
  const match=/^\/native\/maya\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(match){const intent=state.intents.get(match[2]);if(!intent)return respond({error:'RESULT_NOT_FOUND'},404);if(match[1]==='intents'&&method==='GET')return respond(intent);if(!intent.paid)return respond({error:'PAYMENT_REQUIRED'},402);if(method==='POST'){intent.result='[테스트 전용 예시] 이 내용은 실제 운세나 상담 결과가 아닙니다.';save();}return respond({id:intent.id,state:intent.result?'COMPLETED':'PENDING',...(intent.result?{prompt:intent.result}:{})});}
  return respond({error:'OFFLINE_FIXTURE_NOT_IMPLEMENTED'},501);
 }
 return {handle,state,product,letterProduct,sukuyoProduct};
}
