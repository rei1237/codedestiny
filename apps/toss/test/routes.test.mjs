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
 tarotProducts:[],grants:[],deliveries:0,dailyCalls:[],nativeLove:[],
 auth:async()=>auth,profile:async(...args)=>calls.profiles.push(args),
 product:sku=>({productId:sku.includes(':')?sku.split(':')[1]:sku,serviceId:sku.includes(':')?sku.split(':')[0]:'yeongnyangi',sku,approvedPriceKRW:1,approved:true}),
 prepare:async(_env,user,body,options)=>{calls.prepared.push({user,body,options});return {_id:'a'.repeat(64),productId:body.productId,amountKRW:1,snapshot:{manifest:[{id:'part',title:'answer',ordinal:0}]}};},
 purchase:()=>({lean:async()=>null}),followup:async()=>{calls.followups++;return {};}
};
globalThis.__tossRouteMocks=mocks;
const stubMap={
 'worker/toss/native-life-book.js':"export const prepareNativeLifeBook=()=>{};export const handleNativeLifeBook=()=>{};export const nativeLifeBookLibraryItem=()=>{};",
 'worker/toss/native-love-secret.js':"const calls=globalThis.__tossRouteMocks.nativeLove;export const prepareNativeLoveSecret=(...args)=>{calls.push(args);return {id:'offline-intent'};};export const handleNativeLoveSecret=(...args)=>{calls.push(args);return Response.json({ok:true,source:'original-love'});};export const nativeLoveSecretLibraryItem=()=>{};",
 'worker/toss/native-fusion.js':"import {TossError} from './policy.js';export const prepareNativeFusion=()=>{};export const handleNativeFusion=()=>{const error=globalThis.__tossRouteMocks.nativeFailure;if(error)throw new TossError(error.code,error.status);};export const nativeFusionLibraryItem=()=>{};",
 'worker/toss/native-neo.js':"export const prepareNativeNeo=()=>{};export const handleNativeNeo=()=>{};export const nativeNeoLibraryItem=()=>{};",
 'worker/toss/native-tea.js':"export const nativeTeaCatalog=()=>[];export const prepareNativeTea=()=>{throw Error('not used')};export const readNativeTeaIntent=()=>{};export const handleNativeTea=()=>{};export const approvedNativeTeaProduct=()=>{};",
 'worker/routes/profile.js':"export const normalizeIncomingProfile=x=>x;export const validateRequiredBirth=x=>({ok:!!x?.birth,birth:x?.birth});export const toClientProfile=x=>x;",
 'worker/toss/manse.js':"export const calculateTossManse=async()=>({stored:false});",
 'worker/yeongnyangi/fortune/question-sky.ts':"export const resolveCurrentLocation=x=>({latitude:x.latitude,longitude:x.longitude,timezone:'Asia/Seoul'});",
 'worker/yeongnyangi/retry.js':"export const retryFortune=(...args)=>globalThis.__tossRouteMocks.retry(...args);",
 'worker/toss/session.js':"import {TossError} from './policy.js';export const requireTossSession=async()=>{if(globalThis.__tossRouteMocks.denyAuth)throw new TossError('LOGIN_REQUIRED',401);return globalThis.__tossRouteMocks.auth();};export const createTossSession=()=>{};export const invalidateIdentity=()=>{};export const disconnectIdentity=()=>{};",
 'worker/toss/catalog.js':"export const APPROVED_TOSS_PRODUCTS=[];export const APPROVED_TOSS_NATIVE_PRODUCTS=[];export const APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS=globalThis.__tossRouteMocks.tarotProducts;export const approvedProduct=(...args)=>globalThis.__tossRouteMocks.product(...args);",
 'worker/toss/models.js':"export const TossPurchase={findOne:(...args)=>globalThis.__tossRouteMocks.purchase(...args)};export const TossSession={};",
 'worker/toss/partner.js':"export const lookupOrder=(...args)=>globalThis.__tossRouteMocks.lookupOrder(...args);",
 'worker/toss/tarot-library.js':"export const tarotLibraryProduct=x=>x;export const tarotLibraryFlow=()=>{};export const tarotLibraryResult=()=>{};export const attachTarotLibraryInput=()=>{};export const grantTarotLibraryOrder=async args=>{globalThis.__tossRouteMocks.grants.push(args);return {orderId:args.order.orderId,durable:true,entitlement:'granted'};};export const deliverTarotLibraryOrder=()=>{globalThis.__tossRouteMocks.deliveries++;throw Error('grant must never generate')};",
 'worker/toss/grant.js':"export const grantVerifiedOrder=(...args)=>globalThis.__tossRouteMocks.genericGrant(...args);",
 'worker/toss/purchases.js':"export const purchaseStore={};export const recordTossRefund=()=>{};",
 'worker/lib/models.js':"export const ProfileCard={updateOne:globalThis.__tossRouteMocks.profile};export const PaidExecutionRecord={findOne:()=>({lean:async()=>null})};",
 'worker/lib/rate-limit.js':"export const incrementRateLimit=async()=>({count:1});",
 'worker/yeongnyangi/service.ts':"export const experienceCheckFortune=async()=>({check:null});export const prepareFortune=globalThis.__tossRouteMocks.prepare;export const presentFortune=x=>x;export const drawTarotSpread=(...args)=>globalThis.__tossRouteMocks.draw(...args);",
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
 mocks.purchase=filter=>({lean:async()=>{assert.equal(filter.identityId,auth._id);assert.equal(filter.environment,auth.environment);return null;}});
 mocks.read=async()=>{reads++;throw Error('unowned result must not be read');};
 try{const id='a'.repeat(64);const response=await handleTossRoutes(new Request('https://code-destiny.com/api/toss/results/'+id,{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});assert.equal(response.status,404);assert.equal(reads,0);}
 finally{Object.assign(mocks,previous);}
});

test('original result contract rereads the owner-bound saved result and rejects refunded orders',async()=>{
 const previous={purchase:mocks.purchase,read:mocks.read,lookupOrder:mocks.lookupOrder};
 const id='a'.repeat(64),orderId='01900000-1111-7111-8111-000000000042';
 const saved={_id:id,productId:'saju_mackerel',state:'COMPLETED',snapshot:{},chapters:[{body:'서버에 저장된 원문'}]};
 mocks.purchase=filter=>({lean:async()=>{assert.equal(filter.identityId,auth._id);assert.equal(filter.environment,auth.environment);assert.equal(filter.requestId,id);return {_id:orderId,sku:'saved-sku',productId:saved.productId,serviceId:'yeongnyangi'};}});
 mocks.read=async(_env,owner,requestId)=>{assert.equal(owner,auth.userId);assert.equal(requestId,id);return saved;};
 let status='PURCHASED';mocks.lookupOrder=async(_env,key)=>{assert.equal(key,auth.userKey);return {orderId,sku:'saved-sku',status};};
 const get=()=>handleTossRoutes(new Request('https://code-destiny.com/api/toss/canonical/yeongnyangi/requests/'+id,{headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com'}}),{TOSS_RELEASE_READY:'true'});
 try{
  for(let count=0;count<2;count++){const response=await get();assert.equal(response.status,200);assert.deepEqual(await response.json(),{fortune:saved});}
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
 mocks.purchase=filter=>({lean:async()=>{assert.equal(filter.identityId,auth._id);assert.equal(filter.environment,auth.environment);return {_id:orderId,sku:'owned-sku',tarotFlowId:'tarot-mindscan'};}});
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
