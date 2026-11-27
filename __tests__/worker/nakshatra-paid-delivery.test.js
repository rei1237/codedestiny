/** @jest-environment node */
import { jest } from "@jest/globals";
import { AI_OUTPUT_LOCALES } from '../../lib/i18n/ai-locale.js';
import { getAmbientAiLocale, runWithAiLocale } from '../../worker/lib/ai-locale-context.js';
// Stress fixture: preserve multi-part storage/lease failures at the former batch width.
// Production's one-part contract is covered by paid-llm-sequential.test.js.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

const uid = "64b7f2a1c3d4e5f601234567";
const body = { idempotencyKey: "original-paid-request", birthInfo: { year:1993,month:7,day:21,hour:9,minute:0,timezone:9,lat:37.5665,lon:126.978,gender:"female" }, question: "나의 관계와 선택을 자세히 살펴보고 싶어요." };
let settleStuck, utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation, passReceipt, passRefund, consume, accessQueue, passOrder, withdrawn;
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
      if ("$lt" in value) return new Date(get(doc, key)) < value.$lt;
    }
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
  findOneAndUpdate: (filter, update) => {
    if (fault?.refinementStatus && update.$set.refinementStatus === fault.refinementStatus) {
      const current=fault; fault=null;
      if(current.kind==='throw') throw new Error('mock refinement storage');
      if(current.kind==='null') return query(null);
      if(current.kind==='confirm') lostConfirmation=true;
    }
    if (fault && (fault.status || fault.chapterCount) && fault.kind !== "usage" && (fault.chapterCount ? update.$set.sections?.length === fault.chapterCount : update.$set.status === fault.status)) {
      const current = fault; fault = null;
      if (current.kind === "throw") throw new Error("mock storage");
      if (current.kind === "null") return query(null);
      if (current.kind === "confirm") lostConfirmation = true;
    }
    const doc = docs.find(row => matches(row, filter));
    if (doc) assign(doc, { ...update.$set, updatedAt: new Date() });
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    if (fault?.kind === 'usage' && update.$set.usageAppliedAt) { fault=null; throw new Error('apply response lost'); }
    const doc = docs.find(row => matches(row, filter));
    if (doc) assign(doc, update.$set);
    return { modifiedCount: doc ? 1 : 0 };
  },
};

