/** @jest-environment node */
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let onPaymentFind, docs, orders, missingEvidence, fault, lostConfirmation, route, generator, paymentChecks, revoked, store, accessType;
const originalFetch = globalThis.fetch;
const uid='64b7f2a1c3d4e5f601234567';
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
const get = (doc, key) => key.split(".").reduce((value, field) => value?.[field], doc);
function assign(doc, fields) { for (const [key,value] of Object.entries(fields)) { const keys=key.split("."); let target=doc; for(const part of keys.slice(0,-1)) target=target[part] ||= {}; target[keys.at(-1)]=clone(value); } }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("$ne" in value) return get(doc, key) !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(get(doc, key));
      if ("$in" in value) return value.$in.includes(get(doc, key));
      if ("$exists" in value) return (get(doc, key) !== undefined) === value.$exists;
      if ("$gte" in value) return get(doc, key) >= value.$gte && (!("$lte" in value) || get(doc, key) <= value.$lte);
      if ("$lt" in value) return get(doc, key) < value.$lt && (!("$gt" in value) || get(doc, key) > value.$gt);
      if ("$lte" in value) return get(doc, key) <= value.$lte;
      if ("$gt" in value) return get(doc, key) > value.$gt;
    }
    if (value === null) return get(doc, key) == null;
    return String(get(doc, key)) === String(value);
  });
}
const model = {
  findOne: filter => { if (lostConfirmation) { lostConfirmation = false; return query(null); } return query(docs.find(doc => matches(doc, filter)) || null); },
  create: async fields => {
    if (docs.some(doc => doc.userId === fields.userId && doc.idempotencyKey === fields.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = { ...clone(fields), createdAt: new Date(), updatedAt: new Date() }; docs.push(doc); return clone(doc);
  },
  find: filter => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => clone(docs.filter(doc=>matches(doc,filter))) }),
  findOneAndUpdate: (filter, update, options={}) => {
    if (fault === 'final-null' && update.$set?.status === 'completed') { fault=null; return query(null); }
    if (fault === 'final-confirm' && update.$set?.status === 'completed') fault='confirm';
    if (fault==='null') { fault=null; return query(null); }
    if (fault==='throw') { fault=null; throw Error('storage unavailable'); }
    let doc=docs.find(row=>matches(row,filter));
    if(!doc && options.upsert){
      if (docs.some(row => row.userId === filter.userId && row.idempotencyKey === filter.idempotencyKey)) throw Object.assign(new Error('duplicate'), {code:11000});
      doc=clone(update.$setOnInsert);docs.push(doc);
    }
    if(doc){ assign(doc,update.$set||{});for(const [key,n] of Object.entries(update.$inc||{}))assign(doc,{[key]:Number(get(doc,key)||0)+n}); }
    if(fault==='confirm'){ fault=null;lostConfirmation=true; }
    return query(doc||null);
  },
  updateOne: async (filter, update, options={}) => {
    let doc=docs.find(row=>matches(row,filter));
    if(!doc && options.upsert){ docs.push({...clone(update.$setOnInsert),createdAt:new Date(),updatedAt:new Date()}); return {matchedCount:0,upsertedCount:1}; }
    if(doc)assign(doc,update.$set||{});return {matchedCount:doc?1:0,upsertedCount:0};
  },
};

