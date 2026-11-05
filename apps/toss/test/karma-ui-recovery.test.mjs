import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'../../..');
function parse(file){const source=fs.readFileSync(path.join(root,file),'utf8');return ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);}
const inputTree=parse('app/karma-destiny-ai/KarmaDestinyAiClient.tsx'),resultTree=parse('app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx');
function callback(tree,name){let found;function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name&&node.initializer)found=ts.isCallExpression(node.initializer)?node.initializer.arguments[0]:node.initializer;ts.forEachChild(node,walk);}walk(tree);assert.ok(found,name);return ts.transpileModule('globalThis.subject='+found.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
function fn(tree,name){let found;function walk(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(tree);ts.forEachChild(node,walk);}walk(tree);assert.ok(found,name);return ts.transpileModule(found,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
test('Toss result rejects an unsaved completion and retains permission status',async()=>{
 let response;const ctx={authFetch:async()=>response};vm.createContext(ctx);vm.runInContext(fn(resultTree,'requestJson'),ctx);
 response={status:403,ok:false,json:async()=>({ok:false,message:'denied'})};await assert.rejects(ctx.requestJson('/result',undefined,{loadFailed:'failed'},true),e=>e.status===403);
 response={status:409,ok:false,json:async()=>({ok:false,reason:'ORDER_REFUNDED'})};await assert.rejects(ctx.requestJson('/result',undefined,{loadFailed:'failed'},true),e=>e.code==='ORDER_REFUNDED');
 response={status:200,ok:true,json:async()=>({ok:true,status:'completed',saved:false})};await assert.rejects(ctx.requestJson('/result',undefined,{loadFailed:'failed'},true),e=>e.code==='RESULT_UNAVAILABLE');
 response={status:202,ok:true,json:async()=>({ok:true,status:'partial'})};assert.equal((await ctx.requestJson('/result',undefined,{loadFailed:'failed'},true)).status,'partial');
});
test('permission denial hides an old result and ignores an earlier in-flight batch',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;}),seen=[],errors=[];
 const ctx={paymentSurface:'toss',captureOwner:()=>()=>true,authorityRevisionRef:{current:0},batchInFlightRef:{current:null},transientFailuresRef:{current:0},generationStallRef:{current:{lastChapters:-1,stalls:0}},document:{visibilityState:'visible'},sessionId:'saved',copy:{},tossLogin:'login',tossDeniedMessage:'denied',tossUncertain:'uncertain',maxGenerationStalls:48,readDevPreviewState:()=>null,
  setResult:value=>seen.push(value),setError:value=>errors.push(value),setNotice:()=>{},setRecoveredSessionId:()=>{},setLoading:()=>{},setContinuing:()=>{},setTossDenied:()=>{},requestJson:async url=>{if(url.includes('generate-batch')){await pending;return {ok:true,status:'completed',saved:true,generationProgress:{completedChapters:1}};}throw Object.assign(Error('denied'),{status:403});}};
 vm.createContext(ctx);vm.runInContext(callback(resultTree,'continueGeneration'),ctx);const batch=ctx.subject();vm.runInContext(callback(resultTree,'loadResult'),ctx);await ctx.subject();release();await batch;
 assert.equal(seen.some(value=>value?.status==='completed'),false);assert.equal(seen.at(-1),null);assert.equal(errors.at(-1),'denied');assert.equal(ctx.batchInFlightRef.current,null);
});
test('a refused Toss purchase never starts the original consultation',async()=>{
 let starts=0,error='';const ctx={startLockRef:{current:false},isBusy:false,validateConsultationForm:()=>'',form:{},copy:{},captureOwner:()=>()=>true,idempotencyKeyRef:{current:'request-123456'},buildConsultationPayload:()=>({}),setError:value=>{error=value;},setNotice:()=>{},setStatus:()=>{},runBillingCoinGate:async()=>({ok:false,status:403,error:{code:'ACCESS_DENIED'}}),FEATURE_KEY:'karma-destiny-ai-consultation',buildResume:args=>({args}),packPaidResumeArg:JSON.stringify,tossCopy:{uncertain:'uncertain',denied:'denied'},authFetch:async()=>{starts++;}};
 vm.createContext(ctx);vm.runInContext(callback(inputTree,'handleTossSubmit'),ctx);await ctx.subject({preventDefault(){}});assert.equal(starts,0);assert.equal(error,'denied');
});
test('an account switch while buying does not start the old owner consultation',async()=>{
 let active=true,release,starts=0;const pending=new Promise(resolve=>{release=resolve;}),ctx={startLockRef:{current:false},isBusy:false,validateConsultationForm:()=>'',form:{},copy:{},captureOwner:()=>()=>active,idempotencyKeyRef:{current:'request-123456'},buildConsultationPayload:()=>({}),setError:()=>{},setNotice:()=>{},setStatus:()=>{},runBillingCoinGate:async()=>{await pending;return {ok:true,data:{}};},FEATURE_KEY:'karma-destiny-ai-consultation',buildResume:args=>({args}),packPaidResumeArg:JSON.stringify,tossCopy:{uncertain:'uncertain'},authFetch:async()=>{starts++;}};
 vm.createContext(ctx);vm.runInContext(callback(inputTree,'handleTossSubmit'),ctx);const buying=ctx.subject({preventDefault(){}});active=false;release();await buying;assert.equal(starts,0);
});
test('Toss lunar leap input is carried into the paid request',async()=>{
 let prepared;const ctx={startLockRef:{current:false},isBusy:false,validateConsultationForm:()=>'',form:{calendarType:'lunar'},tossLeapMonth:true,copy:{},captureOwner:()=>()=>true,idempotencyKeyRef:{current:'request-123456'},buildConsultationPayload:()=>({calendarType:'lunar'}),setError:()=>{},setNotice:()=>{},setStatus:()=>{},runBillingCoinGate:async value=>{prepared=JSON.parse(value.resume.args.payload);return {ok:false,error:{code:'PAYMENT_STATUS_UNCERTAIN'}};},FEATURE_KEY:'karma-destiny-ai-consultation',buildResume:args=>({args}),packPaidResumeArg:JSON.stringify,tossCopy:{uncertain:'uncertain'}};
 vm.createContext(ctx);vm.runInContext(callback(inputTree,'handleTossSubmit'),ctx);await ctx.subject({preventDefault(){}});assert.equal(prepared.isLeapMonth,true);assert.equal(prepared.requestId,'request-123456');
});
