/** @jest-environment node */
import { jest } from "@jest/globals";

const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", palaceKey: "명궁", calendarType: "solar", focusArea: "overall", accessType: "pass" };
let route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation;
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("$ne" in value) return doc[key] !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(doc[key]);
      if ("$in" in value) return value.$in.includes(doc[key]);
      if ("$exists" in value) return (doc[key] !== undefined) === value.$exists;
      if ("$lt" in value) return new Date(doc[key]) < value.$lt;
    }
    return String(doc[key]) === String(value);
  });
}
const model = {
  findOne: filter => { if (lostConfirmation) { lostConfirmation = false; return query(null); } return query(docs.find(doc => matches(doc, filter)) || null); },
  create: async fields => {
    if (fault?.status === "create") { fault = null; throw new Error("insert unavailable"); }
    if (docs.some(doc => doc.userId === fields.userId && doc.idempotencyKey === fields.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = { usageAppliedAt: null, ...clone(fields), createdAt: new Date(), updatedAt: new Date() }; docs.push(doc); return clone(doc);
  },
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
  findOneAndUpdate: (filter, update) => {
    if (fault && update.$set.status === fault.status) {
      const current = fault; fault = null;
      if (current.kind === "throw") throw new Error("mock storage");
      if (current.kind === "null") return query(null);
      if (current.kind === "confirm") lostConfirmation = true;
    }
    const doc = docs.find(row => matches(row, filter));
    if (doc) Object.assign(doc, clone(update.$set), { updatedAt: new Date() });
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    const doc = docs.find(row => matches(row, filter));
    if (doc) Object.assign(doc, clone(update.$set));
    return { modifiedCount: doc ? 1 : 0 };
  },
};

function prose(seed, length) {
  let value = `${seed} 자미의 계산 근거를 살펴봅니다. `;
  for (let i = 0; value.replace(/\s/g, "").length < length; i++) value += `${seed}의 ${i}번째 관찰은 현재 생활에서 반복되는 선택을 돌아보고 작은 행동으로 확인하는 과정을 설명합니다. `;
  return value;
}
beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const entitlement = await import("../../worker/lib/entitlement-policy.js");
  const structured = await import("../../worker/lib/structured-consultation.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, ZiweiAiConsultation: model,
    User: { findById: () => query({ _id: uid, role: "user" }), updateOne: (...args) => refund(...args) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null) },
    Payment: { findOne: filter => query(blocked === 1 ? {} : mode === "paid" && filter.status?.$in?.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ consumePassForFeature: async (...args) => { usage(...args); return { covered: true }; }, passDenialCode: () => "" }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ fetchPortOnePayment: () => { throw new Error("PG blocked"); }, getPortOnePublicConfig: () => { throw new Error("PG blocked"); } }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({ ...structured, callGeminiJsonWithRetry: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/ziwei-ai-chart.js", () => ({ calculateZiweiAiChart: (...args) => chart(...args), formatStarWithBrightness: value => value }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleZiweiIslandAiRoutes: route } = await import("../../worker/routes/ziwei-island-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({}));
  provider = jest.fn(async (_env, _prompt, options) => {
    expect(options.attempts).toBe(1); expect(options.timeoutMs).toBeLessThanOrEqual(45000); expect(options.fallbackToWorkersAI).toBe(false);
    const id = options.logContext.sectionGroup;
    return { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ body: prose(id, 3500), evidence: { palace: "명궁", mainStars: ["자미"], daeun: "23-32" } }) };
  });
  chart = jest.fn(() => ({ palaces: [{ name: "명궁", mainStars: ["자미"], majorLuck: { range: "23-32" } }], fourTransformations: {}, chartSummary: "fixture" }));
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
async function start(extra = {}) {
  return route(new Request("https://mock.test/api/ziwei-island-ai/generate", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, ...extra }) }), {});
}


