/** @jest-environment node */
import { jest } from "@jest/globals";

const uid = "64b7f2a1c3d4e5f601234567";
const body = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 명반 해석", calendarType: "solar", focusArea: "overall", accessType: "pass" };
let settleStuck, release, card, settleDue, utils, route, docs, provider, chart, fault, blocked, mode, userId, usage, refund, fetchBlock, lostConfirmation, passRefund, consumeResult, accessQueue, passOrder, withdrawn;
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
      if ("$in" in value) return value.$in.includes(actual ?? null);
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
  find: filter => findQuery(docs.filter(doc => matches(doc, filter))),
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
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, ZiweiAiConsultation: model, ZiweiCalculationPreparation: { findById: () => query(null) },
    User: { findById: () => query({ _id: uid, role: "user" }), findOne: () => query({ _id: uid, status: withdrawn ? "withdrawn" : "active" }), updateOne: (...args) => refund(...args) },
    PaidExecutionRecord: { findOne: () => query(blocked === 0 ? {} : null) },
    Payment: { findOne: filter => query(filter.paymentType === "membership_pass" ? passOrder : blocked === 1 ? {} : mode === "paid" && filter.status.$in.includes("paid") ? { _id: uid, merchantUid: "payment" } : null), updateOne: async (...args) => usage(...args) },
    PointHistory: { findOne: () => query(blocked === 2 ? {} : null), updateOne: (...args) => refund(...args) },
    MonthlyCreditLedger: { findOne: () => query(blocked === 3 ? {} : null), updateOne: (...args) => refund(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: accessQueue.length ? accessQueue.shift() : mode === "pass", accessType: "pass" }) }));
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ consumePassForFeature: async (...args) => { usage(...args); return consumeResult; }, passDenialCode: () => "",
    refundPassUseEvidence: (...args) => passRefund(...args) }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ fetchPortOnePayment: () => { throw new Error("PG blocked"); }, getPortOnePublicConfig: () => { throw new Error("PG blocked"); }, getPortOneConfig: () => { throw new Error("PG blocked"); } }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => mode === "monthly" ? { ledgerId: uid } : null }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({ ...structured, callGeminiJsonWithRetry: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => { card(...args); return refund(...args); } }));
  jest.unstable_mockModule("../../worker/lib/billing-evidence-claim.js", () => ({ claimRequestBillingEvidence: async () => ({ ok: true }), evidenceClaimErrorBody: () => ({}), releaseRequestBillingEvidence: (...args) => release(...args) }));
  jest.unstable_mockModule("../../worker/lib/ziwei-ai-chart.js", () => ({ calculateZiweiAiChart: (...args) => chart(...args), formatStarWithBrightness: value => value, FOUR_TRANSFORMATIONS: {}, TRANSFORMATION_LABELS: {} }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleZiweiAiRoutes: route, __ziweiAiTestUtils: utils, settleDueZiweiRetryRefunds: settleDue, settleStuckDelivery: settleStuck } = await import("../../worker/routes/ziwei-ai.js"));
});
beforeEach(() => {
  docs = []; fault = null; lostConfirmation = false; blocked = -1; mode = "pass"; userId = uid; usage = jest.fn(); refund = jest.fn(async () => ({})); passRefund = jest.fn(async () => ({ refunded: true })); consumeResult = { covered: true }; accessQueue = []; passOrder = null; withdrawn = false; release = jest.fn(async () => ({ released: 1 })); card = jest.fn();
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
  return route(new Request("https://mock.test/api/ziwei-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, ...extra }) }), { ZIWEI_AI_DELIVERY_V2_ENABLED: "false" });
}
function post(path, payload) {
  return route(new Request(`https://mock.test/api/ziwei-ai${path}`, { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify(payload) }), { ZIWEI_AI_DELIVERY_V2_ENABLED: "false" });
}
const emptyGroups = async () => ({ ok: true, text: JSON.stringify({ sections: {} }) });
async function exhaust() {
  provider.mockImplementation(emptyGroups);
  expect((await start()).status).toBe(202);
  return start();
}

for (const paid of ["pass", "monthly", "paid"]) it(`${paid}: seven waves reuse the stored chart and groups`, async () => {
  mode = paid; let partial;
  for (let i = 0; i < 6; i++) { const response = await start(partial ? { resumeSessionId: partial.sessionId } : {}); expect(response.status).toBe(202); partial = await response.json(); expect(partial.consultation.completedGroups).toHaveLength(i + 1); expect(provider).toHaveBeenCalledTimes(i + 1); expect(usage).not.toHaveBeenCalled(); }
  const response = await start({ resumeSessionId: partial.sessionId }); expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ consultation: { saved: true, status: "completed", id: partial.sessionId } });
  expect(provider).toHaveBeenCalledTimes(7); expect(chart).toHaveBeenCalledTimes(1); expect(refund).not.toHaveBeenCalled();
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(7);
});
for (const status of ["delivery_pending", "completed"]) for (const kind of ["null", "throw", "confirm"]) it(`${status} storage ${kind} preserves generated text and never refunds`, async () => {
  for (let i = 0; i < 6; i++) await start(); fault = { status, kind };
  const response = await start(); expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ reason: "RESULT_STORAGE_UNAVAILABLE", retryable: true, resultId: docs[0].id });
  expect(refund).not.toHaveBeenCalled(); const calls = provider.mock.calls.length; fault = null;
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(calls); expect(docs[0].status).toBe("completed");
});
it("unusable groups consume only two attempts and cannot become completed", async () => {
  provider.mockImplementation(async () => ({ ok: true, text: JSON.stringify({ sections: {} }) }));
  expect((await start()).status).toBe(202); expect((await start()).status).toBe(503);
  expect(docs[0].status).toBe("generation_failed"); expect(usage).not.toHaveBeenCalled(); expect((await start()).status).toBe(409); expect(provider).toHaveBeenCalledTimes(2);
  // 2026-11-20 R10: 결제 화면에서 미리 차감한 이용권은 보류 동안 그대로 두고, 고객 환불 요청(또는 창 만료) 때
  // 같은 (기능, requestId) 증빙으로 한 번 되돌린다(코인으로 환급하지 않는다).
  expect(passRefund).not.toHaveBeenCalled();
  expect((await post("/refund-request", { sessionId: docs[0].id })).status).toBe(200);
  expect(passRefund).toHaveBeenCalledTimes(1);
  expect(passRefund.mock.calls[0][0]).toMatchObject({ featureKey: "ziwei-ai-consultation", requestId: "original-paid-request" });
  expect(card).not.toHaveBeenCalled();
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
  for (let i = 0; i < 6; i++) await start(); usage.mockImplementationOnce(() => { throw new Error("lost response"); });
  expect((await start()).status).toBe(503); expect(docs[0].status).toBe("delivery_pending"); const calls = provider.mock.calls.length;
  expect((await start()).status).toBe(200); expect(provider).toHaveBeenCalledTimes(calls);
  expect(usage.mock.calls.map(call => call[0].requestId)).toEqual(["original-paid-request", "original-paid-request"]); expect(refund).not.toHaveBeenCalled();
});
it("delivers the finished body when the late pass settlement is denied", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  for (let i = 0; i < 6; i++) expect((await start()).status).toBe(202);
  consumeResult = { covered: false, reason: "pass_access_conflict" };
  expect((await start()).status).toBe(200);
  expect(docs[0]).toMatchObject({ status: "completed", llmMeta: { usageSettlement: "failed", usageSettlementReason: "PAYMENT_REQUIRED" } });
  expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledTimes(7);
  expect(warn).toHaveBeenCalledWith("paid_delivery_usage_settlement_failed", expect.objectContaining({ service: "ziwei-ai", reason: "PAYMENT_REQUIRED" }));
  warn.mockRestore();
});