function prose(seed, length) {
  let value = `${seed} 두 전통의 계산 근거를 살펴봅니다. `;
  for (let i = 0; value.replace(/\s/g, "").length < length; i++) value += `${seed}의 ${i}번째 관찰은 현재 생활에서 반복되는 선택을 돌아보고 작은 행동으로 확인하는 과정을 설명합니다. `;
  return value;
}
let definitions;
beforeAll(async () => {
  const pass = await import("../../worker/lib/pass-consumption.js");
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ ...pass,
    consumePassForFeature: (...args) => consume(...args), hasConsumedPassFeature: async () => passReceipt,
    refundPassUseEvidence: async (...args) => passRefund(...args) }));
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId, role: "user" }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, NakshatraAiConsultation: model,
    User: { findById: () => query({ role: "user" }), findOne: () => query({ _id: uid, role: "user", status: withdrawn ? "withdrawn" : "active" }) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null), findOneAndUpdate: (...args) => { usage(...args); return query({}); } },
    Payment: { findOne: filter => query(filter.paymentType === "membership_pass" ? passOrder : filter.status?.$in?.includes("refunded") ? (blocked === 1 ? {} : null) : mode === "paid" ? { _id: uid, merchantUid: "paid-original" } : null) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null) },
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({ canAccessPaidFeature: async () => ({ allowed: accessQueue.length ? accessQueue.shift() : mode === "pass", accessSource: "family_pass" }), PAID_FEATURE_ACCESS_USER_PROJECTION: "id" }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? {} : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({ getSwissVedicPlanets: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({ startServiceExecution: async () => ({}), completeServiceExecution: async () => ({}), failServiceExecution: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ NAKSHATRA_SECTIONS: definitions } = await import("../../worker/lib/nakshatra-ai-prompt.js"));
  ({ handleNakshatraAiRoutes: route, __nakshatraAiTestUtils: utils, settleStuckDelivery: settleStuck } = await import("../../worker/routes/nakshatra-ai.js"));
});

beforeEach(()=>{
 accessQueue=[];passOrder=null;withdrawn=false;docs=[];fault=null;lostConfirmation=false;blocked=-1;mode='pass';userId=uid;usage=jest.fn();refund=jest.fn(async()=>({}));passReceipt=false;passRefund=jest.fn(async()=>({refunded:true}));consume=jest.fn(async()=>({covered:true}));chart=jest.fn(async()=>({planets:{Moon:10}}));
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);const section=definitions.find(row=>prompt.includes(`[이 장: ${row.title}]`));const identity=docs[0].factSummary.identity;return{ok:true,provider:'gemini',model:'fixture',text:JSON.stringify({keyInsight:section.title,vedicEvidence:identity.nakshatraKo+'의 실제 계산값',sukuyoEvidence:identity.sukuyoKo+'의 실제 계산값',body:prose(section.title.replace(/[?!]/g,""),section.minChars+100)})}});
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
for (const repair of ['shorter', 'empty', 'evidence', 'repeated']) it(`keeps a valid short draft after ${repair} repair and delivers the total`, async () => {
  const normal = provider.getMockImplementation();
  const id = definitions[0].id;
  let tries = 0, draft;
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args);
    if (!args[1].includes(`[이 장: ${definitions[0].title}]`)) return result;
    const row = JSON.parse(result.text);
    tries++;
    row.body = prose('고유초안', tries === 1 ? 1300 : 700);
    if (tries === 1) draft = row.body.trim();
    else if (repair === 'empty') row.body = '';
    else if (repair === 'evidence') row.vedicEvidence = '잘못된 계산값';
    else if (repair === 'repeated') row.body = (prose('반복된해석', 150) + '\n').repeat(30);
    return { ...result, text: JSON.stringify(row) };
  });
  await start();
  expect(docs[0].sections.find(row => row.id === id).body).toBe(draft);
  for (let i = 0; i < 5 && docs[0].status !== 'completed'; i++) await batch();
  expect(docs[0].status).toBe('completed');
  expect(docs[0].sections.find(row => row.id === id).body).toBe(draft);
  expect(docs[0].llmMeta.attempts[id]).toBe(1);
  expect(tries).toBe(1);
  expect(docs[0].totalCharCount).toBeGreaterThanOrEqual(Math.max(20000, definitions.reduce((sum, section) => sum + section.minChars, 0)));
});
it('keeps total shortfall partial after the original attempt budget is exhausted', async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args); const row = JSON.parse(result.text);
    row.body = prose(row.keyInsight.replace(/[?!]/g, ""), 650);
    return { ...result, text: JSON.stringify(row) };
  });
  await start(); expect((await batch()).status).toBe(202); expect((await batch()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(definitions.length);
  expect(docs[0].status).toBe('completed');
  expect(usage).toHaveBeenCalledTimes(1); expect(refund).not.toHaveBeenCalled();
});
for (const stage of ['reserved', 'last']) it(`accepts the short draft on ${stage} attempt without resetting its budget`, async () => {
  const normal = provider.getMockImplementation(); const section = definitions[0]; let tries = 0;
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args);
    if (!args[1].includes(`[이 장: ${section.title}]`)) return result;
    tries++; const row = JSON.parse(result.text); row.body = prose('마지막고유초안', 1300);
    if (stage === 'last' && tries < 2) row.body = '';
    return { ...result, text: JSON.stringify(row) };
  });
  await start();
  if (stage === 'reserved') { docs[0].llmMeta.attempts[section.id] = 2; docs[0].llmMeta.attempts[`${section.id}:lengthRepair`] = 1; }
  for (let i = 0; i < 6 && docs[0].status !== 'completed'; i++) await batch();
  expect(docs[0].status).toBe('completed'); expect(tries).toBe(stage === 'last' ? 2 : 1);
});
async function start(extra={}) { return route(new Request('https://mock.test/api/nakshatra-ai/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,...extra})}),{}); }
async function batch() { return route(new Request('https://mock.test/api/nakshatra-ai/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:docs[0]?.id})}),{}); }
it.each(AI_OUTPUT_LOCALES)('preserves %s when later batches use another UI language',async(locale)=>{
 const seen=[],original=provider.getMockImplementation();
 provider.mockImplementation((...args)=>{seen.push(getAmbientAiLocale());return original(...args);});
 await runWithAiLocale(locale,start);
 expect(docs[0].llmMeta.resumeBody.locale).toBe(locale);
 await runWithAiLocale('ko',batch);await runWithAiLocale('en',batch);
 expect(docs[0].status).toBe('completed');
 expect(seen).toHaveLength(9);expect(seen.every(value=>value===locale)).toBe(true);
 await runWithAiLocale('ja',batch);expect(provider).toHaveBeenCalledTimes(9);
});
for(const paid of ['pass','monthly','paid'])it(`${paid}: three waves preserve all nine chapters and paid evidence`,async()=>{mode=paid;const first=await start();expect(await first.clone().json()).toMatchObject({ok:true});expect(first.status).toBe(202);expect(docs[0].sections).toHaveLength(4);expect(usage).not.toHaveBeenCalled();expect((await batch()).status).toBe(202);expect(docs[0].sections).toHaveLength(8);expect((await batch()).status).toBe(200);expect(docs[0].totalCharCount).toBeGreaterThanOrEqual(20000);expect(provider).toHaveBeenCalledTimes(9);expect(chart).toHaveBeenCalledTimes(1);expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9)});
for(const status of ['delivery_pending','completed'])for(const kind of ['null','throw','confirm'])it(`${status} ${kind} preserves generated chapters without refund`,async()=>{await start();await batch();fault={status,kind};const response=await batch();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true});expect(refund).not.toHaveBeenCalled();const calls=provider.mock.calls.length;expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(calls)});
it('delivers finished chapters when the late pass settlement hits the monthly limit',async()=>{
  const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});
  await start();await batch();consume.mockResolvedValue({covered:false,reason:'monthly_pass_limit_exceeded'});
  expect((await batch()).status).toBe(200);
  expect(docs[0]).toMatchObject({status:'completed',llmMeta:{usageSettlement:'failed',usageSettlementReason:'MONTHLY_PASS_LIMIT_EXCEEDED'}});
  expect(refund).not.toHaveBeenCalled();expect(passRefund).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith('paid_delivery_usage_settlement_failed',expect.objectContaining({service:'nakshatra-ai',reason:'MONTHLY_PASS_LIMIT_EXCEEDED'}));
  warn.mockRestore();
});
it('keeps finished chapters pending when the late pass settlement hits a transient error',async()=>{
  await start();await batch();consume.mockRejectedValueOnce(new Error('mock pass db down'));
  expect((await batch()).status).toBe(503);expect(docs[0].status).toBe('delivery_pending');expect(refund).not.toHaveBeenCalled();
  expect((await batch()).status).toBe(200);expect(docs[0].status).toBe('completed');expect(docs[0].llmMeta.usageSettlement).toBeUndefined();
});

it('delivers finished chapters when the pass recheck after the last wave is denied by the pass limit',async()=>{
  const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});
  await start();await batch();accessQueue=[true,false];
  expect((await batch()).status).toBe(200);
  expect(docs[0]).toMatchObject({status:'completed',llmMeta:{usageSettlement:'failed',usageSettlementReason:'PAYMENT_REQUIRED'}});
  expect(consume).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();expect(passRefund).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith('paid_delivery_usage_settlement_failed',expect.objectContaining({service:'nakshatra-ai',stage:'access_recheck'}));
  warn.mockRestore();
});
async function pendingAfterStorageLoss(){await start();await batch();fault={status:'completed',kind:'null'};expect((await batch()).status).toBe(503);expect(docs[0].status).toBe('delivery_pending');mode='none';}
it('resumes a delivery_pending pass consultation when the pass is now exhausted',async()=>{
  const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});
  await pendingAfterStorageLoss();const calls=provider.mock.calls.length;const consumed=consume.mock.calls.length;
  expect((await batch()).status).toBe(200);
  expect(docs[0]).toMatchObject({status:'completed',llmMeta:{usageSettlement:'failed'}});
  expect(provider).toHaveBeenCalledTimes(calls);expect(consume).toHaveBeenCalledTimes(consumed);expect(refund).not.toHaveBeenCalled();
  warn.mockRestore();
});
for(const [label,setup] of [['refunded pass order',()=>{passOrder={}}],['withdrawn member',()=>{withdrawn=true}],['refunded use marker',()=>{blocked=2}]])it(`does not deliver a delivery_pending pass consultation after ${label}`,async()=>{
  await pendingAfterStorageLoss();setup();
  expect((await batch()).status).toBe(402);expect(docs[0].status).toBe('delivery_pending');expect(docs[0].llmMeta.usageSettlement).toBeUndefined();
});
async function read(id = docs[0]?.id) { return route(new Request('https://mock.test/api/nakshatra-ai/result'+(id ? '?attemptId='+id : '')),{}); }
it('restores partial chapters from the account server record',async()=>{await start();const res=await read('');expect(res.status).toBe(202);expect(await res.json()).toMatchObject({sessionId:docs[0].id,requestId:body.idempotencyKey,progress:{completed:4}})});
it('rejects another account without provider calls',async()=>{await start();userId='other-account';expect((await batch()).status).toBe(404);expect((await read()).status).toBe(404);expect(provider).toHaveBeenCalledTimes(4)});
for(const source of [0,1,2,3])it(`rejects revoked evidence source ${source}`,async()=>{await start();blocked=source;expect((await batch()).status).toBe(402);expect(provider).toHaveBeenCalledTimes(4);expect(usage).not.toHaveBeenCalled()});
it('concurrent retries share one wave',async()=>{await start();const responses=await Promise.all([batch(),batch()]);expect(responses.map(r=>r.status)).toEqual([202,202]);expect(provider).toHaveBeenCalledTimes(8);expect(docs[0].sections).toHaveLength(8)});
it('keeps successful siblings when one checkpoint is unavailable',async()=>{fault={chapterCount:1,kind:'null'};expect((await start()).status).toBe(503);expect(docs[0].sections).toHaveLength(3);expect(refund).not.toHaveBeenCalled();await batch();await batch();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(10)});
it('does not complete or consume for short output',async()=>{provider.mockImplementation(async()=>({ok:true,text:JSON.stringify({keyInsight:'짧음',body:'짧은 결과',vedicEvidence:'근거',sukuyoEvidence:'근거'})}));expect((await start()).status).toBe(202);expect(docs[0].sections).toHaveLength(0);expect((await batch()).status).toBe(202);expect((await batch()).status).toBe(503);expect(provider).toHaveBeenCalledTimes(8);expect(usage).not.toHaveBeenCalled();expect(passRefund).not.toHaveBeenCalled()});
it('restores a pass pre-deducted at checkout when short output exhausts attempts',async()=>{passReceipt=true;provider.mockImplementation(async()=>({ok:true,text:JSON.stringify({keyInsight:'짧음',body:'짧은 결과',vedicEvidence:'근거',sukuyoEvidence:'근거'})}));await start();await batch();expect((await batch()).status).toBe(503);expect(passRefund).toHaveBeenCalledTimes(1);expect(passRefund.mock.calls[0][0]).toMatchObject({featureKey:'nakshatra-ai-consultation',requestId:'original-paid-request'})});
it('does not replace historical short completed results',async()=>{await start();docs[0].status='completed';docs[0].decks={sukuyo:[{body:'과거 결과'}]};docs[0].totalCharCount=5;mode='none';expect((await read()).status).toBe(200);expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(4)});
it('delivers saved result when usage bookkeeping fails',async()=>{await start();await batch();usage.mockImplementation(()=>{throw new Error('bookkeeping unavailable')});expect((await batch()).status).toBe(200);expect(docs[0].status).toBe('completed');expect(refund).not.toHaveBeenCalled()});
it('retries only the chapter with contradictory calculated evidence',async()=>{const normal=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{const result=await normal(...args);const value=JSON.parse(result.text);value.vedicEvidence='잘못된 별자리';return{...result,text:JSON.stringify(value)}});await start();expect(docs[0].sections).toHaveLength(3);await batch();await batch();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(10)});