const ENV={ENABLE_FUSION_FORTUNE_API:'true',ENABLE_FUSION_FORTUNE_UI:'true',ENABLE_FUSION_FORTUNE_MOCK_FLOW:'true'};
beforeAll(async()=>{
 jest.unstable_mockModule('../../worker/toss/native-fusion.js',()=>({nativeFusionRecoveryContext:async()=>null,bootstrapNativeFusionOrders:async()=>[]}));
 jest.spyOn(console,'warn').mockImplementation(()=>{});
 globalThis.fetch=()=>{throw Error('External fetch forbidden in delivery mocks')};
 const models=await import('../../worker/lib/models.js');
 const db=await import('../../worker/lib/db.js');
 const auth=await import('../../worker/lib/auth.js');
 const fusion=await import('../../worker/lib/fusion-fortune.js');
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,FusionFortuneConsultation:model,Payment:{
  find:filter=>({sort(){return this},limit(){return this},lean:async()=>{onPaymentFind?.(filter);return clone(orders.filter(order=>matches(order,filter)))}}),
  updateOne:async(filter,update)=>{const order=orders.find(row=>matches(row,filter));if(order)assign(order,update.$set||{});return {matchedCount:order?1:0}},
 }}));
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,run)=>run()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireUserFromRequest:async()=>({userId:uid}),getOptionalUserFromRequest:async()=>({userId:uid})}));
 jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isPaidResultRevoked:async()=>revoked}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>withSettle({verifyPerUsePayment:async(_env,args)=>{paymentChecks.push({...args,accessType});return {proven:!(missingEvidence&&args.requireExisting)}},logPerUsePaymentProof:()=>{}}));
 jest.unstable_mockModule('../../worker/lib/fusion-fortune.js',()=>({...fusion,createMongoFusionFortuneStore:()=>store,
   generateFusionFortuneRequest:args=>fusion.generateFusionFortuneRequest({...args,
     contextBuilder:async()=>({ok:true,context:{version:1,locale:'ko',systems:{saju:{dayMaster:'갑'}},tarotSpread:{cards:[]}}}),
     generator:(...args)=>generator(...args),
   }),
 }));
 ({handleFusionFortuneRoutes:route}=await import('../../worker/routes/fusion-fortune.js'));
 store=fusion.createMemoryFusionFortuneStore();
});

