import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const file=require('node:path').resolve(import.meta.dirname,'../../../worker/routes/new-year-ai.js'),src=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function fn(name){let found;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.getText(ast);ts.forEachChild(n,walk);}walk(ast);assert.ok(found,name);return found.replace(/^export /,'');}
const json=(body,init={})=>({body,status:init.status||200}),clean=x=>String(x||'');

test('Toss new year never enters web purchase preparation',async()=>{
 const prepare=vm.runInNewContext('('+fn('handleEnsureAccess')+')',{nativeTossContext:()=>({}),notFound:()=>({status:404})});assert.equal((await prepare({},{})).status,404);
});
test('preflight checks the original calculation and rejects a conflicting saved request',async()=>{
 let calculated=0,existing=null;const body={idempotencyKey:'attempt-123456'},ctx={clean,nativeNewYearContract:()=>({requestId:body.idempotencyKey,inputHash:'hash'}),normalizeConsultationInput:()=>({input:{birthInfo:{}}}),connectDb:async()=>{},NewYearAiConsultation:{findOne:()=>({lean:async()=>existing})},sajuAuthorityOn:()=>false,calculateNewYearFortuneData:()=>{calculated++;return {};},connectNewYearTiming:()=>{}};
 const prepare=vm.runInNewContext('('+fn('prepareNativeNewYearCalculation')+')',ctx);await prepare({}, {userId:'owner'}, body);assert.equal(calculated,1);existing={accessSource:'web',inputHash:'hash'};await assert.rejects(prepare({}, {userId:'owner'}, body),e=>e.status===409);
});
test('saved new year start cannot expose a result before Toss authority',async()=>{
 let exposed=0;const doc={id:'saved',status:'completed',userId:'owner'},ctx={BILLING_SNAPSHOT_USER_PROJECTION:{},readJson:async()=>({resumeSessionId:'saved'}),getOptionalUserFromRequest:async()=>({userId:'owner'}),connectDb:async()=>{},NewYearAiConsultation:{findOne:()=>({lean:async()=>doc})},clean,nativeTossContext:()=>({assertStored:async()=>{throw Object.assign(Error('denied'),{status:403})}}),notFound:()=>({status:404}),json,publicSession:()=>{exposed++;return {private:true}}};
 const start=vm.runInNewContext('('+fn('handleStart')+')',ctx);await assert.rejects(start({method:'POST'},{}),e=>e.status===403);assert.equal(exposed,0);
});
test('Toss result list cannot enumerate unverified records and denial cannot expose a result',async()=>{
 let exposed=0,queried=0;const ctx={URL,json,clean,connectDb:async()=>{},nativeTossContext:()=>({auth:{userId:'owner'},assertStored:async()=>{throw Object.assign(Error('denied'),{status:403})}}),NewYearAiConsultation:{findOne:()=>{queried++;return {lean:async()=>({id:'saved',status:'completed'})}}},publicSession:()=>{exposed++;return {private:true}}};
 const result=vm.runInNewContext('('+fn('handleTossNewYearResult')+')',ctx);assert.equal((await result({url:'https://example.invalid/api/new-year-ai/result'},{})).body.sessions.length,0);assert.equal(queried,0);await assert.rejects(result({url:'https://example.invalid/api/new-year-ai/result?id=saved'},{}),e=>e.status===403);assert.equal(exposed,0);
});
test('Toss authorization errors retain their HTTP status',async()=>{
 const ctx={getRoutePath:()=>'/result',handleTossNewYearResult:async()=>{throw Object.assign(Error('denied'),{status:403,code:'ACCESS_DENIED'})},nativeTossContext:()=>({}),json};
 const route=vm.runInNewContext('('+fn('handleNewYearAiRoutes')+')',ctx);const response=await route({method:'GET'},{});assert.equal(response.status,403);assert.equal(response.body.reason,'ACCESS_DENIED');
});
test('web result cannot disclose a Toss-origin record',async()=>{
 let exposed=0;const ctx={getOptionalUserFromRequest:async()=>({userId:'owner'}),connectDb:async()=>{},URL,json,clean,notFound:()=>({status:404}),NewYearAiConsultation:{findOne:()=>({lean:async()=>({id:'saved',accessSource:'toss',status:'completed'})})},publicSession:()=>{exposed++;return {private:true}}};
 const result=vm.runInNewContext('('+fn('handleResult')+')',ctx);assert.equal((await result({url:'https://example.invalid/api/new-year-ai/result?id=saved'},{})).status,404);assert.equal(exposed,0);
});