// 2026-11-27 마지막 허용 시도 전달: 거절 대신 salvage·scrub·dedupe·계산값 채움. 첫 시도 기준은 그대로다.
it('delivers a truncated, evidence-less, repeated chapter on the last attempt instead of failing',async()=>{
  const target=definitions[definitions.length-1];const normal=provider.getMockImplementation();const own=prose('마지막장',target.minChars+100);
  const copied=prose(definitions[0].title.replace(/[?!]/g,""),definitions[0].minChars+100);
  provider.mockImplementation(async(...args)=>{const result=await normal(...args);if(!args[1].includes(`[이 장: ${target.title}]`))return result;
    const text=JSON.stringify({keyInsight:'assistant 요약',vedicEvidence:'',sukuyoEvidence:'',body:copied+own+own+'assistant 가 덧붙인 메타 문장입니다. 끝맺지 못하고 잘린 문장'});
    return{...result,truncated:true,finishReason:'MAX_TOKENS',text:text.slice(0,-2)}});
  await start();for(let i=0;i<6&&docs[0].status!=='completed';i++)await batch();
  expect(docs[0].status).toBe('completed');expect(refund).not.toHaveBeenCalled();expect(passRefund).not.toHaveBeenCalled();
  const row=docs[0].sections.find(saved=>saved.id===target.id);const identity=docs[0].factSummary.identity;
  expect(docs[0].llmMeta.attempts[target.id]).toBe(2);expect(row.finalCorrected).toBe(true);
  expect(row.body).not.toMatch(/assistant|잘린 문장$/);expect(row.body).not.toContain(copied.trim().split('. ')[1]);
  expect(row.vedicEvidence).toContain(identity.nakshatraKo);expect(row.sukuyoEvidence).toContain(identity.sukuyoKo);expect(row.keyInsight).not.toMatch(/assistant/);
  const {hasRepeatedReportPassage}=await import('../../worker/lib/paid-report-quality.js');expect(hasRepeatedReportPassage(docs[0].sections.map(saved=>saved.body).join('\n'))).toBe(false);
});
it('still fails a last attempt whose body is empty or unparseable',async()=>{
  const target=definitions[definitions.length-1];const normal=provider.getMockImplementation();
  provider.mockImplementation(async(...args)=>args[1].includes(`[이 장: ${target.title}]`)?{ok:true,provider:'gemini',model:'fixture',text:'{"body": 깨진'}:normal(...args));
  await start();let last;for(let i=0;i<6&&docs[0].status!=='completed'&&(!last||last.status!==503);i++)last=await batch();
  expect(last.status).toBe(503);expect(docs[0].status).not.toBe('completed');expect(docs[0].sections.find(saved=>saved.id===target.id&&saved.body)).toBeUndefined();
});
it('uncertain exhausted attempts remain a storage failure without refund or extra calls',async()=>{await start();const missing=definitions.find(spec=>!docs[0].sections.some(row=>row.id===spec.id));docs[0].llmMeta.attempts[missing.id]=3;expect((await batch()).status).toBe(503);expect(docs[0].status).toBe('generating');expect(provider).toHaveBeenCalledTimes(4);expect(refund).not.toHaveBeenCalled()});
it('reuses the original nine chapters for an authenticated Toss order and keeps its stored result off the web route',async()=>{
  const {bindNativeTossRequest}=await import('../../worker/toss/native-context.js');
  const {nativeNakshatraContract}=await import('../../worker/routes/nakshatra-ai.js');
  const order='synthetic-nakshatra-order';
  const contract=nativeNakshatraContract({...body,requestId:body.idempotencyKey});
  let usable=true;
  const bind=request=>bindNativeTossRequest(request,{
    auth:{userId:uid,tossNative:true},
    async access(hash,key){
      expect(hash).toBe(contract.inputHash);expect(key).toBe(contract.requestId);
      return usable?{ok:true,accessType:'paid',source:'toss',paymentId:order}:{ok:false};
    },
    async assertStored(doc){
      if(!usable||doc.accessSource!=='toss'||doc.paymentId!==order||doc.inputHash!==contract.inputHash)throw Object.assign(Error('denied'),{code:'RESULT_NOT_FOUND',status:404});
    },
  });
  const call=(path,input)=>route(bind(new Request('https://mock.test/api/nakshatra-ai/'+path,{method:input?'POST':'GET',headers:{'content-type':'application/json'},...(input?{body:JSON.stringify(input)}:{})})),{});
  await call('start',body);
  expect(docs).toHaveLength(1);expect(docs[0].accessSource).toBe('toss');
  for(let wave=0;wave<8&&docs[0].status!=='completed';wave++)await call('generate',{sessionId:docs[0].id,idempotencyKey:body.idempotencyKey});
  expect(docs[0].status).toBe('completed');
  expect(docs[0].decks.consultation.map(ch=>ch.id)).toEqual(definitions.map(ch=>ch.id));
  const count=provider.mock.calls.length;
  expect((await call('result?id='+docs[0].id)).status).toBe(200);
  expect((await read(docs[0].id)).status).toBe(404);
  usable=false;
  expect((await call('result?id='+docs[0].id)).status).toBe(404);
  expect(provider).toHaveBeenCalledTimes(count);
  expect(usage).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();
});