it("delivers a finished pass body when only the pre-delivery recheck is denied by the pass limit", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  for (let i = 0; i < 6; i++) expect((await start()).status).toBe(202);
  accessQueue = [true, false];
  expect((await start()).status).toBe(200);
  expect(accessQueue).toEqual([]);
  expect(docs[0]).toMatchObject({ status: "completed", llmMeta: { usageSettlement: "failed", usageSettlementReason: "PAYMENT_REQUIRED" } });
  expect(usage).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledTimes(7);
  expect(warn).toHaveBeenCalledWith("paid_delivery_usage_settlement_failed", expect.objectContaining({ service: "ziwei-ai", stage: "access_recheck" }));
  warn.mockRestore();
});
it("delivers a stored delivery_pending pass body on resume after the pass limit is exhausted", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  for (let i = 0; i < 6; i++) await start(); fault = { status: "completed", kind: "null" };
  expect((await start()).status).toBe(503); expect(docs[0].status).toBe("delivery_pending");
  mode = "none"; const calls = provider.mock.calls.length;
  expect((await start()).status).toBe(200);
  expect(docs[0]).toMatchObject({ status: "completed", llmMeta: { usageSettlement: "failed" } });
  expect(provider).toHaveBeenCalledTimes(calls); expect(refund).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled();
  warn.mockRestore();
});
for (const [label, setup] of [["a refunded pass order", () => { passOrder = { status: "refunded" }; }], ["a withdrawn member", () => { withdrawn = true; }], ["revoked pass use evidence", () => { blocked = 2; }]]) it(`keeps the 402 for ${label} when the pass limit recheck is denied`, async () => {
  for (let i = 0; i < 6; i++) await start(); fault = { status: "completed", kind: "null" };
  expect((await start()).status).toBe(503);
  mode = "none"; setup();
  expect((await start()).status).toBe(402); expect(docs[0].status).toBe("delivery_pending"); expect(docs[0].llmMeta.usageSettlement).toBeUndefined();
});
it("missing optional grounding does not purchase an extra group", async () => {
  chart.mockImplementation(() => ({ palaces: ["명궁", "형제궁", "부부궁"].map(name => ({ name, mainStars: ["자미"], earthlyBranch: "자" })), fourTransformations: {} }));
  for(let i=0;i<7;i++)await start();
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(7);
  expect(Object.keys(docs[0].llmMeta.rawResponses)).toHaveLength(6);
});
// 2026-11-20 R10 다시 시도 우선: 웹 결제 건은 묶음 시도를 다 써도 바로 환불하지 않고 무료 다시 시도를 연다(환불 = 생성 + 7일 또는 고객 요청).
it("holds a card payment for a free retry once short groups exhaust their attempts", async () => {
  mode = "paid";
  const response = await exhaust();
  expect(response.status).toBe(503);
  const payload = await response.json();
  expect(payload).toMatchObject({ reason: "LLM_ERROR", refunded: false, sessionId: docs[0].id, retry: { available: true, sessionId: docs[0].id } });
  expect(Date.parse(payload.retry.refundAt) - docs[0].createdAt.getTime()).toBe(7 * 86400000);
  expect(docs[0]).toMatchObject({ status: "generation_failed", llmMeta: { retryable: { access: { accessType: "paid", paymentId: "payment", evidenceType: "direct_payment", prepaid: true } } } });
  expect(JSON.stringify(docs[0].llmMeta.retryable.access)).not.toContain("accessToken");
  expect(card).not.toHaveBeenCalled(); expect(release).not.toHaveBeenCalled(); expect(passRefund).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled();
  const again = await start();
  expect(again.status).toBe(409);
  expect(await again.json()).toMatchObject({ refunded: false, retry: { available: true } });
  const result = await route(new Request(`https://mock.test/api/ziwei-ai/result?id=${docs[0].id}`), {});
  expect(result.status).toBe(409);
  expect(await result.json()).toMatchObject({ retry: { available: true, sessionId: docs[0].id } });
});
it("refunds the card payment once when the customer asks instead of retrying", async () => {
  mode = "paid"; await exhaust(); refund.mockResolvedValue({ refunded: true });
  const response = await post("/refund-request", { sessionId: docs[0].id });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, sessionId: docs[0].id, refunded: true, refundStatus: "refunded" });
  expect(card).toHaveBeenCalledTimes(1);
  expect(card.mock.calls[0][1]).toMatchObject({ _id: uid, merchantUid: "payment" });
  expect(card.mock.calls[0][4]).toBe("ziwei_ai_generation");
  expect(release).toHaveBeenCalledTimes(1);
  expect(release.mock.calls[0][1]).toMatchObject({ requestId: "original-paid-request" });
  expect(docs[0].llmMeta.retryable.refundSettledAt).toBeTruthy();
  expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(409);
  await settleDue({}, { model }); expect(card).toHaveBeenCalledTimes(1);
});
it("retries a held V1 failure without a new charge and keeps the accepted groups", async () => {
  mode = "paid";
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => args[2].logContext.sectionGroup === "foundation" ? normal(...args) : emptyGroups());
  for (let i = 0; i < 4 && docs[0]?.status !== "generation_failed"; i++) await start();
  expect(docs[0].status).toBe("generation_failed");
  const kept = clone(docs[0].llmMeta.groups.foundation);
  expect(Object.keys(kept).length).toBeGreaterThan(0);
  provider.mockImplementation(normal);
  let response = await post("/retry", { sessionId: docs[0].id });
  expect([200, 202]).toContain(response.status);
  for (let i = 0; i < 8 && docs[0].status !== "completed"; i++) response = await start({ resumeSessionId: docs[0].id });
  expect(docs[0].status).toBe("completed");
  expect(docs[0].llmMeta.groups.foundation).toEqual(kept);
  expect(docs[0].llmMeta.retryable.reopens).toBe(1);
  expect(card).not.toHaveBeenCalled(); expect(release).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled(); expect(chart).toHaveBeenCalledTimes(1);
});
it("rejects a retry or refund request from another account or another service record", async () => {
  mode = "paid"; await exhaust(); userId = "64b7f2a1c3d4e5f601234568";
  expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(404);
  expect((await post("/refund-request", { sessionId: docs[0].id })).status).toBe(404);
  userId = uid; docs[0].serviceType = "ziwei-island-palace-consult";
  expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(404);
  expect((await post("/refund-request", { sessionId: docs[0].id })).status).toBe(404);
  expect(docs[0].status).toBe("generation_failed"); expect(card).not.toHaveBeenCalled();
});
it("keeps the claim and the marker unsettled when the card refund fails, so the cron retries", async () => {
  mode = "paid"; await exhaust();
  refund.mockResolvedValue({ refunded: true }); card.mockImplementationOnce(() => { throw new Error("PG down"); });
  await post("/refund-request", { sessionId: docs[0].id });
  expect(release).not.toHaveBeenCalled(); expect(docs[0].llmMeta.retryable.refundSettledAt).toBeUndefined();
  expect(await settleDue({}, { model })).toEqual([{ service: "ziwei-ai", refundStatus: "refunded" }]);
  expect(card).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledTimes(1);
});
it("settles an expired retry window through the refund cron and restores a checkout pass", async () => {
  await exhaust();
  expect(passRefund).not.toHaveBeenCalled();
  docs[0].updatedAt = new Date(Date.now() - 300000);
  expect(await settleDue({}, { model, now: Date.now() + 8 * 86400000 })).toEqual([{ service: "ziwei-ai", refundStatus: "refunded" }]);
  expect(passRefund).toHaveBeenCalledTimes(1);
  expect(passRefund.mock.calls[0][0]).toMatchObject({ userId: uid, featureKey: "ziwei-ai-consultation", requestId: "original-paid-request" });
  expect(docs[0].llmMeta).toMatchObject({ retryable: { refundReason: "RETRY_WINDOW_EXPIRED", refundStatus: "refunded" } });
  expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(409);
});
// 2026-11-24 승인 수선: 이용권·월정석·코인 복원이 예외로 끝나면 삼키지 않고 경보를 남기며, 보류 환불을 not_required 로 닫지 않는다.
it("alerts and keeps the retry refund open when restoring the checkout pass throws", async () => {
  await exhaust();
  docs[0].updatedAt = new Date(Date.now() - 300000);
  const later = Date.now() + 8 * 86400000;
  passRefund.mockRejectedValueOnce(new Error("pass store down"));
  const alert = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await settleDue({}, { model, now: later })).toEqual([{ service: "ziwei-ai", refundStatus: "failed" }]);
    expect(docs[0].llmMeta.retryable.refundSettledAt).toBeUndefined(); expect(release).not.toHaveBeenCalled();
    const line = alert.mock.calls.find(([marker]) => marker === "[PaidService Auto Refund Failed]");
    expect(JSON.parse(line[1])).toMatchObject({ service: "ziwei-ai", stage: "prepaid_access_restore", evidenceType: "pass", requestId: "original-paid-request", refundStatus: "refund_failed", failureReason: "pass store down" });
  } finally { alert.mockRestore(); }
  expect(await settleDue({}, { model, now: later })).toEqual([{ service: "ziwei-ai", refundStatus: "refunded" }]);
  expect(passRefund).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledTimes(1);
});
it("lists only this service's completed consultations and keeps legacy rows without a service type", async () => {
  docs.push({ id: "zwai_main", userId: uid, serviceType: "ziwei-ai", status: "completed", createdAt: new Date() },
    { id: "zwai_legacy", userId: uid, status: "completed", createdAt: new Date() },
    { id: "zwai_island", userId: uid, serviceType: "ziwei-island-palace-consult", status: "completed", createdAt: new Date() });
  const listed = await (await route(new Request("https://mock.test/api/ziwei-ai/result"), {})).json();
  expect(listed.consultations.map(row => row.id).sort()).toEqual(["zwai_legacy", "zwai_main"]);
});
it("does not expire a reopened retry that is generating right now", async () => {
  mode = "paid"; await exhaust();
  const later = Date.now() + 8 * 86400000;
  docs[0].status = "partial"; docs[0].updatedAt = new Date(later - 1000);
  await settleDue({}, { model, now: later });
  expect(docs[0].status).toBe("partial"); expect(card).not.toHaveBeenCalled();
});
it("falls back to the immediate refund when the retry marker cannot be saved", async () => {
  mode = "paid"; provider.mockImplementation(emptyGroups);
  expect((await start()).status).toBe(202);
  fault = { status: "generation_failed", kind: "throw" };
  const response = await start();
  expect(response.status).toBe(503);
  expect(await response.json()).not.toHaveProperty("retry");
  expect(card).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
  expect(docs[0].status).toBe("generation_failed"); expect(docs[0].llmMeta.retryable).toBeUndefined();
});
for (const paid of ["pass", "monthly"]) it(`${paid}: does not attempt a card refund once short groups exhaust their attempts`, async () => {
  mode = paid;
  provider.mockImplementation(async () => ({ ok: true, text: JSON.stringify({ sections: {} }) }));
  expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(503);
  expect(refund).not.toHaveBeenCalled();
});
it("refund after provider response prevents completion and consumption", async () => {
  for (let i = 0; i < 6; i++) await start(); const base = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => { const value = await base(...args); blocked = 1; return value; });
  expect((await start()).status).toBe(402); expect(docs[0].status).toBe("delivery_pending"); expect(usage).not.toHaveBeenCalled();
});

