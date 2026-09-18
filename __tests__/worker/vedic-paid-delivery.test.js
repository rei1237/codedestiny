/** @jest-environment node */
import { jest } from "@jest/globals";

const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 흐름", calendarType: "solar", focusArea: "overall", accessType: "pass" };
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
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, VedicAiConsultation: model,
    User: { findById: () => query({ _id: uid, role: "user" }), updateOne: (...args) => refund(...args) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null) },
    Payment: { findOne: filter => query(blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({ ...structured, callGeminiJsonWithRetry: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/vedic-ai-chart.js", () => ({ calculateVedicAiChart: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleVedicAiRoutes: route, __vedicAiTestUtils: utils } = await import("../../worker/routes/vedic-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({}));
  provider = jest.fn(async (_env, _prompt, options) => {
    expect(options.attempts).toBe(1); expect(options.timeoutMs).toBeLessThanOrEqual(45000); expect(options.fallbackToWorkersAI).toBe(false);
    const group = utils.VEDIC_SECTION_GROUPS.find(group => group.key === options.logContext.group);
    const keys = group.includeReasoning ? ["structure_core", "influence_factors", "evidence_basis", "domain_matrix", "action_plan"] : group.sectionKeys;
    return { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ ...(group.includeScores ? { scores: { overall: 70 } } : {}), sections: Object.fromEntries(keys.map(key => [key, { title: group.includeReasoning ? key : group.label, body: prose(key, group.includeReasoning ? 600 : 4500) }])) }) };
  });
  chart = jest.fn(async () => ({ lagna: { rashiKo: "양자리", sign: "Aries" }, moonNakshatra: { name: "Ashwini" }, grahas: [], bhavas: [], calculationMeta: {} }));
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
async function start(extra = {}) {
  return route(new Request("https://mock.test/api/vedic-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, ...extra }) }), {});
}
for (const paid of ["pass", "monthly", "paid"]) it(`${paid}: completes five waves without regenerating a stored group`, async () => {
  mode = paid; let response, partial;
  for (let i = 0; i < 4; i++) { response = await start(partial ? { resumeSessionId: partial.sessionId } : {}); expect(response.status).toBe(202); partial = await response.json(); expect(partial.consultation.completedGroups).toHaveLength(i + 1); }
  response = await start({ resumeSessionId: partial.sessionId }); expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ consultation: { saved: true, status: "completed", id: partial.sessionId } });
  expect(provider).toHaveBeenCalledTimes(5); expect(chart).toHaveBeenCalledTimes(1); expect(refund).not.toHaveBeenCalled();
});
for (const status of ["delivery_pending", "completed"]) for (const kind of ["null", "throw", "confirm"]) it(`${status} storage ${kind} never refunds or regenerates the body`, async () => {
  for (let i = 0; i < 4; i++) await start(); fault = { status, kind };
  const response = await start(); expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ reason: "RESULT_STORAGE_UNAVAILABLE", retryable: true });
  expect(refund).not.toHaveBeenCalled(); expect(usage).not.toHaveBeenCalled();
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(5);
});
it("stops after three short group attempts", async () => {
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 3; i++) expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(503); expect(provider).toHaveBeenCalledTimes(3); expect((await start()).status).toBe(409);
});
for (const index of [0, 1, 2, 3]) it(`rejects revoked proof source ${index}`, async () => {
  await start(); blocked = index; expect((await start()).status).toBe(402); expect(provider).toHaveBeenCalledTimes(1);
});
it("rejects another account resume and preserves historical results", async () => {
  const partial = await (await start()).json(); userId = "64b7f2a1c3d4e5f601234568";
  expect((await start({ resumeSessionId: partial.sessionId })).status).toBe(404);
  userId = uid; docs[0].status = "completed"; docs[0].messages = [{ role: "assistant", content: "과거 구매본" }];
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(1);
});
it("leaves a contradictory lagna pending and retries only that group", async () => {
  const original = provider.getMockImplementation();
  provider.mockImplementationOnce(async (...args) => { const row = await original(...args); row.text = row.text.replaceAll("양자리 라그나", "황소자리 라그나"); return row; });
  const first = await (await start()).json(); expect(first.consultation.completedGroups).toHaveLength(0);
  const second = await (await start()).json(); expect(second.consultation.completedGroups).toEqual(["karma_origin"]);
  expect(chart).toHaveBeenCalledTimes(1);
});
it("returns independent responses for simultaneous requests with the same key", async () => {
  const [a, b] = await Promise.all([start(), start()]);
  expect(a.status).toBe(202); expect(b.status).toBe(202);
  expect(await a.json()).toEqual(await b.json()); expect(provider).toHaveBeenCalledTimes(1);
});
it("resumes with the stored language and full calculated snapshot", async () => {
  const partial = await (await start()).json();
  const snapshot = clone(docs[0].llmMeta.chartSnapshot);
  await start({ resumeSessionId: partial.sessionId, locale: "en" });
  expect(provider.mock.calls[1][2].locale).toBe("ko");
  expect(docs[0].llmMeta.chartSnapshot).toEqual(snapshot); expect(chart).toHaveBeenCalledTimes(1);
});
it("does not start another provider while a different database lease is fresh", async () => {
  await start(); docs[0].generationLease = "another-worker";
  expect((await start()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(1);
  docs[0].updatedAt = new Date(Date.now() - 125000);
  expect((await start()).status).toBe(202); expect(provider).toHaveBeenCalledTimes(2);
});
it("refunds the card payment once quality attempts are exhausted", async () => {
  mode = "paid";
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 3; i++) expect((await start()).status).toBe(202);
  const response = await start();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ reason: "LLM_FAILED" });
  expect(refund).toHaveBeenCalledTimes(1);
  expect(refund.mock.calls[0][1]).toMatchObject({ _id: uid, merchantUid: "payment" });
  expect(refund.mock.calls[0][4]).toBe("vedic_ai_generation");
  expect((await start()).status).toBe(409);
});
for (const paid of ["pass", "monthly"]) it(`${paid}: does not attempt a card refund once quality attempts are exhausted`, async () => {
  mode = paid;
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 3; i++) expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(503);
  expect(refund).not.toHaveBeenCalled();
});
it("rechecks cancellation after generation and before completing delivery", async () => {
  for (let i = 0; i < 4; i++) await start();
  const original = provider.getMockImplementation();
  provider.mockImplementationOnce(async (...args) => { const result = await original(...args); blocked = 1; return result; });
  expect((await start()).status).toBe(402); expect(docs[0].status).toBe("delivery_pending"); expect(refund).not.toHaveBeenCalled();
});
