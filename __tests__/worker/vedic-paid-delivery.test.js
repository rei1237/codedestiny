/** @jest-environment node */
import { jest } from "@jest/globals";

const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 흐름", calendarType: "solar", focusArea: "overall", accessType: "pass" };
let release, settleDue, utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation, passReceipt, passRefund, consume, accessQueue, passOrder, withdrawn;
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
const getPath = (doc, key) => key.split(".").reduce((row, part) => row?.[part], doc);
function setPath(doc, key, value) { const parts = key.split("."); const last = parts.pop(); let row = doc; for (const part of parts) row = row[part] ??= {}; row[last] = value; }
const applySet = (doc, set) => { for (const [key, value] of Object.entries(clone(set))) setPath(doc, key, value); };
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    const actual = getPath(doc, key);
    if (value && typeof value === "object" && Object.prototype.toString.call(value) !== "[object Date]") {
      if ("$exists" in value && (actual !== undefined && actual !== null) !== value.$exists) return false;
      if ("$ne" in value) return actual !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(actual);
      if ("$in" in value) return value.$in.includes(actual);
      if ("$lt" in value) return new Date(actual) < value.$lt;
      if ("$lte" in value) return new Date(actual) <= value.$lte;
      return "$exists" in value;
    }
    return String(actual) === String(value);
  });
}
function findQuery(rows) { const result = { sort: () => result, limit: n => findQuery(rows.slice(0, n)), select: () => result, lean: async () => clone(rows) }; return result; }
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
    if (doc) { applySet(doc, update.$set); doc.updatedAt = new Date(); }
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    const doc = docs.find(row => matches(row, filter));
    if (doc) { applySet(doc, update.$set); doc.updatedAt = new Date(Math.max(Date.now(), new Date(doc.updatedAt || 0).getTime() + 1)); }
    return { modifiedCount: doc ? 1 : 0 };
  },
  find: filter => findQuery(docs.filter(doc => matches(doc, filter))),
};

