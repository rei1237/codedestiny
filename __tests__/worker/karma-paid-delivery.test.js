/** @jest-environment node */
import { jest } from "@jest/globals";

const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 운명의 업", calendarType: "solar", focusArea: "overall", accessType: "pass" };
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
    if (fault && (fault.chapterCount ? update.$set.chapters?.length === fault.chapterCount : update.$set.status === fault.status)) {
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
beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const entitlement = await import("../../worker/lib/entitlement-policy.js");

  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, KarmaDestinyAiConsultation: model,
    User: { findById: () => query({ _id: uid, role: "user" }), updateOne: (...args) => refund(...args) },
    ServiceExecutionTransaction: { find: () => ({ sort() { return this; }, limit() { return this; }, lean: async () => [] }) },
    PaidExecutionRecord: { findOne: filter => query(blocked === 0 ? {} : mode === "deferred" && filter.status.$in.includes("generating") ? { _id: uid, requestId: "original-paid-request", status: "generating", accessMethod: "pass" } : null) },
    Payment: { findOne: filter => query(blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: (...args) => provider(...args) }));
  const calc = await import("../../worker/lib/karma-destiny-ai-calculations.js");
  jest.unstable_mockModule("../../worker/lib/karma-destiny-ai-calculations.js", () => ({ ...calc, buildKarmaDestinyIntegratedResult: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({ BILLING_SNAPSHOT_USER_PROJECTION: "id", handleBillingRoutes: async request => { const payload = await request.json(); if (request.url.endsWith("/cancel")) refund(payload); else usage(payload); return new Response(JSON.stringify({ ok: true })); } }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleKarmaDestinyAiRoutes: route, __karmaDestinyAiTestUtils: utils } = await import("../../worker/routes/karma-destiny-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({}));
  provider = jest.fn(async (_env, prompt, options) => {
    expect(options.timeoutMs).toBe(45000); expect(options.fallbackToWorkersAI).toBe(false);
    const id = options.cache.keyExtra.match(/chapter-(chapter-\d+)/)[1];
    const definition = utils.PREMIUM_CHAPTERS.find(row => row.id === id);
    return { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ id, title: definition.title, content: prose(id, 2250), summary: `${id}에서 확인한 선택`, keyTakeaways: [`${id} 기준 확인`, `${id} 상황 기록`, `${id} 행동 실험`], highlightQuotes: [] }) };
  });
  chart = jest.fn(async () => ({ lenses: { saju: { confidence: "high", data: { dayMaster: "갑" } }, ziwei: { confidence: "none" }, vedic: { confidence: "none" }, western: { confidence: "none" }, sukuyo: { confidence: "none" } }, synthesis: {}, saju: { dayMaster: "갑" } }));
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
async function start(extra = {}) {
  return route(new Request("https://mock.test/api/karma-destiny-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, ...extra }) }), {});
}


async function batch() { return route(new Request("https://mock.test/api/karma-destiny-ai/generate-batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: docs[0]?.id }) }), {}); }
for (const paid of ["pass", "monthly", "paid", "deferred"]) it(`${paid}: four bounded waves preserve chapters and original usage key`, async () => {
  mode = paid; expect((await start()).status).toBe(202);
  for (let wave=0;wave<3;wave++) { expect((await batch()).status).toBe(202); expect(docs[0].chapters).toHaveLength((wave+1)*4); expect(usage).not.toHaveBeenCalled(); }
  expect((await batch()).status).toBe(200); expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(15); expect(chart).toHaveBeenCalledTimes(1);
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(15); expect(refund).not.toHaveBeenCalled();
});
for(const status of ["delivery_pending","completed"]) for(const kind of ["null","throw","confirm"]) it(`${status} ${kind}: storage failure preserves generated report`,async()=>{
  mode="deferred"; await start(); for(let i=0;i<3;i++) await batch(); fault={status,kind}; const response=await batch(); expect(response.status).toBe(503); expect(await response.json()).toMatchObject({reason:"RESULT_STORAGE_UNAVAILABLE",retryable:true}); expect(refund).not.toHaveBeenCalled(); const calls=provider.mock.calls.length; fault=null;
  expect((await batch()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(calls);
});
it("one interrupted chapter does not discard its successful siblings",async()=>{
  await start(); const base=provider.getMockImplementation(); provider.mockImplementation(async(...args)=>args[2].cache.keyExtra.endsWith('chapter-02')?{ok:false}:base(...args));
  expect((await batch()).status).toBe(202); expect(docs[0].chapters.map(c=>c.id)).toEqual(['chapter-01','chapter-03','chapter-04']); const first=structuredClone(docs[0].chapters[0]);
  provider.mockImplementation(base); expect((await batch()).status).toBe(202); expect(docs[0].chapters[0]).toEqual(first); expect(provider.mock.calls.filter(c=>c[2].cache.keyExtra.endsWith('chapter-01'))).toHaveLength(1);
});
for(const store of [0,1,2,3]) it(`revoked store ${store} blocks resume before provider`,async()=>{ await start(); blocked=store; expect((await batch()).status).toBe(402); expect(provider).not.toHaveBeenCalled(); });
it("short output is bounded to three attempts per chapter and never charged",async()=>{await start(); provider.mockImplementation(async()=>({ok:true,text:'{"content":"짧음"}'}));for(let i=0;i<3;i++) expect((await batch()).status).toBe(202);expect((await batch()).status).toBe(503);expect(provider).toHaveBeenCalledTimes(12);expect(usage).not.toHaveBeenCalled();});
it("apply response loss leaves delivery_pending and retries the same key",async()=>{mode="deferred";await start();for(let i=0;i<3;i++)await batch();usage.mockImplementationOnce(()=>{throw new Error('response lost')});expect((await batch()).status).toBe(503);const calls=provider.mock.calls.length;expect(docs[0].status).toBe('delivery_pending');expect((await batch()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(calls);expect(usage.mock.calls.map(c=>c[0].requestId)).toEqual(['original-paid-request','original-paid-request']);expect(refund).not.toHaveBeenCalled();});

it("server discovery is account-scoped, preserves old completed results, and blocks them after cancellation",async()=>{await start();const id=docs[0].id;let response=await route(new Request('https://mock.test/api/karma-destiny-ai/result'),{});expect(response.status).toBe(202);expect((await response.json()).sessionId).toBe(id);userId='64b7f2a1c3d4e5f601234568';expect((await batch()).status).toBe(404);userId=uid;docs[0].status='completed';docs[0].chapters=[];expect((await route(new Request(`https://mock.test/api/karma-destiny-ai/result?sessionId=${id}`),{})).status).toBe(200);blocked=0;expect((await route(new Request(`https://mock.test/api/karma-destiny-ai/result?sessionId=${id}`),{})).status).toBe(403);});
it("fresh lease blocks duplicate generation, stale lease resumes only missing chapters",async()=>{await start();docs[0].generationProgress.lockToken='another';docs[0].generationProgress.lockedAt=new Date();expect((await batch()).status).toBe(202);expect(provider).not.toHaveBeenCalled();docs[0].generationProgress.lockedAt=new Date(Date.now()-121000);expect((await batch()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);});
it("cancellation after the final provider response prevents apply",async()=>{mode='deferred';await start();for(let i=0;i<3;i++)await batch();const base=provider.getMockImplementation();provider.mockImplementation(async(...args)=>{const value=await base(...args);blocked=0;return value;});expect((await batch()).status).toBe(402);expect(docs[0].status).toBe('delivery_pending');expect(usage).not.toHaveBeenCalled();});

it("checkpoint null preserves successful siblings and retries only the unsaved chapter",async()=>{await start();fault={chapterCount:2,kind:'null'};const response=await batch();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE'});const ids=docs[0].chapters.map(c=>c.id);expect(ids).toHaveLength(3);const calls=provider.mock.calls.length;expect((await batch()).status).toBe(202);for(const id of ids)expect(provider.mock.calls.slice(calls).some(c=>c[2].cache.keyExtra.endsWith(id))).toBe(false);expect(refund).not.toHaveBeenCalled();});
it("calculation storage failure resumes from original server input",async()=>{fault={status:'generating',kind:'null'};expect((await start()).status).toBe(503);expect(docs[0].integratedResult).toBeUndefined();docs[0].updatedAt=new Date(Date.now()-121000);expect((await batch()).status).toBe(202);expect(docs[0].integratedResult).toBeTruthy();expect(docs[0].idempotencyKey).toBe('original-paid-request');expect(provider).not.toHaveBeenCalled();expect(refund).not.toHaveBeenCalled();});