// 2026-11-22 D2: 복구 크론의 정체 확정. 낙샤트라는 즉시 환불 서비스라 기존 실패 경로(증빙 해제 → 실행 환불 → 결제 화면 이용권 환불)를 그대로 쓴다.
describe("settleStuckDelivery", () => {
  const stuckDoc = () => ({ id: docs[0].id, userId: docs[0].userId });
  const quiet = async work => { const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); try { return await work(); } finally { warn.mockRestore(); } };
  async function stalled() { await start(); expect(docs[0].status).toBe("generating"); docs[0].updatedAt = new Date(Date.now() - 300000); return clone(docs[0].sections); }
  it("revoked payment is only alerted and never refunded again", async () => {
    await stalled(); blocked = 0;
    expect(await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() }))).toEqual({ outcome: "unsettled" });
    expect(docs[0].status).toBe("generating");
    expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
  });
  it("fails a stalled report and refunds it once through the existing execution refund", async () => {
    refund.mockResolvedValue({ ok: true, execution: { refundStatus: "refunded" } });
    const sections = await stalled();
    expect(await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() }))).toEqual({ outcome: "generation_failed", refundStatus: "refunded" });
    expect(docs[0]).toMatchObject({ status: "generation_failed", generationError: { code: "DELIVERY_STUCK" }, sections, generationProgress: { lockedAt: null, lockToken: "" } });
    expect(refund).toHaveBeenCalledTimes(1);
    expect(refund.mock.calls[0][1]).toBe(uid);
    expect(refund.mock.calls[0][2]).toMatchObject({ executionKey: "nakshatra-ai-consultation:original-paid-request", sessionId: docs[0].id, forceRefundOnClose: true });
    expect(passRefund).not.toHaveBeenCalled(); expect(consume).not.toHaveBeenCalled();
    expect((await settleStuck({}, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("progressed");
    expect(refund).toHaveBeenCalledTimes(1);
  });
  it("restores a checkout pass and reports pending when the execution refund throws", async () => {
    refund.mockRejectedValue(new Error("mock refund down"));
    await stalled(); docs[0].accessSource = "pass-receipt"; passRefund.mockRejectedValue(new Error("mock pass down"));
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try { expect(await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() }))).toEqual({ outcome: "generation_failed", refundStatus: "pending" }); }
    finally { error.mockRestore(); }
    expect(passRefund).toHaveBeenCalledTimes(1);
    expect(passRefund.mock.calls[0][0]).toMatchObject({ featureKey: "nakshatra-ai-consultation", requestId: "original-paid-request", refundId: "nakshatra-ai:original-paid-request" });
    expect(docs[0].status).toBe("generation_failed");
  });
  it("leaves a live generation, a Toss native session and a finished result alone", async () => {
    await start();
    expect((await settleStuck({}, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("leased");
    docs[0].updatedAt = new Date(Date.now() - 300000); docs[0].generationProgress.lockedAt = new Date();
    expect((await settleStuck({}, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("leased");
    docs[0].generationProgress.lockedAt = null; docs[0].accessSource = "toss";
    expect((await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() }))).outcome).toBe("unsettled");
    docs[0].accessSource = ""; docs[0].status = "completed";
    expect((await settleStuck({}, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("progressed");
    expect((await settleStuck({}, { doc: {}, now: Date.now() })).outcome).toBe("unsupported");
    expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
  });
});
