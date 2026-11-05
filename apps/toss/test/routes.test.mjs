import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const calls={profiles:[],prepared:[],followups:0};
const auth={_id:'identity',ownerId:'owner',userId:'owner',userKey:'123',environment:'SANDBOX'};
const mocks={
 tarotProducts:[],grants:[],deliveries:0,dailyCalls:[],nativeLove:[],nativeAstrology:[],nativeVedic:[],nativeZiwei:[],nativeNewYear:[],nativeKarma:[],libraryRows:[],
 auth:async()=>auth,profile:async(...args)=>calls.profiles.push(args),
 product:sku=>({productId:sku.includes(':')?sku.split(':')[1]:sku,serviceId:sku.includes(':')?sku.split(':')[0]:'yeongnyangi',sku,approvedPriceKRW:1,approved:true}),
 prepare:async(_env,user,body,options)=>{calls.prepared.push({user,body,options});return {_id:'a'.repeat(64),productId:body.productId,amountKRW:1,snapshot:{manifest:[{id:'part',title:'answer',ordinal:0}]}};},
 purchase:()=>({lean:async()=>null}),followup:async()=>{calls.followups++;return {};}
};
globalThis.__tossRouteMocks=mocks;
const stubMap={
 'worker/toss/letter.js':"import {TossError} from './policy.js';export const approvedLetterSale=domain=>{if(globalThis.__tossRouteMocks.letterApproved===domain)return {};throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);};export const prepareTossLetter=(...args)=>globalThis.__tossRouteMocks.letterPrepare(...args);export const prepareRecoveredTossLetter=(...args)=>globalThis.__tossRouteMocks.letterRecover(...args);export const recoverableLetterOrder=(...args)=>globalThis.__tossRouteMocks.letterOrder(...args);export const readRecoveringTossLetter=(...args)=>globalThis.__tossRouteMocks.letterDraft(...args);export const readTossLetter=async(...args)=>{try{return await globalThis.__tossRouteMocks.letterRead(...args);}catch(error){if(error.code==='ACCESS_DENIED')throw new TossError(error.code,error.status);throw error;}};",
 'worker/toss/letter-library.js':"export const letterLibraryPage=(...args)=>globalThis.__tossRouteMocks.letterList(...args);",
 'worker/toss/native-life-book.js':"export const prepareNativeLifeBook=()=>{};export const handleNativeLifeBook=()=>{};export const nativeLifeBookLibraryItem=()=>{};",
 'worker/toss/native-karma.js':"import {TossError} from './policy.js';const state=globalThis.__tossRouteMocks;export const prepareNativeKarma=(...args)=>{state.nativeKarma.push(args);return {id:'offline-intent'};};export const handleNativeKarma=(...args)=>{state.nativeKarma.push(args);if(state.nativeFailure)throw new TossError(state.nativeFailure.code,state.nativeFailure.status);return Response.json({ok:true,source:'original-karma'});};export const nativeKarmaLibraryItem=()=>{};",
 'worker/toss/native-new-year.js':"import {TossError} from './policy.js';const state=globalThis.__tossRouteMocks;export const prepareNativeNewYear=(...args)=>{state.nativeNewYear.push(args);return {id:'offline-intent'};};export const handleNativeNewYear=(...args)=>{state.nativeNewYear.push(args);if(state.nativeFailure)throw new TossError(state.nativeFailure.code,state.nativeFailure.status);return Response.json({ok:true,source:'original-new-year'});};export const nativeNewYearLibraryItem=()=>{};",
 'worker/toss/native-love-secret.js':"const calls=globalThis.__tossRouteMocks.nativeLove;export const prepareNativeLoveSecret=(...args)=>{calls.push(args);return {id:'offline-intent'};};export const handleNativeLoveSecret=(...args)=>{calls.push(args);return Response.json({ok:true,source:'original-love'});};export const nativeLoveSecretLibraryItem=()=>{};",
 'worker/toss/native-vedic.js':"import {TossError} from './policy.js';const state=globalThis.__tossRouteMocks;export const prepareNativeVedic=(...args)=>{state.nativeVedic.push(args);return {id:'offline-intent'};};export const handleNativeVedic=(...args)=>{state.nativeVedic.push(args);if(state.nativeFailure)throw new TossError(state.nativeFailure.code,state.nativeFailure.status);return Response.json({ok:true,source:'original-vedic'});};export const nativeVedicLibraryItem=()=>{};",
 'worker/toss/native-ziwei.js':"import {TossError} from './policy.js';const state=globalThis.__tossRouteMocks;export const prepareNativeZiwei=(...args)=>{state.nativeZiwei.push(args);return {id:'offline-intent'};};export const handleNativeZiwei=(...args)=>{state.nativeZiwei.push(args);if(state.nativeFailure)throw new TossError(state.nativeFailure.code,state.nativeFailure.status);return Response.json({ok:true,source:'original-ziwei'});};export const nativeZiweiLibraryItem=()=>{};",
 'worker/toss/native-astrology.js':"import {TossError} from './policy.js';const state=globalThis.__tossRouteMocks;export const prepareNativeAstrology=(...args)=>{state.nativeAstrology.push(args);return {id:'offline-intent'};};export const handleNativeAstrology=(...args)=>{state.nativeAstrology.push(args);if(state.nativeFailure)throw new TossError(state.nativeFailure.code,state.nativeFailure.status);return Response.json({ok:true,source:'original-astrology'});};export const nativeAstrologyLibraryItem=()=>{};",
 'worker/toss/native-fusion.js':"import {TossError} from './policy.js';export const prepareNativeFusion=()=>{};export const handleNativeFusion=()=>{const error=globalThis.__tossRouteMocks.nativeFailure;if(error)throw new TossError(error.code,error.status);};export const nativeFusionLibraryItem=()=>{};",
 'worker/toss/native-neo.js':"export const prepareNativeNeo=()=>{};export const handleNativeNeo=()=>{};export const nativeNeoLibraryItem=()=>{};",
 'worker/toss/native-tea.js':"export const nativeTeaCatalog=()=>[];export const prepareNativeTea=()=>{throw Error('not used')};export const readNativeTeaIntent=()=>{};export const handleNativeTea=()=>{};export const approvedNativeTeaProduct=()=>{};",
 'worker/routes/profile.js':"export const normalizeIncomingProfile=x=>x;export const validateRequiredBirth=x=>({ok:!!x?.birth,birth:x?.birth});export const toClientProfile=x=>x;",
 'worker/toss/manse.js':"export const calculateTossManse=async()=>({stored:false});",
 'worker/yeongnyangi/fortune/question-sky.ts':"export const resolveCurrentLocation=x=>({latitude:x.latitude,longitude:x.longitude,timezone:'Asia/Seoul'});",
 'worker/yeongnyangi/retry.js':"export const retryFortune=(...args)=>globalThis.__tossRouteMocks.retry(...args);",
 'worker/toss/session.js':"import {TossError} from './policy.js';export const requireTossSession=async()=>{if(globalThis.__tossRouteMocks.denyAuth)throw new TossError('LOGIN_REQUIRED',401);return globalThis.__tossRouteMocks.auth();};export const createTossSession=()=>{};export const invalidateIdentity=()=>{};export const disconnectIdentity=()=>{};",
 'worker/toss/catalog.js':"import {TossError} from './policy.js';export const APPROVED_TOSS_PRODUCTS=[];export const assertUniqueApprovedSaleSkus=()=>{if(globalThis.__tossRouteMocks.skuConflict)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);};export const APPROVED_TOSS_NATIVE_PRODUCTS=[];export const APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS=globalThis.__tossRouteMocks.tarotProducts;export const approvedProduct=(...args)=>globalThis.__tossRouteMocks.product(...args);",
 'worker/toss/models.js':"export const TossPurchase={findOne:(...args)=>globalThis.__tossRouteMocks.purchase(...args),find:()=>({sort:()=>({limit:()=>({lean:async()=>globalThis.__tossRouteMocks.libraryRows})})})};export const TossSession={};",
 'worker/toss/partner.js':"export const lookupOrder=(...args)=>globalThis.__tossRouteMocks.lookupOrder(...args);",
 'worker/toss/tarot-library.js':"export const tarotLibraryProduct=x=>x;export const tarotLibraryFlow=()=>{};export const tarotLibraryResult=()=>{};export const attachTarotLibraryInput=()=>{};export const grantTarotLibraryOrder=async args=>{globalThis.__tossRouteMocks.grants.push(args);return {orderId:args.order.orderId,durable:true,entitlement:'granted'};};export const deliverTarotLibraryOrder=()=>{globalThis.__tossRouteMocks.deliveries++;throw Error('grant must never generate')};",
 'worker/toss/grant.js':"export const grantVerifiedOrder=(...args)=>globalThis.__tossRouteMocks.genericGrant(...args);",
 'worker/toss/purchases.js':"export const purchaseStore={};export const recordTossRefund=()=>{};",
 'worker/lib/models.js':"export const ProfileCard={updateOne:globalThis.__tossRouteMocks.profile};export const PaidExecutionRecord={findOne:()=>({lean:async()=>null})};",
 'worker/lib/rate-limit.js':"export const incrementRateLimit=async()=>({count:1});",
 'worker/yeongnyangi/service.ts':"export const submitQuestionSkyFollowup=(...args)=>globalThis.__tossRouteMocks.skyFollowup(...args);export const experienceCheckFortune=async()=>({check:null});export const prepareFortune=globalThis.__tossRouteMocks.prepare;export const presentFortune=x=>x;export const drawTarotSpread=(...args)=>globalThis.__tossRouteMocks.draw(...args);",
 'worker/yeongnyangi/repository.js':"export const readRequest=(...args)=>globalThis.__tossRouteMocks.read(...args);export const resumeRequest=()=>{};",
 'worker/yeongnyangi/queue.js':"export const enqueueConsultation=()=>{};",
 'worker/yeongnyangi/fortune/index.ts':"export const domains={};",
 'worker/toss/flower.js':"export const matchTossFlowers=async()=>{globalThis.__tossRouteMocks.flowerCalls++;return {sources:{},stored:false};};",
 'worker/toss/daily.js':"const call=(...args)=>{globalThis.__tossRouteMocks.dailyCalls.push(args);return {ok:true};};export const attendanceStatus=call,attend=call,unlockToday=call,getFreeReading=call,prepareTossDaily=call;",
 'worker/yeongnyangi/question-followup.ts':"export const questionConversation=globalThis.__tossRouteMocks.followup;"
};
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/routes.js')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline-boundaries',setup(b){b.onLoad({filter:/\.(js|ts)$/},args=>{const source=stubMap[path.relative(root,args.path).replaceAll('\\','/')];if(source)return {contents:source,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'toss-route-check.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {handleTossRoutes}=loaded.exports;
const birth={gender:'F',date:{year:1990,month:1,day:1,calType:'solar',timeUnknown:true},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
const decision={version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'대화할 때 내 경계를 말하고 싶어요',options:'',period:'',constraints:'',confirmed:true};
const input=()=>({attemptId:crypto.randomUUID(),sku:'saju_mackerel',question:'어떻게 내 경계를 표현할까?',birth:structuredClone(birth),questionDecision:{...decision}});
async function request(body,path='/prepare',env={TOSS_RELEASE_READY:'true'}){
 calls.profiles=[];calls.prepared=[];calls.followups=0;
 return handleTossRoutes(new Request('https://code-destiny.com/api/toss'+path,{method:'POST',headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com','Content-Type':'application/json'},body:JSON.stringify(body)}),env);
}
test('release gate prevents any profile or prepared row write',async()=>{const r=await request(input(),'/prepare',{});assert.equal(r.status,503);assert.equal(calls.profiles.length,0);assert.equal(calls.prepared.length,0);});
test('astrology routes require release and account, and preserve denied result access',async()=>{
 mocks.nativeAstrology.length=0;assert.equal((await request({input:{question:'x'}},'/native/astrology/prepare',{})).status,503);assert.equal(mocks.nativeAstrology.length,0);
 mocks.denyAuth=true;try{assert.equal((await request({input:{}},'/native/astrology/prepare')).status,401);}finally{mocks.denyAuth=false;}
 const prepared=await request({input:{question:'x'}},'/native/astrology/prepare');assert.equal(prepared.status,200);assert.equal(mocks.nativeAstrology.at(-1)[1],auth);
 mocks.nativeFailure={code:'ACCESS_DENIED',status:403};try{const denied=await request({},'/canonical/astrology-ai/start');assert.equal(denied.status,403);assert.equal((await denied.json()).error,'ACCESS_DENIED');}finally{mocks.nativeFailure=null;}
});
test('Ziwei routes require release and account, and preserve denied result access',async()=>{
 mocks.nativeZiwei.length=0;assert.equal((await request({input:{question:'x'}},'/native/ziwei/prepare',{})).status,503);assert.equal(mocks.nativeZiwei.length,0);
 mocks.denyAuth=true;try{assert.equal((await request({input:{}},'/native/ziwei/prepare')).status,401);}finally{mocks.denyAuth=false;}
 const prepared=await request({input:{question:'x'}},'/native/ziwei/prepare');assert.equal(prepared.status,200);assert.equal(mocks.nativeZiwei.at(-1)[1],auth);
 mocks.nativeFailure={code:'ACCESS_DENIED',status:403};try{const denied=await request({},'/canonical/ziwei-ai/start');assert.equal(denied.status,403);assert.equal((await denied.json()).error,'ACCESS_DENIED');}finally{mocks.nativeFailure=null;}
});
test('new year routes require release and account, and preserve denied result access',async()=>{
 mocks.nativeNewYear.length=0;assert.equal((await request({input:{question:'x'}},'/native/new-year/prepare',{})).status,503);assert.equal(mocks.nativeNewYear.length,0);
 mocks.denyAuth=true;try{assert.equal((await request({input:{}},'/native/new-year/prepare')).status,401);}finally{mocks.denyAuth=false;}
 const prepared=await request({input:{question:'x'}},'/native/new-year/prepare');assert.equal(prepared.status,200);assert.equal(mocks.nativeNewYear.at(-1)[1],auth);
 mocks.nativeFailure={code:'ACCESS_DENIED',status:403};try{const denied=await request({},'/canonical/new-year-ai/start');assert.equal(denied.status,403);assert.equal((await denied.json()).error,'ACCESS_DENIED');}finally{mocks.nativeFailure=null;}
});
test('karma routes require release and account, and preserve denied result access',async()=>{
 mocks.nativeKarma.length=0;assert.equal((await request({input:{question:'x'}},'/native/karma/prepare',{})).status,503);assert.equal(mocks.nativeKarma.length,0);
 mocks.denyAuth=true;try{assert.equal((await request({input:{}},'/native/karma/prepare')).status,401);}finally{mocks.denyAuth=false;}
 const prepared=await request({input:{question:'x'}},'/native/karma/prepare');assert.equal(prepared.status,200);assert.equal(mocks.nativeKarma.at(-1)[1],auth);
 mocks.nativeFailure={code:'ACCESS_DENIED',status:403};try{const denied=await request({},'/canonical/karma-destiny-ai/start');assert.equal(denied.status,403);assert.equal((await denied.json()).error,'ACCESS_DENIED');}finally{mocks.nativeFailure=null;}
});

test('conflicting sale SKUs block new orders but do not block an already stored tarot order',async()=>{
 const orderId='01900000-1111-7111-8111-000000000042',sku='old-sku';
 mocks.skuConflict=true;mocks.grants.length=0;
 mocks.purchase=()=>({lean:async()=>null});
 try{
  assert.equal((await request(input(),'/prepare')).status,503);
  assert.equal(calls.profiles.length,0);assert.equal(calls.prepared.length,0);
  assert.equal((await request({orderId,sku},'/orders/restore')).status,503);
  assert.equal((await request({orderId,sku},'/tarot-library/orders/grant')).status,503);
  mocks.purchase=()=>({lean:async()=>({sku,tarotFlowId:'tarot-mindscan',productId:'old-product'})});
  mocks.lookupOrder=async()=>({orderId,sku,status:'PURCHASED'});
  assert.equal((await request({orderId,sku},'/tarot-library/orders/grant')).status,200);
  assert.equal(mocks.grants.at(-1).product.sku,sku);
  mocks.lookupOrder=async()=>({orderId:'different-order',sku,status:'PURCHASED'});
  assert.equal((await request({orderId,sku},'/tarot-library/orders/grant')).status,403);
 }finally{mocks.skuConflict=false;mocks.purchase=()=>({lean:async()=>null});}
});

test('Fusion preflight authority errors retain retryability through the outer Toss router',async()=>{
 try{
  for(const [code,status] of [['ORDER_REFUNDED',409],['ORDER_OWNERSHIP_MISMATCH',403],['TOO_MANY_REQUESTS',429],['TOSS_PARTNER_UNAVAILABLE',502]]){
   mocks.nativeFailure={code,status};
   const response=await request({},'/canonical/fusion-fortune/generate/stream');
   assert.equal(response.status,status);
   const body=await response.json();assert.equal(body.error,code);assert.equal(body.retryable,status>=500||status===429);
  }
  mocks.nativeFailure=null;mocks.denyAuth=true;
  const response=await request({},'/canonical/fusion-fortune/result');
  assert.equal(response.status,401);assert.equal((await response.json()).retryable,false);
 }finally{mocks.nativeFailure=null;mocks.denyAuth=false;}
});

test('daily adapter requires release readiness and a verified account before any operation',async()=>{
 mocks.dailyCalls.length=0;
 for(const path of ['/daily/attendance','/daily/unlock','/daily/reading']){
  assert.equal((await request({category:'basic'},path,{})).status,503);
  mocks.denyAuth=true;
  try{assert.equal((await request({category:'basic'},path)).status,401);}finally{mocks.denyAuth=false;}
 }
 assert.equal(mocks.dailyCalls.length,0);
});

test('daily operations use the verified account instead of caller-supplied ownership',async()=>{
 mocks.dailyCalls.length=0;
 for(const path of ['/daily/attendance','/daily/unlock']){
  assert.equal((await request({userId:'attacker'},path)).status,200);
  assert.equal(mocks.dailyCalls.at(-1)[1],auth.userId);
 }
 assert.equal((await request({category:'basic',userId:'attacker'},'/daily/reading')).status,200);
 assert.equal(mocks.dailyCalls.at(-1)[1],auth);
});

test('tarot recovery routes the approved SKU on the server and acknowledges without generation',async()=>{
 const orderId='01900000-1111-7111-8111-000000000042',product={sku:'approved-tarot',flow:{id:'tarot-mindscan'}};
 mocks.tarotProducts.push(product);mocks.grants.length=0;mocks.deliveries=0;
 mocks.lookupOrder=async(_env,key,id)=>{assert.equal(key,auth.userKey);assert.equal(id,orderId);return {orderId,sku:product.sku,status:'PURCHASED'};};
 try{
  const restored=await request({orderId,sku:product.sku,input:{question:'ignore forged recovery input'}},'/orders/restore');
  assert.equal(restored.status,200);assert.equal((await restored.json()).durable,true);
  assert.equal(mocks.grants[0].input,undefined);assert.equal(mocks.grants[0].auth,auth);
  const granted=await request({orderId,sku:product.sku,input:{question:'forward to grant validation'}},'/tarot-library/orders/grant');
  assert.equal(granted.status,200);assert.equal(mocks.grants[1].input.question,'forward to grant validation');
  assert.equal(mocks.deliveries,0);assert.equal(calls.profiles.length,0);
 }finally{mocks.tarotProducts.length=0;}
});
test('missing or unconfirmed question scope is rejected before profile writes',async()=>{
 for(const form of [{...input(),questionDecision:undefined},{...input(),questionDecision:{...decision,confirmed:false}}]){const r=await request(form);assert.equal(r.status,400);assert.equal(calls.profiles.length,0);assert.equal(calls.prepared.length,0);}
});

test('current canonical policy permits the user to choose an approved consultation depth',async()=>{
 const r=await request({...input(),sku:'saju_salmon'});assert.equal(r.status,200);
 assert.equal(calls.prepared[0].body.productId,'saju_salmon');
});
test('server owns account and input profile identity and forwards current decision',async()=>{
 const r=await request({...input(),userId:'attacker',profileId:'unrelated'});assert.equal(r.status,200);
 assert.equal(calls.profiles[0][0].userId,'owner');assert.match(calls.prepared[0].body.profileId,/^toss-self-/);
 assert.equal(calls.prepared[0].user,'owner');assert.equal(calls.prepared[0].body.questionDecision.version,decision.version);
 assert.equal(calls.prepared[0].body.timeUnknown,true);
});
test('pair scope requires a second explicit target, preserves unknown time and never merges equal birthdays',async()=>{
 const form={...input(),sku:'saju_flounder',questionDecision:{...decision,target:'pair',category:'compatibility',relationshipType:'family'}};
 assert.equal((await request(form)).status,400);assert.equal(calls.profiles.length,0);
 const r=await request({...form,partnerBirth:structuredClone(birth)});assert.equal(r.status,200);
 const body=calls.prepared[0].body;assert.equal(body.consultationKind,'compatibility');assert.notEqual(body.profileId,body.partnerProfileId);assert.equal(body.partnerTimeUnknown,true);assert.equal(calls.profiles.length,2);
});
test('followup without an owned purchase never reaches a generation call',async()=>{const r=await request({id:crypto.randomUUID(),question:'내 질문'},'/results/'+'a'.repeat(64)+'/conversation');assert.equal(r.status,404);assert.equal(calls.followups,0);});

test('a direct consultation result without a Toss purchase never reads the saved record',async()=>{
 const previous={purchase:mocks.purchase,read:mocks.read};let reads=0;
 mocks.purchase=filter=>({lean:async()=>{assert.equal(filter.identityId,auth._id);assert.equal(filter.ownerId,auth.ownerId);assert.equal(filter.environment,auth.environment);return null;}});
 mocks.read=async()=>{reads++;throw Error('unowned result must not be read');};
 try{const id='a'.repeat(64);const response=await handleTossRoutes(new Request('https://code-destiny.com/api/toss/results/'+id,{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});assert.equal(response.status,404);assert.equal(reads,0);}
 finally{Object.assign(mocks,previous);}
});

test('original result contract rereads the owner-bound saved result and rejects refunded orders',async()=>{
 const previous={purchase:mocks.purchase,read:mocks.read,lookupOrder:mocks.lookupOrder};
 const id='a'.repeat(64),orderId='01900000-1111-7111-8111-000000000042';
 const saved={_id:id,paymentClaimOrderId:orderId,accessMethod:'TOSS_IAP',amountKRW:3000,productId:'saju_mackerel',state:'COMPLETED',snapshot:{},chapters:[{body:'서버에 저장된 원문'}]};
 mocks.purchase=filter=>({lean:async()=>{assert.equal(filter.identityId,auth._id);assert.equal(filter.ownerId,auth.ownerId);assert.equal(filter.environment,auth.environment);assert.equal(filter.requestId,id);return {_id:orderId,requestId:id,approvedPriceKRW:3000,sku:'saved-sku',productId:saved.productId,serviceId:'yeongnyangi'};}});
 mocks.read=async(_env,owner,requestId)=>{assert.equal(owner,auth.userId);assert.equal(requestId,id);return saved;};
 let status='PURCHASED';mocks.lookupOrder=async(_env,key)=>{assert.equal(key,auth.userKey);return {orderId,sku:'saved-sku',status};};
 const get=()=>handleTossRoutes(new Request('https://code-destiny.com/api/toss/canonical/yeongnyangi/requests/'+id,{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});
 try{
  for(let count=0;count<2;count++){const response=await get();assert.equal(response.status,200);assert.deepEqual(await response.json(),{fortune:saved});}
  for(const [key,value] of [['paymentClaimOrderId','another-order'],['accessMethod','WEB'],['amountKRW',3001],['_id','other']]){const original=saved[key];saved[key]=value;assert.equal((await get()).status,404);saved[key]=original;}
  status='REFUNDED';assert.equal((await get()).status,409);
  status='CANCELLED';assert.equal((await get()).status,409);
  mocks.denyAuth=true;assert.equal((await get()).status,401);
 }finally{Object.assign(mocks,previous);mocks.denyAuth=false;}
});

test('original generation and followup routes cannot use a caller-selected unowned result',async()=>{
 const previous=mocks.purchase;mocks.purchase=()=>({lean:async()=>null});
 try{
  for(const action of ['generate','activate','conversation']){
   const response=await request({userId:'attacker'},'/canonical/yeongnyangi/requests/'+'a'.repeat(64)+'/'+action);
   assert.equal(response.status,404);assert.equal(calls.followups,0);assert.equal(calls.prepared.length,0);
  }
 }finally{mocks.purchase=previous;}
});
test('flower requires verified Toss session before calculation and never writes profiles',async()=>{
 mocks.flowerCalls=0;mocks.denyAuth=true;
 try{const denied=await request({birth,userId:'attacker'},'/flower/match');assert.equal(denied.status,401);assert.equal(mocks.flowerCalls,0);}finally{mocks.denyAuth=false;}
 const allowed=await request({birth,userId:'attacker'},'/flower/match');assert.equal(allowed.status,200);assert.equal(mocks.flowerCalls,1);assert.equal(calls.profiles.length,0);
});
test('birth-based consultation systems preserve product and authenticated owner across preparation',async()=>{
 for(const domain of ['saju','astrology','ziwei','vedic','sukuyo']){
  const r=await request({...input(),sku:domain+'_mackerel',birth:{...birth,date:{...birth.date,timeUnknown:false,hour:14,minute:30}}});
  assert.equal(r.status,200,domain);assert.equal(calls.prepared[0].body.productId,domain+'_mackerel');assert.equal(calls.prepared[0].user,'owner');
 }
});
test('tarot preparation drops supplied birth data and does not create a profile',async()=>{
 const r=await request({...input(),sku:'tarot_mackerel',birth:undefined,tarotSpreadId:'test-spread',tarotInputs:{period:'week'}});
 assert.equal(r.status,200);assert.equal(calls.profiles.length,0);
 assert.equal(calls.prepared[0].body.profileId,'tarot-question');assert.equal(calls.prepared[0].body.tarotSpreadId,'test-spread');assert.equal(calls.prepared[0].body.timeUnknown,undefined);
});
test('draw route checks authenticated ownership and matching approved product before drawing',async()=>{
 let draws=0;mocks.read=async(_env,user,id)=>{assert.equal(user,'owner');assert.equal(id,'a'.repeat(64));return {productId:'tarot_mackerel'};};
 mocks.draw=async(_env,user,id,body)=>{assert.equal(user,'owner');assert.deepEqual(body,{method:'manual',picks:[1,5,9]});draws++;return {_id:id,state:'CREATED',snapshot:{}};};
 const route='/prepared/'+'a'.repeat(64)+'/draw';
 assert.equal((await request({sku:'saju_mackerel',method:'manual',picks:[1,5,9]},route)).status,404);assert.equal(draws,0);
 assert.equal((await request({sku:'tarot_mackerel',method:'manual',picks:[1,5,9]},route)).status,200);assert.equal(draws,1);
});


test('chat preparation derives persona and domain from server catalog, ignoring forged input',async()=>{
 for(const service of ['yeoni','neo']){
  const r=await request({...input(),sku:service+':chat_saju_mackerel',persona:'attacker',domain:'tarot',fishId:'tuna'});
  assert.equal(r.status,200);
  assert.deepEqual(calls.prepared[0].options,{persona:service});
  assert.equal(calls.prepared[0].body.domain,'saju');
  assert.equal(calls.prepared[0].body.fishId,'mackerel');
  assert.equal(calls.prepared[0].body.productId,'chat_saju_mackerel');
 }
});


test('tarot resume rejects an unpaid or cancelled partner order before attaching input or generating',async()=>{
 const previous=mocks.purchase,orderId='01900000-1111-7111-8111-000000000042';
 mocks.purchase=filter=>({lean:async()=>{assert.equal(filter.identityId,auth._id);assert.equal(filter.ownerId,auth.ownerId);assert.equal(filter.environment,auth.environment);return {_id:orderId,sku:'owned-sku',tarotFlowId:'tarot-mindscan'};}});
 mocks.deliveries=0;
 try{for(const status of ['PAYMENT_PENDING','CANCELLED','UNKNOWN']){
  mocks.lookupOrder=async()=>({orderId,sku:'owned-sku',status});
  const response=await request({input:{question:'must not attach'}},'/tarot-library/results/'+orderId);
  assert.equal(response.status,409);assert.equal((await response.json()).error,'ORDER_NOT_PAID');
 }
 assert.equal(mocks.deliveries,0);
 }finally{mocks.purchase=previous;}
});

test('manse requires release readiness and account, never creates a profile or purchase',async()=>{
 assert.equal((await request({birth},'/manse/calculate',{})).status,503);
 mocks.denyAuth=true;
 try{assert.equal((await request({birth},'/manse/calculate')).status,401);}finally{mocks.denyAuth=false;}
 const response=await request({birth},'/manse/calculate');
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{stored:false});
 assert.equal(calls.profiles.length,0);assert.equal(calls.prepared.length,0);
});

test('Love Secret routes require the release gate and verified account before the original adapter',async()=>{
 mocks.nativeLove.length=0;
 for(const path of ['/native/love-secret/prepare','/canonical/love-secret-ai/generate']){
  assert.equal((await request({input:{}},path,{})).status,503);
  mocks.denyAuth=true;try{assert.equal((await request({input:{}},path)).status,401);}finally{mocks.denyAuth=false;}
 }
 assert.equal(mocks.nativeLove.length,0);
 const prepared=await request({input:{requestId:'original-love'},userId:'attacker'},'/native/love-secret/prepare');
 assert.equal(prepared.status,200);assert.equal(mocks.nativeLove[0][1],auth);
 assert.deepEqual(mocks.nativeLove[0][2],{requestId:'original-love'});
 const generated=await request({userId:'attacker'},'/canonical/love-secret-ai/generate');
 assert.equal(generated.status,200);assert.equal(mocks.nativeLove.at(-1)[2],auth);
 assert.equal(mocks.nativeLove.at(-1)[3],'/generate');
});

for(const kind of ['consultation','tarot'])test('stored '+kind+' purchase restores after the sale SKU is retired',async()=>{
 const previous={purchase:mocks.purchase,lookupOrder:mocks.lookupOrder,product:mocks.product,genericGrant:mocks.genericGrant};
 const orderId='01900000-1111-7111-8111-000000000042',sku='retired-sku';
 const stored={_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,sku,
  serviceId:'yeongnyangi',productId:kind==='tarot'?'tarot-library:tarot-mindscan':'saju_mackerel',
  requestId:kind==='tarot'?'toss-tarot:'+orderId:'b'.repeat(64),approvedPriceKRW:3000,priceEvidence:'saved-approved-snapshot',status:'PURCHASED',
  ...(kind==='tarot'?{tarotFlowId:'tarot-mindscan',featureKey:'tarot-mindscan'}:{})};
 let generic=0;
 mocks.purchase=filter=>({lean:async()=>{assert.deepEqual(filter,{_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment});return stored;}});
 mocks.lookupOrder=async(_env,key,id)=>{assert.equal(key,auth.userKey);assert.equal(id,orderId);return {orderId,sku,status:'PURCHASED'};};
 mocks.product=()=>{throw Error('RETIRED_SALE_MUST_NOT_BE_REQUIRED');};
 mocks.genericGrant=async args=>{generic++;for(const key of ['productId','serviceId','approvedPriceKRW','priceEvidence'])assert.equal(args.product[key],stored[key]);assert.equal(args.requestId,null);return {orderId,requestId:stored.requestId,entitlement:'granted',durable:true};};
 mocks.grants.length=0;mocks.deliveries=0;
 try{
  const response=await request({orderId,sku,ownerId:'attacker',environment:'DEFAULT',approvedPriceKRW:1},'/orders/restore');
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  assert.equal((await response.json()).durable,true);
  if(kind==='tarot'){
   assert.equal(generic,0);assert.equal(mocks.grants.length,1);
   assert.equal(mocks.grants[0].product.tarotFlowId,stored.tarotFlowId);
   assert.equal(mocks.grants[0].product.approvedPriceKRW,stored.approvedPriceKRW);
   assert.equal(mocks.grants[0].product.priceEvidence,stored.priceEvidence);
  }else{assert.equal(generic,1);assert.equal(mocks.grants.length,0);}
  assert.equal(mocks.deliveries,0);assert.equal(calls.prepared.length,0);
  const mismatch=await request({orderId,sku:'different-sku'},'/orders/restore');
  assert.equal(mismatch.status,403);
  const ownedLookup=mocks.purchase;mocks.purchase=()=>({lean:async()=>null});
  assert.equal((await request({orderId,sku},'/orders/restore')).status,503,'an unknown retired SKU must not create a new right');
  mocks.purchase=ownedLookup;mocks.lookupOrder=async()=>({orderId,sku,status:'REFUNDED'});
  assert.equal((await request({orderId,sku},'/orders/restore')).status,409,'an authoritative refund must still block restoration');
  assert.equal(generic,kind==='tarot'?0:1);assert.equal(mocks.grants.length,kind==='tarot'?1:0);assert.equal(mocks.deliveries,0);
 }finally{Object.assign(mocks,previous);mocks.grants.length=0;}
});

test('Toss sky followup checks the owned paid order before reusing the original one-question flow',async()=>{const prev={purchase:mocks.purchase,lookupOrder:mocks.lookupOrder,read:mocks.read,skyFollowup:mocks.skyFollowup};const id='a'.repeat(64),orderId='01900000-1111-7111-8111-000000000042',owned={_id:id,paymentClaimOrderId:orderId,amountKRW:3000,productId:'saju_mackerel',accessMethod:'TOSS_IAP'},order={orderId,sku:'sku',status:'PURCHASED'};let called=0;mocks.read=async()=>owned;mocks.lookupOrder=async()=>order;mocks.skyFollowup=async(_env,user,requestId,question)=>{called++;assert.equal(user,auth.userId);assert.equal(requestId,id);assert.equal(question,'이 관계에서 내가 조심할 점은 무엇인가요?');return {state:'PAID'};};try{mocks.purchase=()=>({lean:async()=>null});assert.equal((await request({question:'x'},'/canonical/yeongnyangi/requests/'+id+'/follow-up')).status,404);assert.equal(called,0);mocks.purchase=()=>({lean:async()=>({_id:orderId,requestId:id,approvedPriceKRW:3000,sku:'sku',serviceId:'yeongnyangi',productId:'saju_mackerel'})});order.status='REFUNDED';assert.equal((await request({question:'x'},'/canonical/yeongnyangi/requests/'+id+'/follow-up')).status,409);assert.equal(called,0);order.status='PURCHASED';assert.equal((await request({question:'이 관계에서 내가 조심할 점은 무엇인가요?'},'/canonical/yeongnyangi/requests/'+id+'/follow-up')).status,202);assert.equal(called,1);assert.equal((await request({question:'x'},'/results/'+id+'/follow-up')).status,404);assert.equal(called,1);mocks.skyFollowup=async()=>{throw Object.assign(new Error('private'),{code:'FOLLOWUP_ALREADY_USED',status:409});};const used=await request({question:'x'},'/canonical/yeongnyangi/requests/'+id+'/follow-up');assert.equal(used.status,409);assert.equal((await used.json()).error,'FOLLOWUP_ALREADY_USED');}finally{Object.assign(mocks,prev);}});

test('both Toss purchase libraries verify partner orders before exposing a result',async()=>{const previous={read:mocks.read,lookupOrder:mocks.lookupOrder};const orderId='01900000-1111-7111-8111-000000000042',id='a'.repeat(64),row={_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,sku:'sku',productId:'saju_mackerel',serviceId:'yeongnyangi',requestId:id,approvedPriceKRW:3000,tarotFlowId:'',status:'PURCHASED',grantedAt:new Date()};mocks.libraryRows=[row];mocks.read=async()=>({_id:id,paymentClaimOrderId:orderId,accessMethod:'TOSS_IAP',amountKRW:3000,productId:'saju_mackerel',state:'COMPLETED',snapshot:{manifest:[],product:{id:'saju_mackerel'}},chapters:[]});const get=path=>handleTossRoutes(new Request('https://code-destiny.com/api/toss'+path,{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});try{for(const status of ['PURCHASED','REFUNDED','PAYMENT_PENDING']){mocks.lookupOrder=async()=>({orderId,sku:'sku',status});const response=await get('/library');assert.equal(response.status,200);const item=(await response.json()).purchases[0];assert.equal(item.state,status==='PURCHASED'?'COMPLETED':status==='REFUNDED'?'REFUNDED':'READ_FAILED');const canonical=await get('/canonical/yeongnyangi/requests');if(status==='PAYMENT_PENDING'){assert.equal(canonical.status,503);}else{assert.equal(canonical.status,200);const fortunes=(await canonical.json()).fortunes;if(status==='REFUNDED')assert.deepEqual(fortunes,[]);else assert.equal(fortunes[0].state,item.state);}}mocks.lookupOrder=async()=>({orderId,sku:'wrong',status:'PURCHASED'});assert.equal((await get('/library')).status,403);assert.equal((await get('/canonical/yeongnyangi/requests')).status,403);}finally{mocks.libraryRows=[];Object.assign(mocks,previous);}});

test('canonical records expose only owner-bound, verified direct result links',async()=>{const before={read:mocks.read,lookupOrder:mocks.lookupOrder},orderId='01900000-1111-7111-8111-000000000042',id='a'.repeat(64),row={_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,sku:'sku',productId:'saju_mackerel',serviceId:'yeongnyangi',requestId:id,approvedPriceKRW:3000,tarotFlowId:'',status:'PURCHASED',grantedAt:new Date()};mocks.libraryRows=[row];mocks.read=async()=>({_id:id,paymentClaimOrderId:orderId,accessMethod:'TOSS_IAP',amountKRW:3000,productId:row.productId,state:'COMPLETED',snapshot:{manifest:[],analysis:{consultation:{question:'검증된 질문'}}},chapters:[]});const get=()=>handleTossRoutes(new Request('https://code-destiny.com/api/toss/canonical/records?group=all',{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});try{mocks.lookupOrder=async()=>({orderId,sku:'sku',status:'PURCHASED'});let response=await get();assert.equal(response.status,200);assert.equal((await response.json()).items[0].href,'/yeongnyangi/result/?id='+id);mocks.lookupOrder=async()=>({orderId,sku:'sku',status:'REFUNDED'});response=await get();assert.equal((await response.json()).items.length,0);mocks.lookupOrder=async()=>({orderId,sku:'sku',status:'PAYMENT_PENDING'});response=await get();assert.equal(response.status,503);mocks.lookupOrder=async()=>({orderId,sku:'wrong',status:'PURCHASED'});response=await get();assert.equal(response.status,403);}finally{mocks.libraryRows=[];Object.assign(mocks,before);}});

test('letter creation uses authenticated identity and refuses release or login failures',async()=>{
 let calls=0;mocks.letterPrepare=async(_env,owner,input)=>{calls++;assert.equal(owner,auth);assert.equal(input.persona,'yeoni');return {ok:true,consultation:{id:'a'.repeat(64)}};};
 const body={persona:'yeoni',domain:'saju',question:'질문'};
 try{assert.equal((await request(body,'/canonical/fortune-chat/consultations',{TOSS_RELEASE_READY:'false'})).status,503);assert.equal(calls,0);mocks.denyAuth=true;assert.equal((await request(body,'/canonical/fortune-chat/consultations')).status,401);assert.equal(calls,0);mocks.denyAuth=false;assert.equal((await request(body,'/canonical/fortune-chat/consultations')).status,201);assert.equal(calls,1);}finally{mocks.denyAuth=false;delete mocks.letterPrepare;}
});
test('letter retry checks paid authority before and after queueing',async()=>{
 const id='a'.repeat(64),previous={retry:mocks.retry,letterRead:mocks.letterRead};let reads=0,retries=0,deny=true;
 mocks.letterRead=async(_env,owner,requestId,options)=>{assert.equal(owner,auth);assert.equal(requestId,id);assert.equal(options.requirePaid,true);reads++;if(deny)throw Object.assign(new Error('denied'),{code:'ACCESS_DENIED',status:403});return {ok:true,consultation:{id,paid:true}};};
 mocks.retry=async()=>{retries++;return {};};
 try{assert.equal((await request({},'/canonical/fortune-chat/consultations/'+id+'/generate')).status,403);assert.equal(retries,0);deny=false;assert.equal((await request({},'/canonical/fortune-chat/consultations/'+id+'/generate')).status,200);assert.equal(reads,3);assert.equal(retries,1);}finally{Object.assign(mocks,previous);}
});

test('letter status only enables when a product passes approval and exact-price checks',async()=>{const get=()=>handleTossRoutes(new Request('https://code-destiny.com/api/toss/canonical/fortune-chat/consultations/status',{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});try{delete mocks.letterApproved;assert.equal((await (await get()).json()).enabled,false);mocks.letterApproved='saju';assert.equal((await (await get()).json()).enabled,true);}finally{delete mocks.letterApproved;}});

test('letter recovery prepares only the explicitly selected order and input',async()=>{let seen;mocks.letterRecover=async(_env,owner,orderId,input)=>{seen={owner,orderId,input};return {ok:true,consultation:{id:'a'.repeat(64)}};};try{const body={orderId:'01900000-1111-7111-8111-000000000001',consultation:{persona:'yeoni',domain:'saju',question:'명시적인 질문'}};const response=await request(body,'/canonical/fortune-chat/consultations/recover');assert.equal(response.status,201);assert.equal(seen.owner,auth);assert.equal(seen.orderId,body.orderId);assert.deepEqual(seen.input,body.consultation);}finally{delete mocks.letterRecover;}});

test('letter recovery GET preserves the selected owner, order and draft',async()=>{const orderId='01900000-1111-7111-8111-000000000001',id='a'.repeat(64),seen=[];mocks.letterOrder=async(_env,owner,order)=>{seen.push({owner,order});return {order:{orderId:order,status:'UNASSIGNED'}};};mocks.letterDraft=async(_env,owner,order,draft)=>{seen.push({owner,order,draft});return {consultation:{id:draft}};};const get=path=>handleTossRoutes(new Request('https://code-destiny.com/api/toss'+path,{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});try{assert.equal((await get('/canonical/fortune-chat/recovery/'+orderId)).status,200);assert.equal((await get('/canonical/fortune-chat/recovery/'+orderId+'/draft/'+id)).status,200);assert.equal(seen[0].owner,auth);assert.equal(seen[0].order,orderId);assert.equal(seen[1].draft,id);}finally{delete mocks.letterOrder;delete mocks.letterDraft;}});

test('Vedic routes require release and account and preserve denied result access',async()=>{
 mocks.nativeVedic.length=0;assert.equal((await request({input:{question:'x'}},'/native/vedic/prepare',{})).status,503);assert.equal(mocks.nativeVedic.length,0);
 mocks.denyAuth=true;try{assert.equal((await request({input:{}},'/native/vedic/prepare')).status,401);}finally{mocks.denyAuth=false;}
 const prepared=await request({input:{question:'x'}},'/native/vedic/prepare');assert.equal(prepared.status,200);assert.equal(mocks.nativeVedic.at(-1)[1],auth);
 mocks.nativeFailure={code:'ACCESS_DENIED',status:403};try{const denied=await request({},'/canonical/vedic-ai/start');assert.equal(denied.status,403);assert.equal((await denied.json()).error,'ACCESS_DENIED');}finally{mocks.nativeFailure=null;}
});