for (const paid of ["pass", "monthly", "paid"]) it(`${paid}: two bounded waves preserve the chart and original payment`, async () => {
  mode = paid;
  const first = await start(); expect(first.status).toBe(202);
  const partial = await first.json(); expect(partial.consultation.completedParts).toHaveLength(4); expect(usage).not.toHaveBeenCalled();
  const second = await start({ resumeSessionId: partial.sessionId }); expect(second.status).toBe(200);
  expect(await second.json()).toMatchObject({ consultation: { saved: true, status: "completed", id: partial.sessionId } });
  expect(provider).toHaveBeenCalledTimes(8); expect(chart).toHaveBeenCalledTimes(1); expect(refund).not.toHaveBeenCalled();
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(8);
});
for (const status of ["partial", "delivery_pending", "completed"]) for (const kind of ["null", "throw", "confirm"]) it(`${status} ${kind}: storage is never generation failure or refund`, async () => {
  await start(); fault = { status, kind };
  const response = await start(); expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ ok: false, retryable: true, reason: "RESULT_STORAGE_UNAVAILABLE", resultId: docs[0].id });
  expect(refund).not.toHaveBeenCalled(); expect(docs[0].status).not.toBe("generation_failed");
  const calls = provider.mock.calls.length;
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(calls);
});
it("short or contradictory parts are not completed, with at most three calls per part", async () => {
  provider.mockImplementation(async () => ({ ok: true, provider: "gemini", text: JSON.stringify({ body: prose("contradict", 3500), evidence: { palace: "부부궁", mainStars: [] } }) }));
  for (let n = 0; n < 2; n++) expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(503);
  expect(provider).toHaveBeenCalledTimes(12); expect(usage).not.toHaveBeenCalled();
  expect(docs[0].status).toBe("generation_failed");
  expect((await start()).status).toBe(409); expect(provider).toHaveBeenCalledTimes(12);
});
for (const store of [0, 1, 2, 3]) it(`revoked ledger ${store} denies same-request replay and result reads`, async () => {
  await start(); blocked = store; const calls = provider.mock.calls.length;
  expect((await start()).status).toBe(403);
  expect((await route(new Request(`https://mock.test/api/ziwei-island-ai/result?id=${docs[0].id}`), {})).status).toBe(403);
  expect(provider).toHaveBeenCalledTimes(calls); expect(usage).not.toHaveBeenCalled();
});
it("other owners cannot resume or read; legacy completed documents bypass the new length floor", async () => {
  await start(); const id = docs[0].id; userId = "another-owner";
  expect((await start({ resumeSessionId: id })).status).toBe(404);
  expect((await route(new Request(`https://mock.test/api/ziwei-island-ai/result?id=${id}`), {})).status).toBe(404);
  userId = uid; docs[0].status = "completed"; docs[0].messages = [{ role: "assistant", content: "old" }];
  expect((await start()).status).toBe(200);
});
it("busy lease blocks providers; expired lease resumes only missing parts", async () => {
  await start(); docs[0].generationLease = "other"; docs[0].updatedAt = new Date();
  expect((await start()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(4);
  docs[0].updatedAt = new Date(Date.now() - 121000);
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(8);
});
it("lost apply response reuses the same consumption id and saved body", async () => {
  await start(); usage.mockImplementationOnce(() => { throw new Error("lost response"); });
  expect((await start()).status).toBe(503); expect(docs[0].status).toBe("delivery_pending");
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(8);
  expect(usage.mock.calls.map(call => call[0].requestId)).toEqual(["original-paid-request", "original-paid-request"]);
});
it("account recovery returns server input and successful parts without local birth input", async () => {
  await start(); const result = await route(new Request("https://mock.test/api/ziwei-island-ai/result?pending=1"), {});
  expect(result.status).toBe(202); expect(await result.json()).toMatchObject({ resumeBody: { palaceKey: "명궁", idempotencyKey: "original-paid-request", resumeSessionId: docs[0].id } });
});
it("refund during generation preserves delivery pending but does not apply", async () => {
  await start(); const base = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => { const value = await base(...args); blocked = 1; return value; });
  expect((await start()).status).toBe(403); expect(usage).not.toHaveBeenCalled(); expect(docs[0].status).toBe("delivery_pending");
});

it("failed initial insert can resume the returned deterministic id with the original owner and request", async () => {
  fault={status:"create"};const failed=await start();expect(failed.status).toBe(503);const body=await failed.json();
  expect(provider).not.toHaveBeenCalled();expect(docs).toHaveLength(0);
  expect((await start({resumeSessionId:body.resultId})).status).toBe(202);
});
it("successful parallel part is durable while the rest of the wave is still pending", async () => {
  const base=provider.getMockImplementation();let unblock;
  const blockedProvider=new Promise(resolve=>{unblock=resolve;});
  provider.mockImplementation(async (...args)=>{if(args[2].logContext.sectionGroup!=='essence_0')await blockedProvider;return base(...args);});
  const running=start();
  for(let n=0;n<50&&!docs[0]?.llmMeta?.parts?.essence_0;n++)await new Promise(resolve=>setImmediate(resolve));
  expect(docs[0]?.llmMeta?.parts?.essence_0).toBeTruthy();expect(provider).toHaveBeenCalledTimes(4);
  expect((await start()).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);
  unblock();expect((await running).status).toBe(202);
});
it("expired writer cannot overwrite the next holder or release its lease", async () => {
  const base=provider.getMockImplementation();provider.mockImplementation(async (...args)=>{
    docs[0].generationLease='next-holder';return base(...args);
  });
  expect((await start()).status).toBe(503);expect(docs[0].generationLease).toBe('next-holder');expect(docs[0].status).not.toBe('completed');
});