for(const scenario of ['pending','refunded','gift','missing-input','mismatch','copied-owner','legacy-completed'])it(`approved-order bootstrap protects ${scenario}`,async()=>{
 const now=Date.now(),requestId='bootstrap-original',featureKey='fusion-fortune-consultation',env={...ENV,PII_ENC_KEY:Buffer.alloc(32,7).toString('base64')};
 const {prepareResumeContext}=await import('../../worker/payments/resume-context.js');
 const paidResume=await prepareResumeContext({originPath:'/fusion-fortune/',resume:{kind:featureKey,args:{requestId:scenario==='mismatch'?'wrong-run':requestId,body:JSON.stringify({birthDate:'1995-04-18',birthTime:'08:30'})}}},{userId:scenario==='copied-owner'?'other-owner':uid,requestId,featureKey,env,now:now-600000});
 const order={merchantUid:'protected-order',userId:uid,requestId,featureKey,status:scenario==='pending'?'pending':scenario==='refunded'?'refunded':'paid',purchaseType:scenario==='gift'?'GIFT':'SELF',paymentType:'digital_content',createdAt:new Date(now-600000),metadata:scenario==='missing-input'?{}:{paidResume}};
 orders.push(order);
 if(scenario==='legacy-completed')docs.push({id:'old-complete',userId:uid,idempotencyKey:requestId,status:'completed',result:{title:'legacy immutable report'}});
 generator=()=>{throw Error('protected orders must not call a provider')};
 const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
 await runFusionFortuneRecovery(env);
 expect(paymentChecks).toHaveLength(0);
 if(scenario==='legacy-completed')expect(docs[0].result.title).toBe('legacy immutable report');
 else expect(docs).toHaveLength(0);
 if(scenario==='missing-input')expect(order.metadata.fusionRecovery.status).toBe('input_required');
 if(['mismatch','copied-owner'].includes(scenario))expect(order.metadata.fusionRecovery.status).toBe('recovery_pending');
});
afterAll(()=>{globalThis.fetch=originalFetch;jest.restoreAllMocks()});
beforeEach(()=>{onPaymentFind=null;docs=[];orders=[];missingEvidence=false;fault=null;lostConfirmation=false;paymentChecks=[];revoked=false;store.attempts.clear();accessType='pass'});
function request(stage=1){return new Request('https://example.test/api/fusion-fortune/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:'paid-original',birthDate:'1995-04-18',birthTime:'08:30',stage})})}
const sections=Object.fromEntries(['saju','ziwei','vedic','sukuyo','astrology','tarot'].map(key=>[`${key}Section`,{title:key,content:'계산 근거에 따른 생활 패턴을 설명합니다. '.repeat(240),keyPoints:[]} ]));
for(const kind of ['pass','monthly','single'])describe(kind,()=>{
 beforeEach(()=>{accessType=kind});
 it('checkpoints partial output, resumes the same paid stage, and commits only after verified delivery',async()=>{
  let calls=0;
  generator=async({onCheckpoint,onAttempt,stage})=>{
    calls++; await onAttempt(stage===1?'saju':'fusion');
    const result=stage===1?sections:{...sections,title:'완료된 리포트',executiveSummary:'완료'};
    await onCheckpoint(result);
    return {result,deliverable:calls>1,generationSource:'gemini',qualityTier:stage===1?'partial':'full'};
  };
  const first=await route(request(),ENV);expect(first.status).toBe(202);expect(await first.json()).toMatchObject({nextStage:1,status:'partial'});
  const snapshot=structuredClone(docs[0].generationSnapshot);
  const second=await route(request(),ENV);expect(second.status).toBe(202);expect(await second.json()).toMatchObject({nextStage:2});
  const final=await route(request(2),ENV);expect(final.status).toBe(200);expect(await final.json()).toMatchObject({status:'completed',requestId:'paid-original'});
  expect(docs).toHaveLength(1);expect(docs[0].status).toBe('completed');expect(docs[0].generationLease).toBeNull();
  expect(docs[0].generationSnapshot.context).toEqual(snapshot.context);
  expect(paymentChecks.every(proof=>proof.requestId==='paid-original')).toBe(true);
  generator=()=>{throw Error('completed reports must never regenerate')};
  const replay=await route(request(),ENV);expect(replay.status).toBe(200);expect(paymentChecks).toHaveLength(3);
  const savedBody=clone(docs[0].result);
  const freshGet=await route(new Request('https://example.test/api/fusion-fortune/result?requestId=paid-original'),ENV);
  expect(freshGet.status).toBe(200);expect((await freshGet.json()).consultation.result).toEqual(savedBody);expect(paymentChecks).toHaveLength(3);
  docs.push({...clone(docs[0]),userId:'other-owner',id:'private-completed'});
  expect((await route(new Request('https://example.test/api/fusion-fortune/result?id=private-completed'),ENV)).status).toBe(404);
 });
 for(const kind of['throw','null','confirm'])it(`storage ${kind} after generation returns 503 and retains payment identity`,async()=>{
  generator=async({onAttempt,onCheckpoint})=>{await onAttempt('saju');fault=kind;await onCheckpoint(sections);return {result:sections,deliverable:true}};
  const response=await route(request(),ENV);expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,retryable:true,reason:'RESULT_STORAGE_UNAVAILABLE',resultId:'paid-original'});
  expect(docs[0].status).not.toBe('completed');expect(docs[0].generationSnapshot.attempts.saju).toBe(1);
 });
 for(const faultType of ['final-null','final-confirm'])it(`final ${faultType} cannot falsely confirm delivery or overwrite completed output`,async()=>{
  generator=async()=>({result:sections,deliverable:true,qualityTier:'partial'});await route(request(),ENV);
  generator=async()=>{fault=faultType;return {result:{...sections,title:'final body'},deliverable:true,qualityTier:'full'}};
  const response=await route(request(2),ENV);expect(response.status).toBe(503);
  expect(docs[0].status).toBe(faultType==='final-null'?'delivery_pending':'completed');
  if(faultType==='final-confirm'){
   generator=()=>{throw Error('already completed')};
   const retry=await route(request(2),ENV);expect(retry.status).toBe(200);expect(docs[0].result.title).toBe('final body');
  }
 });
 it('discovers an owned unfinished result without browser input',async()=>{
  generator=async()=>({result:sections,deliverable:false});await route(request(),ENV);
  docs.unshift({...structuredClone(docs[0]),userId:'other-owner',id:'private-other'});
  const response=await route(new Request('https://example.test/api/fusion-fortune/result?pending=1'),ENV);
  expect(response.status).toBe(202);const payload=await response.json();
  expect(payload.consultation.requestId).toBe('paid-original');expect(payload.consultation.id).not.toBe('private-other');
  expect(payload.consultation.resumeBody.birthDate).toBe('1995-04-18');
 });
 it('delivers provider-validated short second-stage output without a length retry',async()=>{
  const initial=Object.fromEntries(Object.entries(sections).map(([key,value])=>[key,{...value,content:value.content.slice(0,500)}]));
  generator=async()=>({result:initial,deliverable:true,qualityTier:'partial'});await route(request(),ENV);
  generator=async({priorResult})=>({result:{...priorResult,title:'short',executiveSummary:'usable summary'},deliverable:true,qualityTier:'full'});
  const result=await route(request(2),ENV);expect(result.status).toBe(200);
  expect(docs[0].result.deliveryRepairGroups).toBeUndefined();
  generator=()=>{throw Error('completed delivery must never regenerate');};
  expect((await route(request(2),ENV)).status).toBe(200);
 });
 it('an expired generator cannot deliver partial output over a replacement lease',async()=>{
  let replacement;
  generator=async()=>{
   docs[0].generationLease.expiresAt=new Date(0);
   const {claimFusionDeliveryLease}=await import('../../worker/lib/fusion-fortune-consultation.js');
   replacement=await claimFusionDeliveryLease({userId:uid,requestId:'paid-original'});
   return {result:sections,deliverable:false,qualityTier:'partial'};
  };
  const response=await route(request(),ENV);
  expect(response.status).toBe(503);
  expect(docs[0].result).toEqual({});
  expect(docs[0].generationLease.token).toBe(replacement.token);
 });
 it('the existing scheduled tick completes an abandoned paid stage without a browser',async()=>{
  generator=async({stage})=>({result:stage===1?sections:{...sections,title:'server recovered'},deliverable:true,qualityTier:stage===1?'partial':'full'});
  await route(request(),ENV);
  docs[0].updatedAt=new Date(Date.now()-600000);
  const ast=ts.createSourceFile('worker/index.js',readFileSync('worker/index.js','utf8'),ts.ScriptTarget.Latest,true);
  let scheduled;
  function visit(node){if(ts.isMethodDeclaration(node)&&node.name?.getText(ast)==='scheduled')scheduled=node;ts.forEachChild(node,visit)}
  visit(ast);expect(scheduled).toBeDefined();
  const pending=[];
  const context=vm.createContext({console,Date,PAYMENT_RECONCILE_CRON:'*/10 * * * *',
   __import:async spec=>spec==='./lib/fusion-fortune-recovery-task.js'
    ? import('../../worker/lib/fusion-fortune-recovery-task.js')
    : {monitorPaidNarratives:async()=>{}, checkProviderRecovery:async()=>{}, checkLlmBudget:async()=>{}, runPaidNarrativeRecovery:async()=>{},runConsultationRecovery:async()=>{}, runYeongnyangiRecovery: async () => {}, runTossOrderReconciliation: async () => {}, runTossUnlinkRecovery: async () => {}, runPaymentReconcileTask:async()=>{},runPaymentsV2Reconcile:async()=>{},runSnsDailyPostRecovery:async()=>{},runThreadsDailyJobs:async()=>{},runMasterLoveCodexRecovery:async()=>{},runZiweiDeepReportRecovery:async()=>{}},
  });
  vm.runInContext(scheduled.getText(ast).replace(/^async scheduled/,'async function scheduled').replace(/\bimport\(/g,'__import('),context);
  await context.scheduled({cron:'*/10 * * * *'},ENV,{waitUntil:promise=>pending.push(promise)});
  await Promise.all(pending);
  expect(docs[0].status).toBe('completed');
  expect(docs[0].result.title).toBe('server recovered');
  expect(paymentChecks.every(proof=>proof.requestId==='paid-original')).toBe(true);
 });
 it('server recovery honors nextStage=1 even when an incomplete expert checkpoint already has six bodies',async()=>{
  generator=async()=>({result:sections,deliverable:false,qualityTier:'partial'});await route(request(),ENV);
  docs[0].updatedAt=new Date(Date.now()-600000);
  const stages=[];generator=async({stage})=>{stages.push(stage);return {result:sections,deliverable:true,qualityTier:stage===1?'partial':'full'}};
  const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
  await runFusionFortuneRecovery(ENV);
  expect(stages).toEqual([1,2]);expect(docs[0].status).toBe('completed');
 });
 for(const scenario of ['revoked','live-lease','budget'])it(`server recovery respects ${scenario} before provider calls`,async()=>{
  generator=async()=>({result:sections,deliverable:true,qualityTier:'partial'});
  await route(request(),ENV);
  docs[0].updatedAt=new Date(Date.now()-600000);
  if(scenario==='revoked')revoked=true;
  if(scenario==='live-lease')docs[0].generationLease={token:'active-browser',expiresAt:new Date(Date.now()+60000)};
  if(scenario==='budget')docs[0].generationSnapshot.attempts={integration:3,action:3,verdict:3};
  let calls=0;generator=async()=>{calls++;throw Error('provider must not run')};
  const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
  const recovery=await runFusionFortuneRecovery(ENV);
  expect(calls).toBe(0);expect(docs[0].status).toBe('partial');
  if(scenario==='budget'){
   expect(recovery.outcomes[0].outcome).toBe('budget_exhausted');
   expect(docs[0].generationSnapshot.recovery.reviewRequired).toBe(true);
   expect((await runFusionFortuneRecovery(ENV)).scanned).toBe(0);
  }
  if(scenario==='live-lease')expect(docs[0].generationLease.token).toBe('active-browser');
  if(scenario==='revoked')expect(recovery.outcomes[0].outcome).toBe('RESULT_ACCESS_REVOKED');
 });
 it('rejects refunded proof before providers',async()=>{revoked=true;generator=()=>{throw Error('provider must not run')};const response=await route(request(),ENV);expect(response.status).toBe(403);expect(paymentChecks).toHaveLength(0)});
 it('automatic recovery cannot consume a new pass when the original payment evidence is absent',async()=>{
  generator=async()=>({result:sections,deliverable:true,qualityTier:'partial'});await route(request(),ENV);
  docs[0].updatedAt=new Date(Date.now()-600000);missingEvidence=true;
  let calls=0;generator=async()=>{calls++;return {result:{...sections,title:'new pass was consumed'},deliverable:true,qualityTier:'full'}};
  const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
  await runFusionFortuneRecovery(ENV);
  expect(calls).toBe(0);expect(docs[0].status).toBe('partial');
  expect(paymentChecks.at(-1).requireExisting).toBe(true);
 });
 it('preserves pending output when revocation is detected just before completion',async()=>{
  generator=async()=>({result:sections,deliverable:true,qualityTier:'partial'});await route(request(),ENV);
  generator=async({onAttempt})=>{await onAttempt('fusion');revoked=true;return {result:{...sections,title:'보존 본문'},deliverable:true,qualityTier:'full'}};
  const response=await route(request(2),ENV);expect(response.status).toBe(403);expect(docs[0].status).toBe('delivery_pending');expect(docs[0].result.title).toBe('보존 본문');
  const read=await route(new Request('https://example.test/api/fusion-fortune/result?requestId=paid-original'),ENV);expect(read.status).toBe(403);
 });
});

it('recovers encrypted PG approval before the first generation request, with no return URL or browser storage',async()=>{
 const now=Date.now(), requestId='approved-original', featureKey='fusion-fortune-consultation';
 const env={...ENV,PII_ENC_KEY:Buffer.alloc(32,7).toString('base64')};
 const body={birthDate:'1995-04-18',birthTime:'08:30',locale:'ko',concern:'original private question'};
 const {prepareResumeContext}=await import('../../worker/payments/resume-context.js');
 const paidResume=await prepareResumeContext({originPath:'/fusion-fortune/',resume:{kind:featureKey,args:{requestId,body:JSON.stringify(body)}}},{userId:uid,requestId,featureKey,env,now:now-600000});
 orders.push({merchantUid:'approved-order',userId:uid,featureKey,requestId,status:'paid',paymentType:'digital_content',createdAt:new Date(now-600000),metadata:{paidResume}});
 generator=async({stage})=>({result:stage===1?sections:{...sections,title:'approved recovered'},deliverable:true,qualityTier:stage===1?'partial':'full'});
 const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
 await runFusionFortuneRecovery(env);
 expect(docs).toHaveLength(1);
 expect(docs[0].idempotencyKey).toBe(requestId);
 expect(docs[0].generationSnapshot.input.concern).toBe(body.concern);
 expect(docs[0].status).toBe('partial');
 expect(paymentChecks.map(proof=>proof.requestId)).toEqual([requestId]);
 docs[0].updatedAt=new Date(now-600000);
 await runFusionFortuneRecovery(env);
 expect(docs[0].status).toBe('completed');
 expect(paymentChecks.map(proof=>proof.requestId)).toEqual([requestId,requestId]);
});


it('server recovery continues durable chapter waves in the same tick without a fresh debit',async()=>{
 generator=async()=>({result:{sajuSection:sections.sajuSection},deliverable:false,automaticRetryAllowed:true,qualityTier:'partial'});
 await route(request(),ENV);docs[0].updatedAt=new Date(Date.now()-600000);
 const stages=[];
 generator=async({stage,onAttempt})=>{
  stages.push(stage);await onAttempt(stage===1?'ziwei':'integration');
  return {result:stage===1?sections:{...sections,title:'continued without another tick'},deliverable:true,qualityTier:stage===1?'partial':'full'};
 };
 const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
 await runFusionFortuneRecovery(ENV);
 expect(stages).toEqual([1,2]);expect(docs[0].status).toBe('completed');
 expect(paymentChecks.slice(1).every(proof=>proof.requireExisting===true)).toBe(true);
});

it.each(['unchanged','retry-disallowed'])('server recovery stops a %s partial wave',async scenario=>{
 generator=async()=>({result:sections,deliverable:false,qualityTier:'partial'});
 await route(request(),ENV);docs[0].updatedAt=new Date(Date.now()-600000);
 const runStage=jest.fn(async()=>({ok:true,stageStatus:'partial',automaticRetryAllowed:scenario!=='retry-disallowed'}));
 const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
 await runFusionFortuneRecovery(ENV,{runStage});expect(runStage).toHaveBeenCalledTimes(1);
});

it.each(["short-total", "complete-checkpoint"])("recovery handles exhausted %s without an extra provider reservation", async kind => {
 const fusion=await import('../../worker/lib/fusion-fortune.js');
 const full=await fusion.generateFusionFortuneWithMockLLM({context:{birthTimeKnown:true,birthPlaceKnown:true}});
 generator=async()=>({result:full,deliverable:true,qualityTier:'partial'});
 await route(request(),ENV);
 docs[0].updatedAt=new Date(Date.now()-600000);
 docs[0].generationSnapshot.context={birthTimeKnown:true,birthPlaceKnown:true};
 docs[0].generationSnapshot.attempts={integration:3,action:3,verdict:3};
 if(kind==='short-total')for(const key of ['sajuSection','ziweiSection','vedicSection','sukuyoSection','astrologySection','tarotSection'])docs[0].result[key].content='짧지만 구조를 갖춘 해석입니다.';
 const runStage=jest.fn(async()=>({ok:true,stageStatus:'completed'}));
 const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
 const result=await runFusionFortuneRecovery(ENV,{runStage});
 expect(runStage).toHaveBeenCalledTimes(1);
 expect(result.outcomes[0].completed).toBe(true);
});

it('recovery marks review when saju is spent and the premium chapters still wait for its plan',async()=>{
 generator=async()=>({result:{sajuSection:sections.sajuSection},deliverable:false,automaticRetryAllowed:true,qualityTier:'partial'});
 await route(request(),ENV);docs[0].updatedAt=new Date(Date.now()-600000);
 docs[0].generationSnapshot.context={birthTimeKnown:true,birthPlaceKnown:true,reportVersion:'fusion-premium.v2'};
 docs[0].generationSnapshot.attempts={saju:2};
 const runStage=jest.fn();
 const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
 const result=await runFusionFortuneRecovery(ENV,{runStage});
 expect(runStage).not.toHaveBeenCalled();
 expect(result.outcomes[0]).toMatchObject({outcome:'budget_exhausted',stage:1});
 expect(docs[0].generationSnapshot.recovery.reviewRequired).toBe(true);
});

describe('undelivered card orders move to the refund path',()=>{
 const HOUR=3600000,featureKey='fusion-fortune-consultation';
 let since,inputWait,tick;
 beforeAll(async()=>{
  const task=await import('../../worker/lib/fusion-fortune-recovery-task.js');
  since=task.FUSION_AUTO_REFUND_SINCE.getTime();
  ({RESUME_APPROVED_TTL_MS:inputWait}=await import('../../worker/payments/resume-context.js'));
  tick=async at=>(await task.runFusionFortuneRecovery(ENV,{now:at,runStage:jest.fn()})).refundMarked;
 });
 const cardOrder=(fields={})=>{const order={merchantUid:'card-order',userId:uid,requestId:'paid-original',featureKey,status:'paid',purchaseType:'SELF',paymentType:'digital_content',createdAt:new Date(since+HOUR),metadata:{},...fields};orders.push(order);return order};
 // No saved input keeps the delivery loop out of these ticks; only the refund pass acts.
 const openDoc=(fields={},recovery={})=>docs.push({id:'open-doc',userId:uid,idempotencyKey:'paid-original',status:'partial',result:{},stage:1,nextStage:1,generationLease:null,llmMeta:null,
  generationSnapshot:{context:{birthTimeKnown:true,birthPlaceKnown:true},attempts:{},recovery},createdAt:new Date(since+HOUR),updatedAt:new Date(since+2*HOUR),...fields});
 const exhausted={reviewRequired:true,manualGranted:true};

 it('waits for the manual resume grant before an early refund',async()=>{
  cardOrder();openDoc({},{reviewRequired:true});
  expect(await tick(since+3*HOUR)).toEqual([]);expect(docs[0].status).toBe('partial');
 });
 it('hands an exhausted budget to the refund path without waiting a day',async()=>{
  cardOrder();openDoc({},exhausted);
  expect(await tick(since+3*HOUR)).toEqual([expect.objectContaining({outcome:'refund_eligible',reason:'BUDGET_EXHAUSTED'})]);
  expect(docs[0].status).toBe('generation_failed');expect(docs[0].llmMeta.refundReason).toBe('BUDGET_EXHAUSTED');
 });
 it('refunds an order still undelivered after 24 hours, not before',async()=>{
  cardOrder();openDoc();
  await tick(since+HOUR+23*HOUR);expect(docs[0].status).toBe('partial');
  expect(await tick(since+HOUR+24*HOUR+60000)).toEqual([expect.objectContaining({outcome:'refund_eligible',reason:'UNDELIVERED_24H'})]);
 });
 it.each(['legacy','live-lease','not-card','race'])('leaves %s orders open',async kind=>{
  const at=since+3*HOUR;
  cardOrder(kind==='legacy'?{createdAt:new Date(since-HOUR)}:kind==='not-card'?{purchaseType:'GIFT'}:{});
  openDoc(kind==='legacy'?{createdAt:new Date(since-HOUR)}:kind==='live-lease'?{generationLease:{token:'live',expiresAt:new Date(at+60000)}}:{},exhausted);
  if(kind==='race')onPaymentFind=filter=>{if(filter.requestId)docs[0].updatedAt=new Date(at)};
  const marked=await tick(at);
  expect(docs[0].status).toBe('partial');expect(docs[0].llmMeta?.refundEligibleAt).toBeUndefined();
  expect(marked).toEqual(kind==='not-card'?[{requestId:'paid-original',outcome:'refund_not_card_order'}]:kind==='race'?[expect.objectContaining({outcome:'refund_mark_conflict'})]:[]);
  // A non-card verdict is remembered, so the order cannot hold a slot on later ticks.
  if(kind==='not-card'){expect(docs[0].llmMeta.refundSkipped).toBe('not_card_order');expect(await tick(at)).toEqual([])}
 });
 it('opens a refundable record for input that never arrived within the resume window',async()=>{
  const order=cardOrder({metadata:{fusionRecovery:{status:'input_required'}}});
  await tick(since+HOUR+inputWait-60000);expect(docs).toHaveLength(0);
  expect(await tick(since+HOUR+inputWait+60000)).toEqual([expect.objectContaining({outcome:'refund_eligible',reason:'INPUT_MISSING_7D'})]);
  expect(docs).toEqual([expect.objectContaining({idempotencyKey:'paid-original',status:'generation_failed',llmMeta:expect.objectContaining({refundReason:'INPUT_MISSING_7D'})})]);
  expect(order.metadata.fusionRecovery.status).toBe('refund_handoff');
 });
 it('a marked order answers refund pending and accepts no further generation writes',async()=>{
  cardOrder();openDoc({},exhausted);await tick(since+3*HOUR);
  const before=structuredClone(docs[0]);
  generator=()=>{throw Error('provider must not run')};
  for(const response of [await route(request(2),ENV),await route(new Request('https://example.test/api/fusion-fortune/result?requestId=paid-original'),ENV)]){
   expect(response.status).toBe(409);expect((await response.json()).reason).toBe('REFUND_PENDING');
  }
  const consultation=await import('../../worker/lib/fusion-fortune-consultation.js');
  expect(await consultation.saveFusionFortuneConsultation({userId:uid,requestId:'paid-original',result:sections,stage:2,qualityTier:'full'})).toBe('');
  await expect(consultation.claimFusionDeliveryLease({userId:uid,requestId:'paid-original'})).rejects.toMatchObject({status:409});
  expect(docs).toEqual([before]);expect(paymentChecks).toHaveLength(0);
 });
});