function prose(seed, length) {
  let value = `${seed} 양자리 라그나와 Ashwini의 계산 근거를 살펴봅니다. `;
  for (let i = 0; value.replace(/\s/g, "").length < length; i++) value += `${seed}의 ${i}번째 관찰은 현재 생활에서 반복되는 선택을 돌아보고 작은 행동으로 확인하는 과정을 설명합니다. `;
  return value;
}
beforeAll(async () => {
  const pass = await import("../../worker/lib/pass-consumption.js");
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ ...pass,
    consumePassForFeature: (...args) => consume(...args), hasConsumedPassFeature: async () => passReceipt,
    refundPassUseEvidence: (...args) => passRefund(...args) }));
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const entitlement = await import("../../worker/lib/entitlement-policy.js");
  const structured = await import("../../worker/lib/structured-consultation.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, VedicAiConsultation: model,
    User: { findById: () => query({ _id: uid, role: "user" }), findOne: () => query({ _id: uid, status: withdrawn ? "withdrawn" : "active" }), updateOne: (...args) => refund(...args) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null) },
    Payment: { findOne: filter => query(filter.paymentType === "membership_pass" ? passOrder : blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: accessQueue.length ? accessQueue.shift() : mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({ ...structured, callGeminiJsonWithRetry: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/vedic-ai-chart.js", () => ({ calculateVedicAiChart: (...args) => chart(...args) }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  jest.unstable_mockModule("../../worker/lib/billing-evidence-claim.js", () => ({ claimRequestBillingEvidence: async () => ({ ok: true }), evidenceClaimErrorBody: () => ({}), releaseRequestBillingEvidence: (...args) => release(...args) }));
  ({ handleVedicAiRoutes: route, __vedicAiTestUtils: utils, settleDueVedicRetryRefunds: settleDue } = await import("../../worker/routes/vedic-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({})); passReceipt = false; passRefund = jest.fn(async () => ({ refunded: true })); consume = jest.fn(async () => ({ covered: true })); accessQueue = []; passOrder = null; withdrawn = false; release = jest.fn(async () => ({ released: 1 }));
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
it("accepts a server-confirmed pass without a client pass label", async () => {
  const response = await start({ accessType: undefined });
  expect(response.status).toBe(202);
  expect(docs[0].accessType).toBe("pass");
  expect(provider).toHaveBeenCalledTimes(1);
});
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
it("delivers the finished body when the late pass settlement hits the monthly limit", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  for (let i = 0; i < 4; i++) expect((await start()).status).toBe(202);
  consume.mockResolvedValue({ covered: false, reason: "monthly_pass_limit_exceeded" });
  const response = await start(); expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ consultation: { status: "completed" } });
  expect(docs[0]).toMatchObject({ status: "completed", llmMeta: { usageSettlement: "failed", usageSettlementReason: "MONTHLY_PASS_LIMIT_EXCEEDED" } });
  expect(consume).toHaveBeenCalledTimes(1); expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledTimes(5);
  expect(warn).toHaveBeenCalledWith("paid_delivery_usage_settlement_failed", expect.objectContaining({ service: "vedic-ai", reason: "MONTHLY_PASS_LIMIT_EXCEEDED" }));
  warn.mockRestore();
});
it("keeps a finished body pending when the late pass settlement hits a transient error", async () => {
  for (let i = 0; i < 4; i++) expect((await start()).status).toBe(202);
  consume.mockRejectedValueOnce(new Error("mock pass db down"));
  const response = await start(); expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ reason: "RESULT_STORAGE_UNAVAILABLE", retryable: true });
  expect(docs[0].status).toBe("delivery_pending"); expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
  expect((await start()).status).toBe(200);
  expect(docs[0].status).toBe("completed"); expect(docs[0].llmMeta.usageSettlement).toBeUndefined(); expect(provider).toHaveBeenCalledTimes(5);
});
it("delivers a finished pass body when only the pre-delivery recheck is denied by the pass limit", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  for (let i = 0; i < 4; i++) expect((await start()).status).toBe(202);
  accessQueue = [true, false];
  expect((await start()).status).toBe(200);
  expect(accessQueue).toEqual([]);
  expect(docs[0]).toMatchObject({ status: "completed", llmMeta: { usageSettlement: "failed", usageSettlementReason: "PAYMENT_REQUIRED" } });
  expect(consume).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledTimes(5);
  expect(warn).toHaveBeenCalledWith("paid_delivery_usage_settlement_failed", expect.objectContaining({ service: "vedic-ai", stage: "access_recheck" }));
  warn.mockRestore();
});
it("delivers a stored delivery_pending pass body on resume after the pass limit is exhausted", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  for (let i = 0; i < 4; i++) await start(); fault = { status: "completed", kind: "null" };
  expect((await start()).status).toBe(503); expect(docs[0].status).toBe("delivery_pending");
  mode = "none"; const calls = provider.mock.calls.length;
  expect((await start()).status).toBe(200);
  expect(docs[0]).toMatchObject({ status: "completed", llmMeta: { usageSettlement: "failed" } });
  expect(provider).toHaveBeenCalledTimes(calls); expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
  warn.mockRestore();
});
for (const [label, setup] of [["a refunded pass order", () => { passOrder = { status: "refunded" }; }], ["a withdrawn member", () => { withdrawn = true; }], ["revoked pass use evidence", () => { blocked = 2; }]]) it(`keeps the 402 for ${label} when the pass limit recheck is denied`, async () => {
  for (let i = 0; i < 4; i++) await start(); fault = { status: "completed", kind: "null" };
  expect((await start()).status).toBe(503);
  mode = "none"; setup();
  expect((await start()).status).toBe(402); expect(docs[0].status).toBe("delivery_pending"); expect(docs[0].llmMeta.usageSettlement).toBeUndefined();
});
it("stops after two unusable group attempts", async () => {
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 2; i++) expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(503); expect(provider).toHaveBeenCalledTimes(2); expect((await start()).status).toBe(409);
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
it("removes a contradictory lagna sentence locally and retains the group", async () => {
  const original = provider.getMockImplementation();
  provider.mockImplementationOnce(async (...args) => { const row = await original(...args); row.text = row.text.replaceAll("양자리 라그나", "황소자리 라그나"); return row; });
  const first = await (await start()).json(); expect(first.consultation.completedGroups).toEqual(["karma_origin"]);
  expect(docs[0].llmMeta.groups.karma_origin.text).not.toContain("황소자리 라그나");
  expect(docs[0].llmMeta.rawResponses.karma_origin).toContain("황소자리 라그나");
  for(let i=0;i<6 && docs[0].status !== "completed";i++)await start();
  // The trimmed group falls under minChars, so it gets its one length repair.
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(6);
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
async function post(path, payload) {
  return route(new Request(`https://mock.test/api/vedic-ai${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), {});
}
async function exhaust() {
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 2; i++) expect((await start()).status).toBe(202);
  return start();
}
// 2026-11-20 R10 다시 시도 우선: 웹 결제 건은 품질 시도를 다 써도 바로 환불하지 않고 무료 다시 시도를 연다(환불 = 생성 + 7일 또는 고객 요청).
it("holds a card payment for a free retry once quality attempts are exhausted", async () => {
  mode = "paid";
  const response = await exhaust();
  expect(response.status).toBe(503);
  const payload = await response.json();
  expect(payload).toMatchObject({ reason: "LLM_FAILED", refunded: false, sessionId: docs[0].id, retry: { available: true, sessionId: docs[0].id } });
  expect(Date.parse(payload.retry.refundAt) - docs[0].createdAt.getTime()).toBe(7 * 86400000);
  expect(refund).not.toHaveBeenCalled(); expect(release).not.toHaveBeenCalled();
  expect(docs[0]).toMatchObject({ status: "generation_failed", llmMeta: { retryable: { access: { evidenceType: "direct_payment", paymentDocId: uid } } } });
  const again = await start();
  expect(again.status).toBe(409);
  expect(await again.json()).toMatchObject({ refunded: false, retry: { available: true } });
  const result = await route(new Request(`https://mock.test/api/vedic-ai/result?id=${docs[0].id}`), {});
  expect(result.status).toBe(409);
  expect(await result.json()).toMatchObject({ retry: { available: true, sessionId: docs[0].id } });
});
it("retries a held failure without a new charge and keeps the completed groups", async () => {
  mode = "paid";
  const original = provider.getMockImplementation();
  expect((await start()).status).toBe(202);
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 3; i++) await start();
  expect(docs[0].status).toBe("generation_failed");
  const kept = clone(docs[0].llmMeta.groups.karma_origin);
  provider.mockImplementation(original);
  let response = await post("/retry", { sessionId: docs[0].id });
  expect(response.status).toBe(202);
  for (let i = 0; i < 4 && docs[0].status !== "completed"; i++) response = await start({ resumeSessionId: docs[0].id });
  expect(docs[0].status).toBe("completed"); expect(docs[0].llmMeta.groups.karma_origin).toEqual(kept);
  expect(docs[0].llmMeta.retryable.reopens).toBe(1);
  expect(refund).not.toHaveBeenCalled(); expect(release).not.toHaveBeenCalled(); expect(chart).toHaveBeenCalledTimes(1);
});
it("rejects a retry or refund request from another account", async () => {
  mode = "paid"; await exhaust(); userId = "64b7f2a1c3d4e5f601234568";
  expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(404);
  expect((await post("/refund-request", { sessionId: docs[0].id })).status).toBe(404);
  expect(docs[0].status).toBe("generation_failed"); expect(refund).not.toHaveBeenCalled();
});
it("refunds the card payment once when the customer asks instead of retrying", async () => {
  mode = "paid"; await exhaust();
  const response = await post("/refund-request", { sessionId: docs[0].id });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, sessionId: docs[0].id });
  expect(refund).toHaveBeenCalledTimes(1);
  expect(refund.mock.calls[0][1]).toMatchObject({ _id: uid, merchantUid: "payment" });
  expect(refund.mock.calls[0][4]).toBe("vedic_ai_generation");
  expect(release).toHaveBeenCalledTimes(1);
  expect(docs[0].llmMeta.retryable.refundSettledAt).toBeTruthy();
  expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(409);
  await settleDue({}, { model }); expect(refund).toHaveBeenCalledTimes(1);
});
it("keeps the claim and the marker unsettled when the card refund fails, so the cron retries", async () => {
  mode = "paid"; await exhaust();
  refund.mockResolvedValue({ refunded: true }); refund.mockRejectedValueOnce(new Error("PG down"));
  await post("/refund-request", { sessionId: docs[0].id });
  expect(release).not.toHaveBeenCalled(); expect(docs[0].llmMeta.retryable.refundSettledAt).toBeUndefined();
  expect(await settleDue({}, { model })).toEqual([{ service: "vedic-ai", refundStatus: "refunded" }]);
  expect(refund).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledTimes(1);
});
it("settles an expired retry window through the refund cron", async () => {
  passReceipt = true; await exhaust();
  expect(passRefund).not.toHaveBeenCalled();
  docs[0].updatedAt = new Date(Date.now() - 300000);
  expect(await settleDue({}, { model, now: Date.now() + 8 * 86400000 })).toEqual([{ service: "vedic-ai", refundStatus: "refunded" }]);
  expect(passRefund).toHaveBeenCalledTimes(1);
  expect(passRefund.mock.calls[0][0]).toMatchObject({ userId: uid, featureKey: "vedic-ai-consultation", requestId: "original-paid-request" });
  expect(docs[0].llmMeta).toMatchObject({ retryable: { refundReason: "RETRY_WINDOW_EXPIRED", refundStatus: "refunded" } });
  expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(409);
});
it("does not expire a reopened retry that is generating right now", async () => {
  mode = "paid"; await exhaust();
  const later = Date.now() + 8 * 86400000;
  docs[0].status = "partial"; docs[0].updatedAt = new Date(later - 1000);
  await settleDue({}, { model, now: later });
  expect(docs[0].status).toBe("partial"); expect(refund).not.toHaveBeenCalled();
});
for (const paid of ["pass", "monthly"]) it(`${paid}: does not attempt a card refund once quality attempts are exhausted`, async () => {
  mode = paid;
  expect((await exhaust()).status).toBe(503);
  await post("/refund-request", { sessionId: docs[0].id });
  expect(refund).not.toHaveBeenCalled();
});
it("restores a pass pre-deducted at checkout when the held failure is refunded", async () => {
  passReceipt = true;
  expect((await exhaust()).status).toBe(503);
  expect(passRefund).not.toHaveBeenCalled();
  expect((await post("/refund-request", { sessionId: docs[0].id })).status).toBe(200);
  expect(passRefund).toHaveBeenCalledTimes(1);
  expect(passRefund.mock.calls[0][0]).toMatchObject({ userId: uid, featureKey: "vedic-ai-consultation", requestId: "original-paid-request" });
  expect(refund).not.toHaveBeenCalled();
});
it("does not restore a pass when access came from the live entitlement (no checkout deduction)", async () => {
  provider.mockImplementation(async () => ({ ok: true, text: "짧은 결과", provider: "gemini" }));
  for (let i = 0; i < 3; i++) await start();
  expect(passRefund).not.toHaveBeenCalled();
});
it("rechecks cancellation after generation and before completing delivery", async () => {
  for (let i = 0; i < 4; i++) await start();
  const original = provider.getMockImplementation();
  provider.mockImplementationOnce(async (...args) => { const result = await original(...args); blocked = 1; return result; });
  expect((await start()).status).toBe(402); expect(docs[0].status).toBe("delivery_pending"); expect(refund).not.toHaveBeenCalled();
});

for (const repair of ["shorter", "repeated", "empty", "truncated", "wrong-chart"]) it(`retains a short valid group through one ${repair} repair`, async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args);
    if (provider.mock.calls.length > 2) {
      const parsed = JSON.parse(result.text);
      if (args[2].logContext.group !== "reasoning_flows") for (const [key, row] of Object.entries(parsed.sections)) row.body = prose(key, 4800);
      return { ...result, text: JSON.stringify(parsed) };
    }
    const parsed = JSON.parse(result.text); const [key] = Object.keys(parsed.sections);
    const first = provider.mock.calls.length === 1;
    if (!first) expect(args[1]).toContain("[보강 요청]");
    parsed.sections[key].body = first ? prose(key, 3500) : repair === "empty" ? "" : repair === "repeated"
      ? prose(key, 5000) + prose(key, 5000) : repair === "wrong-chart" ? prose(key, 5000) + " 황소자리 라그나입니다." : prose(key, 3000);
    return { ...result, text: JSON.stringify(parsed), truncated: !first && repair === "truncated" };
  });
  expect((await start()).status).toBe(202);
  const [key] = Object.keys(docs[0].llmMeta.groups); const draft = clone(docs[0].llmMeta.groups[key]);
  for (let i = 0; i < 6 && docs[0].status !== "completed"; i++) await start();
  expect(docs[0].status).toBe("completed");
  // A wrong-chart repair is corrected locally (contradicting sentence removed) and adopted because it is longer.
  if (repair === "wrong-chart") expect(docs[0].llmMeta.groups[key].text).not.toContain("황소자리 라그나");
  else expect(docs[0].llmMeta.groups[key]).toEqual(draft);
  expect(docs[0].llmMeta.attempts[key]).toBe(2); expect(provider).toHaveBeenCalledTimes(6); expect(refund).not.toHaveBeenCalled();
});
it("doubles the output budget only for the retry after an unsalvageable truncated group", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => provider.mock.calls.length === 1 ? { ...(await normal(...args)), text: '{"sections":{"', truncated: true, finishReason: "MAX_TOKENS" } : normal(...args));
  for (let i = 0; i < 8 && docs[0]?.status !== "completed"; i++) await start();
  const [first, retry, next] = provider.mock.calls.map(args => args[2]);
  expect(retry.logContext.group).toBe(first.logContext.group);
  expect(retry.baseTokens).toBe(Math.max(first.baseTokens, Math.min(32768, first.baseTokens * 2))); expect(retry.capTokens).toBeGreaterThanOrEqual(retry.baseTokens);
  expect(next.baseTokens).toBe(first.baseTokens); expect(docs[0].llmMeta.attempts[`${first.logContext.group}:truncated`]).toBe(1);
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(6); expect(refund).not.toHaveBeenCalled();
});
it("trims overlong JSON bodies while retaining keys and scores", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args); const parsed = JSON.parse(result.text);
    for (const [key, row] of Object.entries(parsed.sections)) row.body = prose(key, args[2].logContext.group === "reasoning_flows" ? 1300 : 7500);
    return { ...result, text: JSON.stringify(parsed) };
  });
  for (let i = 0; i < 5; i++) await start();
  const { countPaidReportBodyChars } = await import("../../worker/lib/paid-report-quality.js");
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(5);
  for (const group of utils.VEDIC_SECTION_GROUPS) {
    const parsed = JSON.parse(docs[0].llmMeta.groups[group.key].text);
    expect(countPaidReportBodyChars(Object.values(parsed.sections).map(row => row.body).join("\n\n"))).toBeLessThanOrEqual(group.hardMaxChars);
    if (group.includeScores) expect(parsed.scores).toEqual({ overall: 70 });
  }
});
it("delivers usable short groups after one length repair each", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args); const parsed = JSON.parse(result.text);
    for (const [key, row] of Object.entries(parsed.sections)) row.body = prose(key, 600);
    return { ...result, text: JSON.stringify(parsed) };
  });
  for (let i = 0; i < 12 && docs[0]?.status !== "completed"; i++) expect((await start()).status).not.toBe(503);
  expect((await start()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(9); expect(docs[0].status).toBe("completed");
  // The reasoning group already meets its 2,600 floor; only the four reading groups get a length repair.
  for (const group of utils.VEDIC_SECTION_GROUPS) expect(docs[0].llmMeta.attempts[group.key]).toBe(group.includeReasoning ? 1 : 2);
  expect(docs[0].llmMeta.quality.ok).toBe(false); expect(docs[0].llmMeta.quality.issues).toContain("total_body_too_short");
  expect(refund).not.toHaveBeenCalled();
});

