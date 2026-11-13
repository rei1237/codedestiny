import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {tossExpertResultHref} from '../../../lib/fortune/toss-expert-result.mjs';
import {ownsReviewReceipt,requiresOwnedReceipt} from '../src/review-scope.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
const id='original-stored-result';
const targets=[
  ['fusion','fusion-fortune/FusionFortuneClient','rememberConsultationUrl','/fusion-fortune/?cid='],
  ['love-secret','love-secret-ai/LoveSecretAiClient','buildResultUrl','/love-secret-ai/result/?attemptId='],
  ['astrology','astrology-ai/AstrologyAiClient','resultPath','/astrology-ai/result/?id='],
  ['vedic','vedic-ai/VedicAiClient','rememberConsultationUrl','/vedic-ai/?cid='],
  ['ziwei','ziwei-ai/ZiweiAiClient','rememberConsultationUrl','/ziwei-ai/?cid='],
  ['new-year','new-year-ai-consultation/NewYearAiClient','applyTossResult','/new-year-ai-consultation/?sid='],
  ['karma','karma-destiny-ai/KarmaDestinyAiClient','handleTossSubmit','/karma-destiny-ai/result/?sessionId='],
  ['sukuyo','sukuyo-compatibility-ai/SukuyoCompatibilityAiClient','rememberConsultationUrl','/sukuyo-compatibility-ai/?cid='],
];
function originalFunction(file,name){
  const nameOnDisk=path.join(root,'app',file+'.tsx');
  const tree=ts.createSourceFile(nameOnDisk,fs.readFileSync(nameOnDisk,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let source;
  function visit(node){
    if(ts.isFunctionDeclaration(node)&&node.name?.text===name)source=node.getText(tree);
    if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)source='const '+node.getText(tree);
    ts.forEachChild(node,visit);
  }
  visit(tree);assert.ok(source,name);
  return ts.transpile(source+';globalThis.run='+name,{target:ts.ScriptTarget.ES2022});
}
for(const [service,file,fn,prefix] of targets)test(service+' original result navigation opens only the exact owned receipt',async()=>{
  let href;
  const ctx=vm.createContext({window:{location:{href:'https://mini.invalid/input?orderId=unassigned&lang=ko',replace:value=>href=value},history:{replaceState:(_data,_title,value)=>href=value}},
    paymentSurface:'toss',URL,URLSearchParams,tossExpertResultHref,
    tossViewedId:{current:''},applyResult:()=>{},setTossFailureCode:()=>{},setTossRecovery:()=>{},setStatus:()=>{},
    startLockRef:{current:false},isBusy:false,validateConsultationForm:()=>'',form:{},copy:{},captureOwner:()=>()=>true,idempotencyKeyRef:{current:'immutable-payment-attempt'},
    buildConsultationPayload:()=>({}),setError:()=>{},setNotice:()=>{},runBillingCoinGate:async()=>({ok:true,data:{}}),FEATURE_KEY:'karma-destiny-ai-consultation',buildResume:args=>args,packPaidResumeArg:JSON.stringify,
    authFetch:async()=>Response.json({ok:true,sessionId:id}),tossCopy:{}});
  vm.runInContext(originalFunction(file,fn),ctx);
  if(service==='karma')await ctx.run({preventDefault(){}});
  else if(service==='new-year')ctx.run({sessionId:id,status:'completed'},'another-id');
  else if(service==='astrology')href=ctx.run(id);
  else if(service==='love-secret')href=ctx.run({sessionId:id,attemptId:'web-generation-key',requestId:'web-request',pending:true},'toss');
  else ctx.run(id,'toss');
  assert.equal(href,prefix+id);
  const url=new URL(href,'https://mini.invalid');
  assert.equal(requiresOwnedReceipt(url.pathname,url.search),true);
  const purchase={orderId:'test-order',nativeService:service,href:tossExpertResultHref(service,id),status:'PURCHASED',state:'COMPLETED'};
  assert.ok(await ownsReviewReceipt(href,async()=>({purchases:[purchase]})));
  for(const rows of [[],[{...purchase,state:'REFUNDED'}],[{...purchase,href:purchase.href+'2'}],[{...purchase,href:tossExpertResultHref(service==='fusion'?'vedic':'fusion',id)}]]){
    assert.equal(await ownsReviewReceipt(href,async()=>({purchases:rows})),false);
  }
});
