/** @jest-environment node */
import { jest } from "@jest/globals";
const uid = "64b7f2a1c3d4e5f601234567";
const body = { idempotencyKey: "original-paid-request", selectedMethod: "saju", topic: "relationship", intensity: "standard", question: "반복되는 관계 선택을 구체적으로 살펴보고 싶습니다.", birthInput: { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", calendarType: "solar" } };
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
    if (fault && fault.kind !== "usage" && (fault.chapterCount ? Object.keys(update.$set.llmMeta?.sections || {}).length === fault.chapterCount : update.$set.status === fault.status)) {
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
  let value = `${seed} 양자리 라그나와 Ashwini의 계산 근거를 살펴봅니다. `;
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
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, NeoOperationRoomConsultation: model,
    User: { findById: () => query({ role: "user" }) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null), findOneAndUpdate: (...args) => { usage(...args); return query({}); } },
    Payment: { findOne: filter => query(filter.status?.$in?.includes("refunded") ? (blocked === 1 ? {} : null) : mode === "paid" ? { _id: uid, merchantUid: "paid-original" } : null) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null) },
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({ canAccessPaidFeature: async () => ({ allowed: mode === "pass", accessSource: "family_pass" }), PAID_FEATURE_ACCESS_USER_PROJECTION: "id" }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? {} : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/life-book-ai-saju.js", () => ({ calculateLifeBookAiSaju: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/service-execution-task.js", () => ({ startServiceExecution: async () => ({}), completeServiceExecution: async () => ({}), failServiceExecution: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ NEO_INITIAL_SECTIONS: definitions } = await import("../../worker/lib/neo-operation-room-prompt.js"));
  ({ handleNeoOperationRoomRoutes: route, __neoOperationRoomTestUtils: utils } = await import("../../worker/routes/neo-operation-room.js"));
});
function fixture(section) {
  const shape = structuredClone(section.schema);
  for (const [path, count] of Object.entries(section.counts || {})) {
    const keys = path.split('.'); let obj = shape; for (const key of keys.slice(0,-1)) obj = obj[key];
    const list = obj[keys.at(-1)]; while(list.length < count) list.push(structuredClone(list[0]));
  }
  let fields=0;
  function walk(value, key='', path='', fill=false) {
    if(Array.isArray(value)) return value.map((item,i)=>walk(item,'',path+i,fill));
    if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v,k,path+k,fill)]));
    if(typeof value==='number') return value;
    if(/^(title|operationTitle|name|label|method|area|palace)$/.test(key)) return "제목" + Array.from(section.id+path).map(c=>String.fromCharCode(0xac00+c.charCodeAt(0))).join("");
    if(!fill) { fields++; return value; }
    return prose(Array.from(section.id+path).map(c=>String.fromCharCode(0xac00+c.charCodeAt(0))).join(""), Math.ceil(section.minChars * 1.3 / fields));
  }
  walk(shape);
  return walk(shape,'','',true);
}
beforeEach(() => {
 docs=[];fault=null;lostConfirmation=false;blocked=-1;mode='pass';userId=uid;usage=jest.fn();refund=jest.fn(async()=>({}));chart=jest.fn(async()=>({}));
 provider=jest.fn(async(_env,prompt,options)=>{
   expect(options.timeoutMs).toBeLessThanOrEqual(45000);expect(options.fallbackToWorkersAI).toBe(false);
   const section=definitions.find(row=>prompt.includes(`제목: ${row.title}\n`));
   return {ok:true,provider:'gemini',model:'fixture',text:JSON.stringify(fixture(section))};
 });
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
async function start(extra) { return route(new Request('https://mock.test/api/neo-operation-room/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(extra || (docs[0] ? {sessionId:docs[0].id}:body))}),{}); }
for(const paid of ['pass','monthly','paid']) it(`${paid}: four waves save and reuse all fourteen sections`,async()=>{
 mode=paid;
 for(let i=0;i<3;i++){const response=await start();expect(await response.clone().json()).toMatchObject({ok:true});expect(response.status).toBe(202);expect(Object.keys(docs[0].llmMeta.sections)).toHaveLength((i+1)*4);expect(usage).not.toHaveBeenCalled();}
 const response=await start(); expect(await response.clone().json()).toMatchObject({status:'completed'});expect(response.status).toBe(200);expect(provider).toHaveBeenCalledTimes(14);expect(chart).toHaveBeenCalledTimes(1);
 expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(14);
});
for(const status of ['delivery_pending','completed']) for(const kind of ['null','throw','confirm']) it(`${status} ${kind} preserves paid generation`,async()=>{
 for(let i=0;i<3;i++)await start();fault={status,kind};let response=await start();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true,resultId:docs[0].id});expect(refund).not.toHaveBeenCalled();const count=provider.mock.calls.length;fault=null;expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count);
});
for(const store of [0,1,2,3]) it(`revoked store ${store} rejects resume`,async()=>{await start();blocked=store;const count=provider.mock.calls.length;expect((await start()).status).toBe(402);expect(provider).toHaveBeenCalledTimes(count)});
it('bookkeeping failure does not hide completed delivery',async()=>{usage.mockImplementation(()=>{throw new Error('ledger unavailable')});for(let i=0;i<3;i++)await start();expect((await start()).status).toBe(200);expect(docs[0].status).toBe('completed')});
it('short generation has a cumulative limit and no completion reward',async()=>{provider.mockImplementation(async()=>({ok:true,text:'{"short":"empty"}'}));for(let i=0;i<3;i++)expect((await start()).status).toBe(202);expect((await start()).status).toBe(503);expect(provider).toHaveBeenCalledTimes(12);expect(usage).not.toHaveBeenCalled()});
it('lease and ownership prevent concurrent and cross-account calls',async()=>{await start();const count=provider.mock.calls.length;docs[0].llmMeta.lockToken='other';docs[0].llmMeta.lockedAt=new Date();expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(count);userId='other';expect((await start()).status).toBe(404);userId=uid;docs[0].llmMeta.lockedAt=new Date(Date.now()-121000);expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(count+4)});
it('checkpoint null keeps successful siblings',async()=>{fault={chapterCount:2,kind:'null'};expect((await start()).status).toBe(503);expect(Object.keys(docs[0].llmMeta.sections)).toHaveLength(3);expect(refund).not.toHaveBeenCalled();expect((await start()).status).toBe(202)});
it('apply response loss resumes the saved result without another generation',async()=>{for(let i=0;i<3;i++)await start();fault={kind:'usage'};expect((await start()).status).toBe(503);expect(docs[0].status).toBe('delivery_pending');expect(refund).not.toHaveBeenCalled();const count=provider.mock.calls.length;expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(count)});
it('truncated output keeps the other sections and retries only the missing one',async()=>{const original=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{const value=await original(...args);return args[1].includes(`제목: ${definitions[1].title}\n`)?{...value,truncated:true}:value});expect((await start()).status).toBe(202);expect(Object.keys(docs[0].llmMeta.sections)).toEqual(['opening','innateStrength','topicStyle']);provider.mockImplementation(original);expect((await start()).status).toBe(202);expect(provider.mock.calls.filter(call=>call[1].includes(`제목: ${definitions[0].title}\n`))).toHaveLength(1)});
it('server discovery is owned and historical completed reports bypass new quality rules',async()=>{await start();let response=await route(new Request('https://mock.test/api/neo-operation-room/result'),{});expect(response.status).toBe(202);expect((await response.json()).initialBriefing).toBeTruthy();const id=docs[0].id;userId='other';expect((await route(new Request(`https://mock.test/api/neo-operation-room/result?attemptId=${id}`),{})).status).toBe(404);userId=uid;docs[0].status='completed';docs[0].initialBriefing={old:'short'};blocked=1;expect((await start()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(4)});
it('cancellation after generation prevents completion bookkeeping',async()=>{for(let i=0;i<3;i++)await start();const original=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{const value=await original(...args);blocked=0;return value});expect((await start()).status).toBe(402);expect(docs[0].status).toBe('delivery_pending');expect(usage).not.toHaveBeenCalled()});
it('overlapping requests acquire only one generation lease',async()=>{let release;const gate=new Promise(resolve=>{release=resolve});const original=provider.getMockImplementation();let enter;const entered=new Promise(resolve=>{enter=resolve});provider.mockImplementation(async(...args)=>{enter();await gate;return original(...args)});const first=start();await entered;expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);release();expect((await first).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4)});
