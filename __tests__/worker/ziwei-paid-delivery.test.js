/** @jest-environment node */
import { jest } from "@jest/globals";

const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 명반 해석", calendarType: "solar", focusArea: "overall", accessType: "pass" };
let utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation;
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
    if (docs.some(doc => doc.userId === fields.userId && doc.idempotencyKey === fields.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = { ...clone(fields), createdAt: new Date(), updatedAt: new Date() }; docs.push(doc); return clone(doc);
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
  let value = `${seed} 양자리 라그나와 Ashwini의 계산 근거를 살펴봅니다. `;
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
    Payment: { findOne: filter => query(blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ consumePassForFeature: async (...args) => { usage(...args); return { covered: true }; }, passDenialCode: () => "" }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ fetchPortOnePayment: () => { throw new Error("PG blocked"); }, getPortOnePublicConfig: () => { throw new Error("PG blocked"); }, getPortOneConfig: () => { throw new Error("PG blocked"); } }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({ ...structured, callGeminiJsonWithRetry: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/ziwei-ai-chart.js", () => ({ calculateZiweiAiChart: (...args) => chart(...args), formatStarWithBrightness: value => value }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleZiweiAiRoutes: route, __ziweiAiTestUtils: utils } = await import("../../worker/routes/ziwei-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({}));
  provider = jest.fn(async (_env, _prompt, options) => {
    expect(options.attempts).toBe(1); expect(options.timeoutMs).toBeLessThanOrEqual(45000); expect(options.fallbackToWorkersAI).toBe(false);
    const group = utils.SECTION_GROUP_SPECS.find(group => group.id === options.logContext.sectionGroup);
    if (!group) return { ok: true, text: JSON.stringify({ meta: { scores: { overall: 70 } }, sections: {} }) };
    return { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ sections: Object.fromEntries(group.sections.map(key => [key, { title: key, body: prose(key, Math.floor(group.targetChars / group.sections.length)) }])) }) };
  });
  chart = jest.fn(() => ({ palaces: [], fourTransformations: {}, chartSummary: "fixture" }));
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
async function start(extra = {}) {
  return route(new Request("https://mock.test/api/ziwei-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, ...extra }) }), {});
}

for (const paid of ["pass", "monthly", "paid"]) it(`${paid}: six waves reuse the stored chart and groups`, async () => {
  mode = paid; let partial;
  for (let i = 0; i < 5; i++) { const response = await start(partial ? { resumeSessionId: partial.sessionId } : {}); expect(response.status).toBe(202); partial = await response.json(); expect(partial.consultation.completedGroups).toHaveLength(i + 1); expect(usage).not.toHaveBeenCalled(); }
  const response = await start({ resumeSessionId: partial.sessionId }); expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ consultation: { saved: true, status: "completed", id: partial.sessionId } });
  expect(provider).toHaveBeenCalledTimes(7); expect(chart).toHaveBeenCalledTimes(1); expect(refund).not.toHaveBeenCalled();
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(7);
});
for (const status of ["delivery_pending", "completed"]) for (const kind of ["null", "throw", "confirm"]) it(`${status} storage ${kind} preserves generated text and never refunds`, async () => {
  for (let i = 0; i < 5; i++) await start(); fault = { status, kind };
  const response = await start(); expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ reason: "RESULT_STORAGE_UNAVAILABLE", retryable: true, resultId: docs[0].id });
  expect(refund).not.toHaveBeenCalled(); const calls = provider.mock.calls.length; fault = null;
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(calls); expect(docs[0].status).toBe("completed");
});
it("short groups consume only three attempts and cannot become completed", async () => {
  provider.mockImplementation(async () => ({ ok: true, text: JSON.stringify({ sections: {} }) }));
  expect((await start()).status).toBe(202); expect((await start()).status).toBe(202); expect((await start()).status).toBe(503);
  expect(docs[0].status).toBe("generation_failed"); expect(usage).not.toHaveBeenCalled(); expect((await start()).status).toBe(409); expect(provider).toHaveBeenCalledTimes(4);
});
for (const store of [0, 1, 2, 3]) it(`revoked evidence ${store} stops even a pass fallback`, async () => {
  await start(); const calls = provider.mock.calls.length; blocked = store;
  expect((await start({ resumeSessionId: docs[0].id })).status).toBe(402); expect(provider).toHaveBeenCalledTimes(calls);
});
it("other owners cannot resume or read while historical completed purchases stay readable", async () => {
  await start(); const id = docs[0].id; userId = "64b7f2a1c3d4e5f601234568";
  expect((await start({ resumeSessionId: id })).status).toBe(404);
  expect((await route(new Request(`https://mock.test/api/ziwei-ai/result?id=${id}`), {})).status).toBe(404);
  userId = uid; docs[0].status = "completed"; docs[0].messages = [{ role: "assistant", content: "old short result" }]; blocked = 0;
  expect((await start({ resumeSessionId: id })).status).toBe(200);
});
it("lease excludes concurrent work and stale leases recover saved groups", async () => {
  await start(); docs[0].generationLease = "other"; docs[0].updatedAt = new Date(); const calls = provider.mock.calls.length;
  expect((await start()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(calls);
  docs[0].updatedAt = new Date(Date.now() - 121000); expect((await start()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(calls + 1);
});
it("apply response loss retries the original key without regenerating", async () => {
  for (let i = 0; i < 5; i++) await start(); usage.mockImplementationOnce(() => { throw new Error("lost response"); });
  expect((await start()).status).toBe(503); expect(docs[0].status).toBe("delivery_pending"); const calls = provider.mock.calls.length;
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(calls);
  expect(usage.mock.calls.map(call => call[0].requestId)).toEqual(["original-paid-request", "original-paid-request"]); expect(refund).not.toHaveBeenCalled();
});

it("missing calculated grounding repairs only its owning group", async () => {
  chart.mockImplementation(() => ({ palaces: ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁"].map((name, i) => ({ name, mainStars: i ? [] : ["자미"], earthlyBranch: "자" })), fourTransformations: {} }));
  for (let i = 0; i < 6; i++) expect((await start()).status).toBe(202);
  const saved = structuredClone(docs[0].llmMeta.groups.foundation); const base = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => { const value = await base(...args); const parsed = JSON.parse(value.text); const key = Object.keys(parsed.sections)[0]; parsed.sections[key].body += " 자미 명궁 형제궁 부부궁 자녀궁 재백궁 질액궁 천이궁 노복궁 관록궁을 근거로 지금 선택의 방향을 읽습니다."; return { ...value, text: JSON.stringify(parsed) }; });
  expect((await start()).status).toBe(200); expect(provider.mock.calls.at(-1)[2].logContext.sectionGroup).toBe("essence"); expect(docs[0].llmMeta.groups.foundation).toEqual(saved);
});
it("refunds the card payment once short groups exhaust their attempts", async () => {
  mode = "paid";
  provider.mockImplementation(async () => ({ ok: true, text: JSON.stringify({ sections: {} }) }));
  expect((await start()).status).toBe(202); expect((await start()).status).toBe(202);
  const response = await start();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ reason: "LLM_ERROR" });
  expect(docs[0].status).toBe("generation_failed");
  expect(refund).toHaveBeenCalledTimes(1);
  expect(refund.mock.calls[0][1]).toMatchObject({ _id: uid, merchantUid: "payment" });
  expect(refund.mock.calls[0][4]).toBe("ziwei_ai_generation");
  expect((await start()).status).toBe(409);
});
for (const paid of ["pass", "monthly"]) it(`${paid}: does not attempt a card refund once short groups exhaust their attempts`, async () => {
  mode = paid;
  provider.mockImplementation(async () => ({ ok: true, text: JSON.stringify({ sections: {} }) }));
  expect((await start()).status).toBe(202); expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(503);
  expect(refund).not.toHaveBeenCalled();
});
it("refund after provider response prevents completion and consumption", async () => {
  for (let i = 0; i < 5; i++) await start(); const base = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => { const value = await base(...args); blocked = 1; return value; });
  expect((await start()).status).toBe(402); expect(docs[0].status).toBe("delivery_pending"); expect(usage).not.toHaveBeenCalled();
});