for (const repair of ["shorter", "repeated", "empty", "truncated"]) it(`preserves short foundation after one ${repair} repair`, async () => {
  const normal = provider.getMockImplementation(); let foundationCalls = 0;
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args);
    if (args[2].logContext.sectionGroup !== "foundation") return result;
    foundationCalls++;
    const parsed = JSON.parse(result.text);
    if (foundationCalls > 1) expect(args[1]).toContain("직전 본문은 공백 제외");
    for (const [key, row] of Object.entries(parsed.sections)) row.body = foundationCalls === 1 ? prose(key, 850)
      : repair === "empty" ? "" : repair === "repeated" ? prose(key, 1500) + prose(key, 1500) : prose(key, 750);
    return { ...result, text: JSON.stringify(parsed), truncated: foundationCalls > 1 && repair === "truncated" };
  });
  expect((await start()).status).toBe(202); const draft = clone(docs[0].llmMeta.groups.foundation);
  for (let i = 0; i < 7 && docs[0].status !== "completed"; i++) await start();
  expect(docs[0].status).toBe("completed"); expect(docs[0].llmMeta.groups.foundation).toEqual(draft);
  expect(docs[0].llmMeta.attempts.foundation).toBe(2); expect(provider).toHaveBeenCalledTimes(8); expect(refund).not.toHaveBeenCalled();
});
it("trims overlong groups using the same whitespace-free ceiling as the prompt", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args); const parsed = JSON.parse(result.text);
    if (!parsed.sections) return result;
    expect(args[1]).toContain("제목과 공백 제외"); expect(args[1]).not.toContain("공백 포함");
    const group = utils.SECTION_GROUP_SPECS.find(row => row.id === args[2].logContext.sectionGroup);
    for (const [key, row] of Object.entries(parsed.sections)) row.body = prose(key, Math.ceil(group.targetChars * 1.5 / group.sections.length));
    return { ...result, text: JSON.stringify(parsed) };
  });
  for (let i = 0; i < 7; i++) await start();
  const { countPaidReportBodyChars } = await import("../../worker/lib/paid-report-quality.js");
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(7);
  for (const group of utils.SECTION_GROUP_SPECS) expect(countPaidReportBodyChars(Object.values(docs[0].llmMeta.groups[group.id]).map(row => row.body).join("\n"))).toBeLessThanOrEqual(Math.ceil(group.targetChars * utils.SECTION_GROUP_MAX_OVER_TARGET));
});
it("delivers all usable short groups after one length repair each", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args); const parsed = JSON.parse(result.text);
    for (const [key, row] of Object.entries(parsed.sections || {})) row.body = prose(key, 200);
    return { ...result, text: JSON.stringify(parsed) };
  });
  for (let i = 0; i < 12; i++) expect((await start()).status).toBe(202);
  expect((await start()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(13); expect(docs[0].status).toBe("completed");
  for (const group of utils.SECTION_GROUP_SPECS) expect(docs[0].llmMeta.attempts[group.id]).toBe(2);
  expect(refund).not.toHaveBeenCalled();
});

