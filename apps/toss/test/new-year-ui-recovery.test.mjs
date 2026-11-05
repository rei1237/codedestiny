import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
const file=path.resolve(import.meta.dirname,'../../../app/new-year-ai-consultation/NewYearAiClient.tsx'),source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function fn(name){let node;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)node=n;ts.forEachChild(n,walk);}walk(ast);assert.ok(node,name);return ts.transpileModule(node.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;}
const response=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
test('Toss response preserves permission errors and refuses an unsaved completion',async()=>{
 const ctx=vm.createContext({});vm.runInContext(fn('readTossNewYearResponse'),ctx);
 await assert.rejects(ctx.readTossNewYearResponse(response(403,{reason:'ACCESS_DENIED'})),e=>e.code==='ACCESS_DENIED'&&e.status===403);
 await assert.rejects(ctx.readTossNewYearResponse(response(200,{ok:true,status:'completed',saved:false})),e=>e.code==='RESULT_UNAVAILABLE');
 assert.equal((await ctx.readTossNewYearResponse(response(202,{ok:true,status:'partial'}))).status,'partial');
});
test('denied result never enables continuation or displays a result',async()=>{
 let applied=0,failure='',states=[];const ctx={tossBusy:{current:false},tossRevision:{current:0},captureDeliveryScope:()=>()=>true,clearTossResult:()=>{},setTossRecovery:v=>states.push(v),setStatus:()=>{},setError:()=>{},authFetch:async()=>response(403,{reason:'ACCESS_DENIED'}),applyTossResult:()=>applied++,showTossFailure:e=>{failure=e.code;}};
 vm.createContext(ctx);vm.runInContext(fn('readTossNewYearResponse')+'\n'+fn('resumeTossNewYear'),ctx);assert.equal(await ctx.resumeTossNewYear('saved'),false);assert.equal(applied,0);assert.equal(failure,'ACCESS_DENIED');assert.deepEqual(states,['checking']);assert.equal(ctx.tossBusy.current,false);
});
test('an account change during a result read cannot show an earlier owner result',async()=>{
 let current=true,release,applied=0;const wait=new Promise(r=>{release=r}),ctx={tossBusy:{current:false},tossRevision:{current:0},captureDeliveryScope:()=>()=>current,clearTossResult:()=>{},setTossRecovery:()=>{},setStatus:()=>{},setError:()=>{},authFetch:async()=>{await wait;return response(200,{ok:true,status:'completed',saved:true,sessionId:'saved'});},applyTossResult:()=>applied++,showTossFailure:()=>{}};
 vm.createContext(ctx);vm.runInContext(fn('readTossNewYearResponse')+'\n'+fn('resumeTossNewYear'),ctx);const pending=ctx.resumeTossNewYear('saved');current=false;release();assert.equal(await pending,false);assert.equal(applied,0);
});
test('a refused purchase never starts consultation generation',async()=>{
 let starts=0,reported;const ctx={tossBusy:{current:false},tossRecovery:'none',validateConsultationForm:()=>'',form:{},tossJapanese:null,setError:()=>{},setStatus:()=>{},setNotice:()=>{},tossRevision:{current:0},captureDeliveryScope:()=>()=>true,idempotencyKeyRef:{current:'same-request'},buildConsultationPayload:()=>({targetYear:2027}),buildResume:args=>({args}),packPaidResumeArg:JSON.stringify,FEATURE_KEY:'new-year-ai-consultation',runBillingCoinGate:async()=>({ok:false,status:403,error:{code:'ACCESS_DENIED'}}),startTossNewYear:async()=>{starts++;},showTossFailure:e=>{reported=e;}};
 vm.createContext(ctx);vm.runInContext(fn('handleTossSubmit'),ctx);await ctx.handleTossSubmit({preventDefault(){}});assert.equal(starts,0);assert.equal(reported.code,'ACCESS_DENIED');assert.equal(reported.status,403);
});
test('an account switch while purchase is pending never starts the old consultation',async()=>{
 let current=true,release,starts=0;const wait=new Promise(r=>{release=r}),ctx={tossBusy:{current:false},tossRecovery:'none',validateConsultationForm:()=>'',form:{},tossJapanese:null,setError:()=>{},setStatus:()=>{},setNotice:()=>{},tossRevision:{current:0},captureDeliveryScope:()=>()=>current,idempotencyKeyRef:{current:'same-request'},buildConsultationPayload:()=>({targetYear:2027}),buildResume:args=>({args}),packPaidResumeArg:JSON.stringify,FEATURE_KEY:'new-year-ai-consultation',runBillingCoinGate:async()=>{await wait;return {ok:true,data:{}};},startTossNewYear:async()=>{starts++;},showTossFailure:()=>{}};
 vm.createContext(ctx);vm.runInContext(fn('handleTossSubmit'),ctx);const pending=ctx.handleTossSubmit({preventDefault(){}});current=false;release();await pending;assert.equal(starts,0);
});
test('native back rechecks a changed result without duplicating an active request',()=>{
 let effect;function walk(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes("addEventListener('popstate'"))effect=n.arguments[0].getText(ast);ts.forEachChild(n,walk);}walk(ast);assert.ok(effect);
 const handlers=new Map(),win={location:{search:'?sid=first'},addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)},doc={visibilityState:'visible',addEventListener:(k,v)=>handlers.set('document:'+k,v),removeEventListener:k=>handlers.delete('document:'+k)};let epoch=0;
 const ctx={paymentSurface:'toss',window:win,document:doc,URLSearchParams,tossViewedId:{current:'first'},tossBusy:{current:true},setReloadEpoch:f=>{epoch=f(epoch);}};
 const code=ts.transpileModule('('+effect+')()',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;const cleanup=vm.runInNewContext(code,ctx);handlers.get('focus')();assert.equal(epoch,0);win.location.search='?sid=second';handlers.get('popstate')();assert.equal(epoch,1);cleanup();assert.equal(handlers.size,0);
});
