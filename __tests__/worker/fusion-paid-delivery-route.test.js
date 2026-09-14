/** @jest-environment node */
import { jest } from '@jest/globals';
let docs, fault, lostConfirmation, route, generator, paymentChecks, revoked, store, accessType;
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
      if ("$lt" in value) return get(doc, key) < value.$lt;
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
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
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
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,FusionFortuneConsultation:model}));
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireUserFromRequest:async()=>({userId:uid}),getOptionalUserFromRequest:async()=>({userId:uid})}));
 jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isPaidResultRevoked:async()=>revoked}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:async(_env,args)=>{paymentChecks.push({...args,accessType});return {proven:true}},logPerUsePaymentProof:()=>{}}));
 jest.unstable_mockModule('../../worker/lib/fusion-fortune.js',()=>({...fusion,createMongoFusionFortuneStore:()=>store,
   generateFusionFortuneRequest:args=>fusion.generateFusionFortuneRequest({...args,
     contextBuilder:async()=>({ok:true,context:{version:1,locale:'ko',systems:{saju:{dayMaster:'갑'}},tarotSpread:{cards:[]}}}),
     generator:(...args)=>generator(...args),
   }),
 }));
 ({handleFusionFortuneRoutes:route}=await import('../../worker/routes/fusion-fortune.js'));
 store=fusion.createMemoryFusionFortuneStore();
});
afterAll(()=>{globalThis.fetch=originalFetch;jest.restoreAllMocks()});
beforeEach(()=>{docs=[];fault=null;lostConfirmation=false;paymentChecks=[];revoked=false;store.attempts.clear();accessType='pass'});
function request(stage=1){return new Request('https://example.test/api/fusion-fortune/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:'paid-original',birthDate:'1995-04-18',birthTime:'08:30',stage})})}
const sections=Object.fromEntries(['saju','ziwei','vedic','sukuyo','astrology','tarot'].map(key=>[`${key}Section`,{title:key,content:'계산 근거에 따른 생활 패턴을 설명합니다. '.repeat(25),keyPoints:[]} ]));
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
 it('rejects refunded proof before providers',async()=>{revoked=true;generator=()=>{throw Error('provider must not run')};const response=await route(request(),ENV);expect(response.status).toBe(403);expect(paymentChecks).toHaveLength(0)});
 it('preserves pending output when revocation is detected just before completion',async()=>{
  generator=async()=>({result:sections,deliverable:true,qualityTier:'partial'});await route(request(),ENV);
  generator=async({onAttempt})=>{await onAttempt('fusion');revoked=true;return {result:{...sections,title:'보존 본문'},deliverable:true,qualityTier:'full'}};
  const response=await route(request(2),ENV);expect(response.status).toBe(403);expect(docs[0].status).toBe('delivery_pending');expect(docs[0].result.title).toBe('보존 본문');
  const read=await route(new Request('https://example.test/api/fusion-fortune/result?requestId=paid-original'),ENV);expect(read.status).toBe(403);
 });
});
