/** @jest-environment node */
import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let docs, orders, missingEvidence, fault, lostConfirmation, route, generator, paymentChecks, revoked, store, accessType;
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
  updateOne: async (filter, update) => { const doc=docs.find(row=>matches(row,filter)); if(doc)assign(doc,update.$set||{});return {matchedCount:doc?1:0}; },
};

const ENV={ENABLE_FUSION_FORTUNE_API:'true',ENABLE_FUSION_FORTUNE_UI:'true',ENABLE_FUSION_FORTUNE_MOCK_FLOW:'true'};
beforeAll(async()=>{
 jest.spyOn(console,'warn').mockImplementation(()=>{});
 globalThis.fetch=()=>{throw Error('External fetch forbidden in delivery mocks')};
 const models=await import('../../worker/lib/models.js');
 const db=await import('../../worker/lib/db.js');
 const auth=await import('../../worker/lib/auth.js');
 const fusion=await import('../../worker/lib/fusion-fortune.js');
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,FusionFortuneConsultation:model,Payment:{
  find:filter=>({sort(){return this},limit(){return this},lean:async()=>clone(orders.filter(order=>matches(order,filter)))}),
  updateOne:async(filter,update)=>{const order=orders.find(row=>matches(row,filter));if(order)assign(order,update.$set||{});return {matchedCount:order?1:0}},
 }}));
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,run)=>run()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireUserFromRequest:async()=>({userId:uid}),getOptionalUserFromRequest:async()=>({userId:uid})}));
 jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isPaidResultRevoked:async()=>revoked}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:async(_env,args)=>{paymentChecks.push({...args,accessType});return {proven:!(missingEvidence&&args.requireExisting)}},logPerUsePaymentProof:()=>{}}));
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
beforeEach(()=>{docs=[];orders=[];missingEvidence=false;fault=null;lostConfirmation=false;paymentChecks=[];revoked=false;store.attempts.clear();accessType='pass'});
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
 it('keeps short second-stage output pending and reuses the first-stage report',async()=>{
  const initial=Object.fromEntries(Object.entries(sections).map(([key,value])=>[key,{...value,content:value.content.slice(0,500)}]));
  generator=async()=>({result:initial,deliverable:true,qualityTier:'partial'});await route(request(),ENV);
  generator=async({priorResult})=>({result:{...priorResult,title:'short',executiveSummary:'too short'},deliverable:true,qualityTier:'full'});
  const short=await route(request(2),ENV);expect(short.status).toBe(202);expect(await short.json()).toMatchObject({status:'partial',nextStage:2});
  expect(docs[0].result.deliveryRepairGroups).toEqual(['integration','action','verdict']);
  generator=async({priorResult})=>{expect(priorResult.deliveryRepairGroups).toHaveLength(3);return {result:{...sections,executiveSummary:'complete'},deliverable:true,qualityTier:'full'}};
  const final=await route(request(2),ENV);expect(final.status).toBe(200);expect(docs[0].result.deliveryRepairGroups).toBeUndefined();
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
    : {monitorPaidNarratives:async()=>{}, runYeongnyangiRecovery: async () => {}, runPaymentReconcileTask:async()=>{},runPaymentsV2Reconcile:async()=>{},runSnsDailyPostRecovery:async()=>{},runThreadsDailyJobs:async()=>{},runMasterLoveCodexRecovery:async()=>{},runZiweiDeepReportRecovery:async()=>{}},
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
  const stages=[];generator=async({stage})=>{stages.push(stage);return {result:sections,deliverable:true,qualityTier:'partial'}};
  const {runFusionFortuneRecovery}=await import('../../worker/lib/fusion-fortune-recovery-task.js');
  await runFusionFortuneRecovery(ENV);
  expect(stages).toEqual([1]);expect(docs[0].status).toBe('partial');expect(docs[0].nextStage).toBe(2);
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
