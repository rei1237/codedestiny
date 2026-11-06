import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const file=require('node:path').resolve(import.meta.dirname,'../../../worker/routes/karma-destiny-ai.js'),src=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function fn(name){let found;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.getText(ast);ts.forEachChild(n,walk);}walk(ast);assert.ok(found,name);return found.replace(/^export /,'');}
const json=(body,init={})=>({body,status:init.status||200}),clean=x=>String(x||'');

test('a web request cannot read a Toss-origin karma result',async()=>{
 const authorize=vm.runInNewContext('('+fn('authorizedKarmaRecord')+')',{nativeTossContext:()=>null});
 assert.equal(await authorize({}, {accessSource:'toss'}),false);
 assert.equal(await authorize({}, {accessSource:'web'}),true);
 assert.equal(await authorize({}, {}),true);
});
test('a Toss record requires a successful server-bound ownership check',async()=>{
 let checked=0;const doc={accessSource:'toss'};
 const authorize=vm.runInNewContext('('+fn('authorizedKarmaRecord')+')',{nativeTossContext:()=>({assertStored:async value=>{checked++;assert.equal(value,doc);throw Object.assign(Error('denied'),{status:403});}})});
 await assert.rejects(authorize({},doc),e=>e.status===403);assert.equal(checked,1);
});
test('Toss cannot list a latest karma result without a verified result identifier',async()=>{
 let queried=0;const ctx={URL,clean,json,invalidInput:(message,status)=>({message,status}),getOptionalUserFromRequest:async()=>({userId:'owner'}),connectDb:async()=>{},nativeTossContext:()=>({}),KarmaDestinyAiConsultation:{findOne:()=>{queried++;throw Error('must not query');}}};
 const result=vm.runInNewContext('('+fn('handleResult')+')',ctx);const response=await result({url:'https://example.invalid/api/karma-destiny-ai/result'}, {}, '/result');assert.equal(response.status,404);assert.equal(queried,0);
});
test('Toss cannot use the web access and billing preparation route',async()=>{
 const prepare=vm.runInNewContext('('+fn('handleEnsureAccess')+')',{nativeTossContext:()=>({}),notFound:()=>({status:404})});assert.equal((await prepare({},{})).status,404);
});
test('a denied completed karma result is not exposed by the start route',async()=>{
 let exposed=0;const doc={status:'completed',inputHash:'hash'};
 const ctx={clean,nativeTossContext:()=>null,readJson:async()=>({}),readIdempotencyKey:()=> 'request-0000001',normalizeConsultationInput:()=>({ok:true,inputHash:'hash'}),logKarmaAi:()=>{},safeLogPayload:()=>({}),getOptionalUserFromRequest:async()=>({userId:'owner'}),BILLING_SNAPSHOT_USER_PROJECTION:{},connectDb:async()=>{},getPricing:()=>({}),withMongoRetry:async(_env,read)=>read(),KarmaDestinyAiConsultation:{findOne:()=>({lean:async()=>doc})},authorizedKarmaRecord:async()=>{throw Object.assign(Error('denied'),{status:403});},publicSession:()=>{exposed++;return {};}};
 const start=vm.runInNewContext('('+fn('handleStart')+')',ctx);await assert.rejects(start({},{}),e=>e.status===403);assert.equal(exposed,0);
});
test('a denied completed karma result is not exposed by the batch route',async()=>{
 let exposed=0;const ctx={readJson:async()=>({sessionId:'saved'}),clean,nativeTossContext:()=>null,getOptionalUserFromRequest:async()=>({userId:'owner'}),BILLING_SNAPSHOT_USER_PROJECTION:{},connectDb:async()=>{},buildResultLookup:()=>({}),KarmaDestinyAiConsultation:{findOne:()=>({lean:async()=>({status:'completed'})})},authorizedKarmaRecord:async()=>{throw Object.assign(Error('denied'),{status:403});},publicSession:()=>{exposed++;return {};}};
 const batch=vm.runInNewContext('('+fn('handleGenerateBatch')+')',ctx);await assert.rejects(batch({},{}),e=>e.status===403);assert.equal(exposed,0);
});
test('Toss result preserves payment denial and never asks the web billing gate',async()=>{
 let webCalls=0;const native={auth:{userId:'owner'},access:async()=>{throw Object.assign(Error('denied'),{status:403});}};
 const ctx={URL,clean,json,nativeTossContext:()=>native,getOptionalUserFromRequest:async()=>native.auth,connectDb:async()=>{},buildResultLookup:()=>({}),KarmaDestinyAiConsultation:{findOne:()=>({lean:async()=>({id:'saved',status:'partial',inputHash:'hash',idempotencyKey:'request-0000001'})})},authorizedKarmaRecord:async()=>true,getPricing:()=>({}),resolveStartAccess:async()=>{webCalls++;return {ok:true};}};
 const result=vm.runInNewContext('('+fn('handleResult')+')',ctx);await assert.rejects(result({url:'https://example.invalid/api/karma-destiny-ai/result?sessionId=saved'}, {}, '/result'),e=>e.status===403);assert.equal(webCalls,0);
});
test('Toss result recovery rechecks purchase authority before attaching answers',async()=>{
 let checks=0;const doc={id:'saved',status:'completed',accessSource:'toss'},native={auth:{userId:'owner'},assertStored:async()=>{checks++;}};
 const ctx={URL,clean,json,nativeTossContext:()=>native,getOptionalUserFromRequest:async()=>native.auth,connectDb:async()=>{},buildResultLookup:()=>({}),KarmaDestinyAiConsultation:{findOne:()=>({lean:async()=>doc})},authorizedKarmaRecord:async()=>{await native.assertStored();return true;},FEATURE_KEY:'karma',recoverSavedExpertFollowUps:async options=>{await options.verifyAccess();return options.consultation;},publicSession:value=>({ok:true,status:value.status})};
 const result=vm.runInNewContext('('+fn('handleResult')+')',ctx);assert.equal((await result({url:'https://example.invalid/api/karma-destiny-ai/result?sessionId=saved'}, {}, '/result')).status,200);assert.equal(checks,2);
 native.assertStored=async()=>{throw Object.assign(Error('refunded'),{status:409,code:'ORDER_REFUNDED'});};await assert.rejects(result({url:'https://example.invalid/api/karma-destiny-ai/result?sessionId=saved'}, {}, '/result'),e=>e.code==='ORDER_REFUNDED');
});
test('Toss follow-up uses the bound account and rechecks the purchase',async()=>{
 let checks=0,delivered=0;const doc={id:'saved',userId:'owner',status:'completed',accessSource:'toss'};
 const native={auth:{userId:'owner'},assertStored:async value=>{assert.equal(value,doc);checks++;}};
 const ctx={readJson:async()=>({sessionId:'saved',message:'다음 선택은?'}),clean,nativeTossContext:()=>native,getOptionalUserFromRequest:async()=>native.auth,connectDb:async()=>{},KarmaDestinyAiConsultation:{findOne:filter=>({lean:async()=>filter.userId==='owner'?doc:null})},authorizedKarmaRecord:async(_request,value)=>{await native.assertStored(value);return true;},FEATURE_KEY:'karma-destiny-ai-consultation',deliverExpertFollowUp:async options=>{await options.verifyAccess();delivered++;return {status:200};},generateConsultationText:()=>{},buildFollowUpPrompt:()=>{},publicSession:()=>{}};
 const message=vm.runInNewContext('('+fn('handleMessage')+')',ctx);assert.equal((await message({},{})).status,200);assert.equal(checks,2);assert.equal(delivered,1);
 native.assertStored=async()=>{throw Object.assign(Error('refunded'),{status:409,code:'ORDER_REFUNDED'});};await assert.rejects(message({},{}),e=>e.code==='ORDER_REFUNDED');assert.equal(delivered,1);
});
test('Toss permission errors retain their status at the route boundary',async()=>{
 const ctx={getRoutePath:()=>'/result',handleResult:async()=>{throw Object.assign(Error('denied'),{status:403,code:'ACCESS_DENIED'});},nativeTossContext:()=>({}),json};
 const route=vm.runInNewContext('('+fn('handleKarmaDestinyAiRoutes')+')',ctx);const response=await route({method:'GET'},{});assert.equal(response.status,403);assert.equal(response.body.reason,'ACCESS_DENIED');
});
test('purchase preparation rejects a conflicting record or missing calculation',async()=>{
 let existing=null,calculated=0,birthInfo={},result={lenses:{saju:{confidence:'full'}}},lunarValid=true;
 const ctx={nativeKarmaContract:()=>({requestId:'request-0000001',inputHash:'hash'}),normalizeConsultationInput:()=>({input:{birthInfo}}),lunarToSolar:(_y,_m,_d,leap)=>leap&&lunarValid?{}:null,connectDb:async()=>{},nativeKarmaStoredState:async()=>existing,buildKarmaDestinyIntegratedResult:async()=>{calculated++;return result;},LENS_USAGE_WEIGHTS:{},LENS_IDS:['saju','vedic'],sajuAuthorityOn:()=>false,clean,CALCULATION_ERROR_MESSAGE:'계산 오류'};
 const prepare=vm.runInNewContext('('+fn('prepareNativeKarmaCalculation')+')',ctx);await prepare({}, {userId:'owner'}, {});assert.equal(calculated,1);
 existing={accessSource:'web',inputHash:'hash'};await assert.rejects(prepare({}, {userId:'owner'}, {}),e=>e.status===409);
 existing=null;result={lenses:{}};await assert.rejects(prepare({}, {userId:'owner'}, {}),e=>e.status===422);
 birthInfo={calendarType:'lunar',birthDate:'1993-07-21',isLeapMonth:true};result={lenses:{saju:{confidence:'full'}}};await prepare({}, {userId:'owner'}, {});lunarValid=false;await assert.rejects(prepare({}, {userId:'owner'}, {}),e=>e.code==='INVALID_LUNAR_DATE'&&e.status===422);
});
