/** @jest-environment node */
// 같은 탭 재결제: 1세대 주문(K)은 결제창만 열고 떠나 크론이 30분 뒤 만료(ORDER_EXPIRED)시켰고, 같은 요청 키 K 로
// 다시 연 2세대 주문(K#1)이 실제로 결제됐다. 만료된 1세대가 K 를 들고 있다는 이유로 시작·폴링·재열람을 막으면
// "결제됐는데 402/403" 이 된다(2026-09-24). 환불·PG 취소·결제 흔적이 있는 주문은 그대로 막는다.
// 결제 원장은 fixture 의 진짜 연산자 구현(matches)으로 평가한다 — 필터와 무관하게 행을 돌려주는 스텁이면 이 가드는 죽는다.
import { jest } from "@jest/globals";
import { applyUpdate, matches } from "../fixtures/fake-payment-db.mjs";

const uid = "64b7f2a1c3d4e5f601234567";
const KEY = "same-tab-resubmit-key";
const ZIWEI = "ziwei-ai-consultation";
const ISLAND = "ziwei-island-palace-consult";
const birth = { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", calendarType: "solar", focusArea: "overall" };
const ziweiBody = { ...birth, birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" }, topic: "전체 명반 해석" };
const islandBody = { ...birth, palaceKey: "명궁" };
// 각 행은 면제 조건(만료 취소 · ORDER_EXPIRED · 결제 흔적 없음) 중 하나를 깨뜨린다.
const REVOKED = {
  refund: { status: "refunded", orderState: "REFUNDED", failureCode: "", paidAt: new Date() },
  "PG cancel": { failureCode: "PG_CANCELLED" },
  "expiry with a payment trace": { paidAt: new Date() },
};
let ziwei, island, utils, docs, payments, provider, chart, refund, fetchBlock;
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
function collection(rows) {
  const update = (filter, change) => { const row = rows().find(item => matches(item, filter)); if (row) { applyUpdate(row, clone(change)); row.updatedAt = new Date(); } return row; };
  return {
    findOne: filter => query(rows().find(row => matches(row, filter)) || null),
    findOneAndUpdate: (filter, change) => query(update(filter, change) || null),
    updateOne: async (filter, change) => ({ modifiedCount: update(filter, change) ? 1 : 0 }),
  };
}
const consultations = { ...collection(() => docs),
  create: async fields => { const doc = { ...clone(fields), createdAt: new Date(), updatedAt: new Date() }; docs.push(doc); return clone(doc); },
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
};
function orders(featureKey, expiredPatch = {}) {
  const base = { userId: uid, featureKey, requestId: KEY, paymentType: "digital_content", accessType: "single_purchase" };
  return [
    { ...base, _id: "order-gen0", merchantUid: "cd-expired-gen0", idempotencyKey: KEY, status: "cancelled", orderState: "CANCELLED", failureCode: "ORDER_EXPIRED", metadata: { reconcile: { lastPgStatus: "ready" } }, ...expiredPatch },
    { ...base, _id: "order-gen1", merchantUid: "cd-paid-gen1", idempotencyKey: `${KEY}#1`, status: "paid", orderState: "PAID_VERIFIED", paidAt: new Date() },
  ];
}
const saved = (id, serviceType) => ({ id, userId: uid, serviceType, status: "completed", idempotencyKey: KEY, paymentId: payments[1].merchantUid, messages: [{ role: "assistant", content: "old" }] });

function prose(seed, lead, length) {
  let value = `${seed}${lead}`;
  for (let i = 0; value.replace(/\s/g, "").length < length; i++) value += `${seed}의 ${i}번째 관찰은 현재 생활에서 반복되는 선택을 돌아보고 작은 행동으로 확인하는 과정을 설명합니다. `;
  return value;
}
const ziweiText = async (_env, _prompt, options) => {
  const group = utils.SECTION_GROUP_SPECS.find(group => group.id === options.logContext.sectionGroup);
  if (!group) return { ok: true, text: JSON.stringify({ meta: { scores: { overall: 70 } }, sections: {} }) };
  return { ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ sections: Object.fromEntries(group.sections.map(key => [key, { title: key, body: prose(key, "의 계산 근거를 살펴봅니다. ", Math.floor(group.targetChars / group.sections.length)) }])) }) };
};
const islandText = async (_env, _prompt, options) => ({ ok: true, provider: "gemini", model: "fixture", text: JSON.stringify({ body: prose(options.logContext.sectionGroup, " 자미의 계산 근거를 살펴봅니다. ", 3500), evidence: { palace: "명궁", mainStars: ["자미"], daeun: "23-32" } }) });

beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  const auth = await import("../../worker/lib/auth.js");
  const models = await import("../../worker/lib/models.js");
  const entitlement = await import("../../worker/lib/entitlement-policy.js");
  const structured = await import("../../worker/lib/structured-consultation.js");
  const none = { findOne: () => query(null), updateOne: (...args) => refund(...args) };
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ ...auth, getOptionalUserFromRequest: async () => ({ userId: uid }) }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({ ...models, ZiweiAiConsultation: consultations, Payment: collection(() => payments),
    User: { findById: () => query({ _id: uid, role: "user" }), updateOne: (...args) => refund(...args) }, PaidExecutionRecord: none, PointHistory: none, MonthlyCreditLedger: none }));
  jest.unstable_mockModule("../../worker/lib/entitlement-policy.js", () => ({ ...entitlement, resolveFeatureAccessPolicy: () => ({ allowed: false }) }));
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ consumePassForFeature: async () => ({ covered: false }), passDenialCode: () => "PASS_NOT_EXPECTED" }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ fetchPortOnePayment: () => { throw new Error("PG blocked"); }, getPortOnePublicConfig: () => { throw new Error("PG blocked"); }, getPortOneConfig: () => { throw new Error("PG blocked"); } }));
  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => null }));
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({ ...structured, callGeminiJsonWithRetry: (...args) => provider(...args) }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: (...args) => refund(...args) }));
  jest.unstable_mockModule("../../worker/lib/ziwei-ai-chart.js", () => ({ calculateZiweiAiChart: () => clone(chart), formatStarWithBrightness: value => value }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText: async (_env, _key, text) => text, cmsPromptModelConfig: async () => ({}) }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  ({ handleZiweiAiRoutes: ziwei, __ziweiAiTestUtils: utils } = await import("../../worker/routes/ziwei-ai.js"));
  ({ handleZiweiIslandAiRoutes: island } = await import("../../worker/routes/ziwei-island-ai.js"));
});
beforeEach(() => {
  docs = []; payments = []; refund = jest.fn(async () => ({})); provider = jest.fn(ziweiText);
  chart = { palaces: [], fourTransformations: {}, chartSummary: "fixture" };
  fetchBlock = jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("External fetch blocked"); });
});
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
const post = (path, body) => new Request(`https://mock.test${path}`, { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": KEY }, body: JSON.stringify({ ...body, paymentId: payments[1].merchantUid }) });
const ziweiStart = () => ziwei(post("/api/ziwei-ai/start", ziweiBody), {});
const islandStart = () => island(post("/api/ziwei-island-ai/generate", islandBody), {});
const read = (handler, path, id) => handler(new Request(`https://mock.test${path}?id=${id}`), {});

it("ziwei: the K#1 purchase starts, polls, completes and reopens past the expired K order", async () => {
  payments = orders(ZIWEI);
  expect((await ziweiStart()).status).toBe(202);
  expect((await read(ziwei, "/api/ziwei-ai/result", docs[0].id)).status).toBe(202);
  for (let i = 0; i < 4; i++) expect((await ziweiStart()).status).toBe(202);
  expect((await ziweiStart()).status).toBe(200);
  expect((await read(ziwei, "/api/ziwei-ai/result", docs[0].id)).status).toBe(200);
  expect(payments.map(row => row.status)).toEqual(["cancelled", "fulfilled"]); expect(refund).not.toHaveBeenCalled();
});
it("island: the K#1 purchase starts, polls, completes and reopens past the expired K order", async () => {
  provider.mockImplementation(islandText); chart = { palaces: [{ name: "명궁", mainStars: ["자미"], majorLuck: { range: "23-32" } }], fourTransformations: {}, chartSummary: "fixture" };
  payments = orders(ISLAND);
  expect((await islandStart()).status).toBe(202);
  expect((await read(island, "/api/ziwei-island-ai/result", docs[0].id)).status).toBe(202);
  expect((await islandStart()).status).toBe(200);
  expect((await read(island, "/api/ziwei-island-ai/result", docs[0].id)).status).toBe(200);
  expect(payments.map(row => row.status)).toEqual(["cancelled", "fulfilled"]); expect(refund).not.toHaveBeenCalled();
});
for (const [label, patch] of Object.entries(REVOKED)) it(`${label} on the same key still blocks start and reopen for both products`, async () => {
  payments = orders(ZIWEI, patch);
  expect((await ziweiStart()).status).toBe(402);
  docs.push(saved("zwai_saved", utils.SERVICE_KEY));
  expect((await read(ziwei, "/api/ziwei-ai/result", "zwai_saved")).status).toBe(403);
  payments = orders(ISLAND, patch);
  expect((await islandStart()).status).toBe(403);
  docs.push(saved("zwisl_saved", ISLAND));
  expect((await read(island, "/api/ziwei-island-ai/result", "zwisl_saved")).status).toBe(403);
  expect(provider).not.toHaveBeenCalled();
});
