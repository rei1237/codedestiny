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
 const ctx={clean,readJson:async()=>({}),readIdempotencyKey:()=> 'request-0000001',normalizeConsultationInput:()=>({ok:true,inputHash:'hash'}),logKarmaAi:()=>{},safeLogPayload:()=>({}),getOptionalUserFromRequest:async()=>({userId:'owner'}),BILLING_SNAPSHOT_USER_PROJECTION:{},connectDb:async()=>{},getPricing:()=>({}),withMongoRetry:async(_env,read)=>read(),KarmaDestinyAiConsultation:{findOne:()=>({lean:async()=>doc})},authorizedKarmaRecord:async()=>{throw Object.assign(Error('denied'),{status:403});},publicSession:()=>{exposed++;return {};}};
 const start=vm.runInNewContext('('+fn('handleStart')+')',ctx);await assert.rejects(start({},{}),e=>e.status===403);assert.equal(exposed,0);
});
test('a denied completed karma result is not exposed by the batch route',async()=>{
 let exposed=0;const ctx={readJson:async()=>({sessionId:'saved'}),clean,getOptionalUserFromRequest:async()=>({userId:'owner'}),BILLING_SNAPSHOT_USER_PROJECTION:{},connectDb:async()=>{},buildResultLookup:()=>({}),KarmaDestinyAiConsultation:{findOne:()=>({lean:async()=>({status:'completed'})})},authorizedKarmaRecord:async()=>{throw Object.assign(Error('denied'),{status:403});},publicSession:()=>{exposed++;return {};}};
 const batch=vm.runInNewContext('('+fn('handleGenerateBatch')+')',ctx);await assert.rejects(batch({},{}),e=>e.status===403);assert.equal(exposed,0);
});