it("does not accept non-string required bodies as short content", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args); const parsed = JSON.parse(result.text);
    const first = Object.keys(parsed.sections || {})[0];
    if (first) parsed.sections[first].body = { invalid: "본문 아님" };
    return { ...result, text: JSON.stringify(parsed) };
  });
  expect((await start()).status).toBe(202); expect(docs[0].llmMeta.groups).toEqual({});
});

// R8 2026-10-10: 영문 품위, 0 점수, 이름 자리표시, 결론에 다음 안타르다샤·고차라 누락.
const r8Chart = () => ({
  lagna: { rashiKo: "양자리", sign: "Aries" }, moon: { sign: "Aries" }, moonNakshatra: { name: "Ashwini" }, bhavas: [], calculationMeta: {},
  grahas: [{ name: "Jupiter", nameKo: "목성", rashiKo: "게자리", house: 4, dignity: "exalted" }, { name: "Mars", nameKo: "화성", rashiKo: "게자리", house: 4, dignity: "enemy sign" }],
  vimshottariDasha: { currentMahadasha: { lord: "Moon", startDate: "2020-07-23", endDate: "2030-07-23" }, currentAntardasha: { lord: "Venus", startDate: "2025-11-23", endDate: "2027-07-23" } },
  transits: { gochara: { Saturn: { sign: "Pisces" }, Jupiter: { sign: "Cancer" } } },
});
it("states the next antardasha and Moon-based gochara as calculated facts", () => {
  const facts = utils.buildCanonicalFactsLine(r8Chart());
  expect(facts).toContain("다음 안타르다샤=태양(2027-07-23부터)");
  expect(facts).toContain("고차라=토성 물고기자리(달 기준 12번째), 목성 게자리(달 기준 4번째)");
  const last = r8Chart(); last.vimshottariDasha.currentAntardasha = { lord: "Sun", startDate: "2029-01-23", endDate: "2030-07-23" };
  expect(utils.buildCanonicalFactsLine(last)).toContain("다음 안타르다샤=화성(2030-07-23부터·새 마하다샤 시작)");
});
it("writes dignity in Korean and asks for nonzero scores without a placeholder name", () => {
  const { input } = utils.normalizeConsultationInput({ ...body, name: "" });
  const group = utils.VEDIC_SECTION_GROUPS.find(row => row.includeScores);
  const prompt = utils.buildGroupPrompt(input, r8Chart(), group);
  expect(prompt).not.toMatch(/"dignity":"(?:exalted|enemy sign)"|닉네임: 미입력/u);
  expect(prompt).toContain('"dignity":"고양"');
  expect(prompt).not.toMatch(/"dharma":0/u);
  expect(prompt).toContain("0 은 쓰지 마세요");
  const basis = JSON.stringify(utils.buildVedicAnalysisBasis(r8Chart()));
  expect(basis).not.toMatch(/exalted|enemy sign|"Aries"/u);
  expect(basis).toContain("\"달의 라시\",\"value\":\"양자리\"");
});
