/** @jest-environment node */
import { jest } from "@jest/globals";
const uid = "64b7f2a1c3d4e5f601234567";
const body = { idempotencyKey: "original-paid-request", birthInfo: { year:1993,month:7,day:21,hour:9,minute:0,timezone:9,lat:37.5665,lon:126.978,gender:"female" }, question: "나의 관계와 선택을 자세히 살펴보고 싶어요." };
let utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation;
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
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId, role: "user" }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, NakshatraAiConsultation: model,
    User: { findById: () => query({ role: "user" }) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null), findOneAndUpdate: (...args) => { usage(...args); return query({}); } },
    Payment: { findOne: filter => query(filter.status?.$in?.includes("refunded") ? (blocked === 1 ? {} : null) : mode === "paid" ? { _id: uid, merchantUid: "paid-original" } : null) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null) },
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({ canAccessPaidFeature: async () => ({ allowed: mode === "pass", accessSource: "family_pass" }), PAID_FEATURE_ACCESS_USER_PROJECTION: "id" }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? {} : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({ getSwissVedicPlanets: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({ startServiceExecution: async () => ({}), completeServiceExecution: async () => ({}), failServiceExecution: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ NAKSHATRA_SECTIONS: definitions } = await import("../../worker/lib/nakshatra-ai-prompt.js"));
  ({ handleNakshatraAiRoutes: route, __nakshatraAiTestUtils: utils } = await import("../../worker/routes/nakshatra-ai.js"));
});

beforeEach(()=>{
 docs=[];fault=null;lostConfirmation=false;blocked=-1;mode='pass';userId=uid;usage=jest.fn();refund=jest.fn(async()=>({}));chart=jest.fn(async()=>({planets:{Moon:10}}));
 provider=jest.fn(async(_env,prompt,options)=>{expect(options.timeoutMs).toBe(45000);expect(options.fallbackToWorkersAI).toBe(false);const section=definitions.find(row=>prompt.includes(`[이 장: ${row.title}]`));const identity=docs[0].factSummary.identity;return{ok:true,provider:'gemini',model:'fixture',text:JSON.stringify({keyInsight:section.title,vedicEvidence:identity.nakshatraKo+'의 실제 계산값',sukuyoEvidence:identity.sukuyoKo+'의 실제 계산값',body:prose(section.title.replace(/[?!]/g,""),section.minChars+100)})}});
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
async function start(extra={}) { return route(new Request('https://mock.test/api/nakshatra-ai/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,...extra})}),{}); }
async function batch() { return route(new Request('https://mock.test/api/nakshatra-ai/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:docs[0]?.id})}),{}); }
for(const paid of ['pass','monthly','paid'])it(`${paid}: three waves preserve all nine chapters and paid evidence`,async()=>{mode=paid;const first=await start();expect(await first.clone().json()).toMatchObject({ok:true});expect(first.status).toBe(202);expect(docs[0].sections).toHaveLength(4);expect(usage).not.toHaveBeenCalled();expect((await batch()).status).toBe(202);expect(docs[0].sections).toHaveLength(8);expect((await batch()).status).toBe(200);expect(docs[0].totalCharCount).toBeGreaterThanOrEqual(20000);expect(provider).toHaveBeenCalledTimes(9);expect(chart).toHaveBeenCalledTimes(1);expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(9)});
for(const status of ['delivery_pending','completed'])for(const kind of ['null','throw','confirm'])it(`${status} ${kind} preserves generated chapters without refund`,async()=>{await start();await batch();fault={status,kind};const response=await batch();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true});expect(refund).not.toHaveBeenCalled();const calls=provider.mock.calls.length;expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(calls)});

async function read(id = docs[0]?.id) { return route(new Request('https://mock.test/api/nakshatra-ai/result'+(id ? '?attemptId='+id : '')),{}); }
it('restores partial chapters from the account server record',async()=>{await start();const res=await read('');expect(res.status).toBe(202);expect(await res.json()).toMatchObject({sessionId:docs[0].id,requestId:body.idempotencyKey,progress:{completed:4}})});
it('rejects another account without provider calls',async()=>{await start();userId='other-account';expect((await batch()).status).toBe(404);expect((await read()).status).toBe(404);expect(provider).toHaveBeenCalledTimes(4)});
for(const source of [0,1,2,3])it(`rejects revoked evidence source ${source}`,async()=>{await start();blocked=source;expect((await batch()).status).toBe(402);expect(provider).toHaveBeenCalledTimes(4);expect(usage).not.toHaveBeenCalled()});
it('concurrent retries share one wave',async()=>{await start();const responses=await Promise.all([batch(),batch()]);expect(responses.map(r=>r.status)).toEqual([202,202]);expect(provider).toHaveBeenCalledTimes(8);expect(docs[0].sections).toHaveLength(8)});
it('keeps successful siblings when one checkpoint is unavailable',async()=>{fault={chapterCount:1,kind:'null'};expect((await start()).status).toBe(503);expect(docs[0].sections).toHaveLength(3);expect(refund).not.toHaveBeenCalled();await batch();await batch();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(10)});
it('does not complete or consume for short output',async()=>{provider.mockImplementation(async()=>({ok:true,text:JSON.stringify({keyInsight:'짧음',body:'짧은 결과',vedicEvidence:'근거',sukuyoEvidence:'근거'})}));expect((await start()).status).toBe(202);expect(docs[0].sections).toHaveLength(0);expect((await batch()).status).toBe(202);expect((await batch()).status).toBe(202);expect((await batch()).status).toBe(503);expect(provider).toHaveBeenCalledTimes(12);expect(usage).not.toHaveBeenCalled()});
it('does not replace historical short completed results',async()=>{await start();docs[0].status='completed';docs[0].decks={sukuyo:[{body:'과거 결과'}]};docs[0].totalCharCount=5;mode='none';expect((await read()).status).toBe(200);expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(4)});
it('delivers saved result when usage bookkeeping fails',async()=>{await start();await batch();usage.mockImplementation(()=>{throw new Error('bookkeeping unavailable')});expect((await batch()).status).toBe(200);expect(docs[0].status).toBe('completed');expect(refund).not.toHaveBeenCalled()});
it('retries only the chapter with contradictory calculated evidence',async()=>{const normal=provider.getMockImplementation();provider.mockImplementationOnce(async(...args)=>{const result=await normal(...args);const value=JSON.parse(result.text);value.vedicEvidence='잘못된 별자리';return{...result,text:JSON.stringify(value)}});await start();expect(docs[0].sections).toHaveLength(3);await batch();await batch();expect(docs[0].status).toBe('completed');expect(provider).toHaveBeenCalledTimes(10)});

it('uncertain exhausted attempts remain a storage failure without refund or extra calls',async()=>{await start();const missing=definitions.find(spec=>!docs[0].sections.some(row=>row.id===spec.id));docs[0].llmMeta.attempts[missing.id]=3;expect((await batch()).status).toBe(503);expect(docs[0].status).toBe('generating');expect(provider).toHaveBeenCalledTimes(4);expect(refund).not.toHaveBeenCalled()});