it("does not replace grounded short content with a longer ungrounded repair", async () => {
  chart.mockImplementation(() => ({ palaces: [{ name: "명궁", mainStars: ["자미"], earthlyBranch: "자" }], fourTransformations: {} }));
  const normal = provider.getMockImplementation(); let calls = 0;
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args);
    if (args[2].logContext.sectionGroup !== "foundation") return result;
    calls++; const parsed = JSON.parse(result.text);
    for (const [key, row] of Object.entries(parsed.sections)) row.body = prose(key, calls === 1 ? 850 : 1700);
    if (calls === 1) parsed.sections.reading_guide.body += " 자미의 근거를 읽습니다.";
    return { ...result, text: JSON.stringify(parsed) };
  });
  await start(); const draft = clone(docs[0].llmMeta.groups.foundation);
  await start(); expect(docs[0].llmMeta.groups.foundation).toEqual(draft);
});
for (const flags of [{ truncated: true }, { finishReason: "length" }]) it(`preserves usable sections from a clipped initial group: ${JSON.stringify(flags)}`, async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => ({ ...await normal(...args), ...flags }));
  expect((await start()).status).toBe(202); expect(Object.keys(docs[0].llmMeta.groups)).toHaveLength(1);
  for(let i=0;i<6;i++)await start();
  expect(docs[0].status).toBe("completed"); expect(provider).toHaveBeenCalledTimes(7);
});
it("doubles the output cap only for the retry after an unsalvageable truncated group", async () => {
  const normal = provider.getMockImplementation(); let foundationCalls = 0;
  provider.mockImplementation(async (...args) => args[2].logContext.sectionGroup === "foundation" && ++foundationCalls === 1
    ? { ...await normal(...args), text: '{"sections":{"', truncated: true, finishReason: "MAX_TOKENS" } : normal(...args));
  for (let i = 0; i < 9 && docs[0]?.status !== "completed"; i++) await start();
  const groups = provider.mock.calls.map(args => args[2]).filter(options => utils.SECTION_GROUP_SPECS.some(group => group.id === options.logContext.sectionGroup));
  const [first, retry] = groups.filter(options => options.logContext.sectionGroup === "foundation");
  expect(retry.capTokens).toBe(Math.max(first.capTokens, Math.min(32768, first.capTokens * 2)));
  for (const options of groups.filter(row => row.logContext.sectionGroup !== "foundation")) expect(options.capTokens).toBe(first.capTokens);
  expect(docs[0].llmMeta.attempts["foundation:truncated"]).toBe(1); expect(docs[0].status).toBe("completed"); expect(refund).not.toHaveBeenCalled();
});

it("discards a malformed body while retaining other usable sections", async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => {
    const result = await normal(...args); const parsed = JSON.parse(result.text);
    const first = Object.keys(parsed.sections || {})[0];
    if (first) parsed.sections[first].body = { invalid: "본문 아님" };
    return { ...result, text: JSON.stringify(parsed) };
  });
  expect((await start()).status).toBe(202); expect(Object.keys(docs[0].llmMeta.groups)).toHaveLength(1);
  expect(JSON.stringify(docs[0].llmMeta.groups)).not.toContain("본문 아님");
});
// 2026-10-15: 자미두수 전문가 상담은 무성 페르소나를 붙이고, 한국어 밖 로케일은 영어 메모로 바꾼다.
for (const [locale, header] of [["ko", "[상담자 페르소나 — 무성]"], ["en", "[Advisor persona — Museong]"]]) it(`${locale}: sends the Museong persona after the system prompt`, async () => {
  await start({ locale });
  const systemPrompt = String(provider.mock.calls[0][2].systemPrompt);
  expect(systemPrompt.indexOf(header)).toBeGreaterThan(0);
  expect(systemPrompt).not.toMatch(/\d+년 경력/u);
});

// 2026-11-08 판 2(groupPlanVersion 2): 새 상담만 판 2로 고정하고, 판 1 프롬프트 바이트는 그대로 둔다.
const QUESTION = "올해 이직을 해도 될까요?";
const startV2 = (extra = {}) => route(new Request("https://mock.test/api/ziwei-ai/start", { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": "original-paid-request" }, body: JSON.stringify({ ...body, userQuestion: QUESTION, ...extra }) }), {});
function v2Provider(edit = (_group, parsed) => parsed) {
  return async (_env, _prompt, options) => {
    const group = utils.ZIWEI_V2_GROUP_SPECS.find(row => row.id === options.logContext.sectionGroup);
    if (!group) return { ok: true, text: JSON.stringify({ meta: { scores: { overall: 70 } }, sections: {} }) };
    const parsed = { sections: Object.fromEntries(group.sections.map(key => [key, { title: key, body: prose(key, Math.floor(group.targetChars / group.sections.length)) }])) };
    const edited = edit(group, parsed, _prompt);
    return edited?.ok === false ? edited : { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify(edited) };
  };
}
const groupCalls = id => provider.mock.calls.filter(call => call[2].logContext.sectionGroup === id);
async function runV2(limit = 24) { let response; for (let i = 0; i < limit && docs[0]?.status !== "completed" && docs[0]?.status !== "generation_failed"; i++) response = await startV2(); return response; }

it("V2: new requests pin plan 2, quote the question only in the nature group and finish in seven waves", async () => {
  provider.mockImplementation(v2Provider());
  const response = await runV2(); expect(response.status).toBe(200);
  expect((await response.json()).consultation.groupPlanVersion).toBe(2);
  expect(docs[0].llmMeta.groupPlanVersion).toBe(2); expect(provider).toHaveBeenCalledTimes(7);
  expect(provider.mock.calls.map(call => call[2].logContext.sectionGroup)).toEqual([...utils.ZIWEI_V2_GROUP_SPECS.map(group => group.id), "meta"]);
  for (const [, prompt, options] of provider.mock.calls) expect(String(prompt).includes(QUESTION)).toBe(options.logContext.sectionGroup === "nature");
});
it("kill switch keeps new requests on plan 1", async () => {
  await start(); expect(docs[0].llmMeta.groupPlanVersion).toBeUndefined();
  expect(provider.mock.calls[0][2].logContext.sectionGroup).toBe("foundation");
});
it("V2: a group that stays repeated is salvaged and delivered instead of refunded", async () => {
  mode = "paid";
  provider.mockImplementation(v2Provider((group, parsed) => {
    if (group.id === "flow") for (const row of Object.values(parsed.sections)) row.body = prose("flow", 1300);
    return parsed;
  }));
  expect((await runV2()).status).toBe(200);
  expect(docs[0].status).toBe("completed"); expect(refund).not.toHaveBeenCalled();
  expect(docs[0].llmMeta.attempts["flow:salvaged"]).toBe(1); expect(groupCalls("flow")).toHaveLength(3);
  expect(Object.keys(docs[0].llmMeta.groups.flow).length).toBeGreaterThan(0);
});
it("V2: holds for a free retry only when every group comes back empty", async () => {
  mode = "paid";
  provider.mockImplementation(async () => ({ ok: true, text: JSON.stringify({ sections: {} }) }));
  expect((await runV2()).status).toBe(503);
  expect(docs[0].status).toBe("generation_failed"); expect(card).not.toHaveBeenCalled(); expect(provider).toHaveBeenCalledTimes(18);
  expect(docs[0].llmMeta.retryable).toBeTruthy();
  // 다시 시도는 비어 있는 묶음의 시도·건너뜀 표지만 새로 열어 처음부터 다시 만든다(새 결제·차감 없음).
  provider.mockImplementation(v2Provider());
  const retried = await route(new Request("https://mock.test/api/ziwei-ai/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: docs[0].id }) }), {});
  expect(retried.status).toBe(202);
  expect((await runV2()).status).toBe(200);
  expect(docs[0].status).toBe("completed"); expect(card).not.toHaveBeenCalled(); expect(refund).not.toHaveBeenCalled();
  for (const group of utils.ZIWEI_V2_GROUP_SPECS) expect(Object.keys(docs[0].llmMeta.groups[group.id] || {}).length).toBeGreaterThan(0);
});
it("V2: fills missing sections with one saved rescue and preserves existing sections", async () => {
  let natureCalls = 0;
  provider.mockImplementation(v2Provider((group, parsed) => {
    if (group.id === "nature" && ++natureCalls <= 2) delete parsed.sections.essence;
    return parsed;
  }));
  expect((await runV2()).status).toBe(200);
  expect(docs[0].llmMeta.attempts["nature:emptyRescue"]).toBe(1);
  expect(groupCalls("nature")).toHaveLength(3);
  expect(docs[0].llmMeta.groups.nature.essence.body.length).toBeGreaterThan(40);
  expect(docs[0].llmMeta.groups.nature.personality_profile.body.length).toBeGreaterThan(40);
  const before = provider.mock.calls.length;
  await startV2();
  expect(provider).toHaveBeenCalledTimes(before);
  expect(refund).not.toHaveBeenCalled();
});
it("V2: a missing meta intro falls back to a deterministic one after two calls", async () => {
  provider.mockImplementation(v2Provider());
  const base = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => args[2].logContext.sectionGroup === "meta" ? { ok: false } : base(...args));
  expect((await runV2()).status).toBe(200);
  expect(groupCalls("meta")).toHaveLength(2); expect(docs[0].status).toBe("completed"); expect(docs[0].llmMeta.reportMeta).toMatchObject({ fallback: true, gender: "female" });
});
it("V2: register drift gets one hinted repair and never reaches the delivered text", async () => {
  provider.mockImplementation(v2Provider((group, parsed) => {
    if (group.id === "nature") parsed.sections.personality_profile.body = `자기야, 이 흐름은 천천히 받아들이면 괜찮아요. ${parsed.sections.personality_profile.body}`;
    return parsed;
  }));
  expect((await runV2()).status).toBe(200);
  const [, repair] = groupCalls("nature");
  expect(String(repair[1])).toContain("무성의 말투에서 벗어났습니다");
  expect(JSON.stringify(docs[0].messages)).not.toContain("자기야");
});

// 2026-11-22 D: 복구 크론의 정체 확정. 창 안은 다시 시도 가능(묶음 보존·환불 없음), 창이 지나면 기존 보류 환불(settleZiweiRetryRefund).
describe("settleStuckDelivery", () => {
  const stuckDoc = () => ({ id: docs[0].id, userId: docs[0].userId });
  const quiet = async work => { const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); try { return await work(); } finally { warn.mockRestore(); } };
  async function stalled() { mode = "paid"; expect((await start()).status).toBe(202); docs[0].updatedAt = new Date(Date.now() - 300000); return clone(docs[0].llmMeta.rawResponses); }
  it("holds a stalled card payment for a free retry and keeps the saved groups", async () => {
    const groups = await stalled();
    expect((await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() }))).outcome).toBe("retryable");
    expect(docs[0]).toMatchObject({ status: "generation_failed", generationError: { code: "DELIVERY_STUCK" }, llmMeta: { rawResponses: groups, retryable: { access: { accessType: "paid", paymentId: "payment", prepaid: true } } } });
    expect(card).not.toHaveBeenCalled(); expect(release).not.toHaveBeenCalled();
    expect((await post("/retry", { sessionId: docs[0].id })).status).toBe(202);
  });
  it("refunds once through the held-refund path after the retry window", async () => {
    await stalled(); refund.mockResolvedValue({ refunded: true });
    expect(await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() + 8 * 86400000 }))).toEqual({ outcome: "generation_failed", refundStatus: "refunded" });
    expect(card).toHaveBeenCalledTimes(1); expect(card.mock.calls[0][4]).toBe("ziwei_ai_generation"); expect(release).toHaveBeenCalledTimes(1);
    await settleDue({}, { model, now: Date.now() + 8 * 86400000 }); expect(card).toHaveBeenCalledTimes(1);
  });
  // 2026-11-22 감사 B1: 재판정이 거절된 이용권 건(결제창이 이미 차감)도 창이 지나면 요청 키로 이용권을 되돌린다.
  it("keeps a pass refund possible when the pass recheck is denied for a stalled report", async () => {
    expect((await start()).status).toBe(202); docs[0].updatedAt = new Date(Date.now() - 300000); mode = "none";
    expect((await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() }))).outcome).toBe("retryable");
    expect(docs[0].llmMeta.retryable.access).toMatchObject({ accessType: "pass", prepaid: true, evidenceType: "pass" });
    expect(passRefund).not.toHaveBeenCalled();
    docs[0].updatedAt = new Date(Date.now() - 300000);
    expect(await settleDue({}, { model, now: Date.now() + 8 * 86400000 })).toEqual([{ service: "ziwei-ai", refundStatus: "refunded" }]);
    expect(passRefund).toHaveBeenCalledTimes(1); expect(passRefund.mock.calls[0][0]).toMatchObject({ requestId: "original-paid-request" });
  });
  it("leaves a live generation, a Toss native session, missing paid evidence and a finished result alone", async () => {
    mode = "paid"; expect((await start()).status).toBe(202);
    expect((await settleStuck({}, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("leased");
    docs[0].updatedAt = new Date(Date.now() - 300000); docs[0].accessSource = "toss";
    expect((await quiet(() => settleStuck({}, { doc: stuckDoc(), now: Date.now() }))).outcome).toBe("unsettled");
    docs[0].accessSource = ""; mode = "none";
    expect((await settleStuck({}, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("pending");
    docs[0].status = "completed";
    expect((await settleStuck({}, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("progressed");
    expect(card).not.toHaveBeenCalled();
  });
});
