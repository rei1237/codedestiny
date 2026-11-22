/**
 * @jest-environment node
 *
 * 숙요 궁합 AI 의 서버측 중복 생성 창 회귀 테스트.
 *
 * 예전에는 findOne 과 create 사이에 LLM 6회(60~100초)가 통째로 들어가 있어서, 그 사이 같은
 * idempotencyKey 로 들어온 요청이 아무것도 못 찾고 생성을 한 번 더 시작했다(= LLM 6회 추가 과금).
 * 지금은 계산 직후 시드를 먼저 써서 그 창을 닫는다.
 *
 * 🔴 이 파일에서 가장 중요한 단언은 "두 번째 요청이 반환된 시점에 LLM 호출 수가 늘지 않았다" 와
 *    "status 필드가 없던 옛 문서가 완료본으로 읽힌다" 둘이다. 뒤엣것을 놓치면 결제된 상담이
 *    빈 시드(messages: [])로 덮여 사라진다.
 */
import { jest } from "@jest/globals";
import sift from "sift";

const USER_ID = "64b7f2a1c3d4e5f601234567";
const KEY = "sukuyo-ai-duplicate-window-test";
// 기존 테스트는 판 1 동작을 지킨다. 판 2 테스트는 파일 끝에서 V2_ENV 로 돈다.
const ENV = { GEMINIF_API_KEY: "test-key", SUKUYO_COMPAT_AI_DELIVERY_V2_ENABLED: "false" };
const V2_ENV = { GEMINIF_API_KEY: "test-key" };

const SAMPLE_BODY = {
  consultationType: "compatibility",
  personA: { name: "나", gender: "female", birthDate: "1993-07-21", calendarType: "solar" },
  personB: { name: "상대", gender: "male", birthDate: "1990-03-08", calendarType: "solar" },
  relationshipType: "연인",
  topic: "전체 궁합",
  question: "이 관계를 오래 이어가려면 무엇을 조심해야 할까요?",
};

let handleSukuyoCompatibilityAiRoutes;
let testUtils;
let store;
let callGeminiJsonWithRetryMock;
let callGeminiTextMock;
let findCallArgs;
let storageFault;
let revokedAt = -1;
let paidMode = "pass";
let blockedFetch;
let legacyRefund, monthlyRefund, restoreAllowed;
let passRefund, cardRefund, cardPayment = null, settleDue, settleStuck;

/** 24-hex ObjectId 모양. 라우트가 /^[0-9a-f]{24}$/ 로 검사한다. */
let objectIdCounter = 0;
function nextObjectId() {
  objectIdCounter += 1;
  return `64b7f2a1c3d4e5f6${String(objectIdCounter).padStart(8, "0")}`;
}

/** `await findOne(...)` 와 `await findOne(...).lean()` 을 둘 다 지원해야 한다(라우트가 양쪽을 쓴다). */
function thenableWithLean(value) {
  const promise = Promise.resolve(value);
  promise.lean = () => Promise.resolve(value == null ? value : structuredClone(value));
  promise.select = () => promise; promise.sort = () => promise;
  return promise;
}

/** updateOne 필터에 쓰이는 최소 연산자만 구현한다($or / $ne / $lt). */
function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([field, condition]) => {
    if (field === "$and") return condition.every((sub) => matchesFilter(doc, sub));
    if (field === "$or") return condition.some((sub) => matchesFilter(doc, sub));
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      if ("$ne" in condition) return doc[field] !== condition.$ne;
      if ("$lt" in condition) return new Date(doc[field]).getTime() < new Date(condition.$lt).getTime();
      if ("$in" in condition) return condition.$in.includes(doc[field]);
      if ("$nin" in condition) return !condition.$nin.includes(doc[field]);
    }
    return String(doc[field]) === String(condition);
  });
}

function applySet(target, values) {
  for (const [path, value] of Object.entries(values)) {
    const keys = path.split('.'); const last = keys.pop(); let at = target;
    for (const key of keys) at = at[key] ||= {};
    at[last] = structuredClone(value);
  }
}
function createConsultationStore() {
  const docs = [];
  return {
    docs,
    seed(doc) {
      const now = new Date();
      const stored = { _id: nextObjectId(), createdAt: now, updatedAt: now, ...doc };
      docs.push(stored);
      return stored;
    },
    findByKey(userId, idempotencyKey) {
      return docs.find((d) => String(d.userId) === String(userId) && d.idempotencyKey === idempotencyKey);
    },
    model: {
      findOne(query) {
        return thenableWithLean(docs.find((d) => matchesFilter(d, query)) || null);
      },
      async create(fields) {
        // 실제 unique index {userId, idempotencyKey} 를 흉내낸다 — 11000 경로가 이 테스트의 핵심 중 하나다.
        const clash = docs.find(
          (d) => String(d.userId) === String(fields.userId) && d.idempotencyKey === fields.idempotencyKey,
        );
        if (clash) throw Object.assign(new Error("duplicate key"), { code: 11000 });
        const now = new Date();
        const stored = { _id: nextObjectId(), createdAt: now, updatedAt: now, ...fields };
        docs.push(stored);
        return stored;
      },
      async updateOne(filter, update) {
        const target = docs.find((d) => matchesFilter(d, filter));
        if (!target) return { matchedCount: 0, modifiedCount: 0 };
        applySet(target, update.$set); target.updatedAt = update.$set?.updatedAt || new Date();
        return { matchedCount: 1, modifiedCount: 1 };
      },
      findOneAndUpdate(filter, update) {
        if (storageFault && update.$set?.status === storageFault.status) {
          const fault = storageFault;
          storageFault = null;
          if (fault.kind === "null") return thenableWithLean(null);
          return { lean: async () => { throw new Error("mock storage failure"); } };
        }
        const target = docs.find((d) => matchesFilter(d, filter));
        if (target) { applySet(target, update.$set); target.updatedAt = new Date(); }
        return thenableWithLean(target || null);
      },
      find(query) {
        findCallArgs.push(query);
        // R10 정산 크론 질의($exists·점 경로)는 sift 로 본다. 나머지는 기존 최소 매처 그대로.
        // structuredClone 이 만든 Date 는 바깥 realm 이라 sift 비교가 빗나간다 — 이 realm 의 Date 로 다시 만든 사본으로 본다.
        const local = (v) => Object.prototype.toString.call(v) === "[object Date]" ? new Date(v.getTime()) : Array.isArray(v) ? v.map(local) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, local(x)])) : v;
        const rows = docs.filter(JSON.stringify(query).includes("llmMeta") ? (d) => sift(query)(local(d)) : (d) => matchesFilter(d, query));
        const chain = {
          sort: () => chain,
          limit: () => chain,
          select: () => chain,
          lean: async () => rows,
        };
        return chain;
      },
    },
  };
}

function startRequest(idempotencyKey, overrides = {}) {
  return new Request("https://example.com/api/sukuyo-compatibility-ai/generate", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({ ...SAMPLE_BODY, ...overrides, idempotencyKey }),
  });
}

/** 그룹 5개가 각자 자기 키만 뽑아 가므로, 모든 섹션 키를 한 페이로드에 담아 두면 어느 그룹이든 통과한다. */
function buildSectionPayload(sectionKeys) {
  return JSON.stringify(Object.fromEntries(sectionKeys.map((key) => [key, { body: Array.from({ length: 32 }, (_, i) => `${key}의 ${i}번째 조건에서는 계산된 관계의 방향을 따라 두 사람의 선택과 감정 표현을 구체적으로 해석하고 현실에서 실천할 방법을 설명합니다.`).join("\n") }])));
}

async function waitFor(predicate, label) {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`waitFor timed out: ${label}`);
}

beforeAll(async () => {
  blockedFetch = jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_FETCH_BLOCKED"));
  store = createConsultationStore();
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
    getSwissMoonLongitudes: async (_env, moments) => moments.map(() => 120),
  }));

  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    requireAuth: jest.fn(async () => ({ userId: USER_ID, role: "user", authUserDoc: { role: "user" } })),
    isAuthDbInfraError: () => false,
    peekAccessTokenUserId: () => USER_ID,
  }));

  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => {}),
    withMongoRetry: async (_env, op) => op(),
    isTransientMongoError: () => false,
  }));

  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    canAccessPaidFeature: jest.fn(async () => ({ allowed: true, accessSource: "pass" })),
    PAID_FEATURE_ACCESS_USER_PROJECTION: "role",
  }));
  // 이용권 허용은 이번 키로 정산(차감)해야 열린다 — 정산이 같은 판정을 따르게 둔다.
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
    settlePerUseAccessDecision: jest.fn(async (_env, args) => ({ allowed: args?.decision?.allowed === true, source: "pass", reason: "" })),
  }));

  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    SukuyoCompatibilityAiConsultation: store.model,
    User: { findById: () => ({ select: () => ({ lean: async () => ({ role: "user" }) }) }) },
    PaidExecutionRecord: { findOneAndUpdate: jest.fn(async () => ({})), findOne: () => thenableWithLean(revokedAt === 0 ? { id: "revoked" } : null) },
    MonthlyCreditLedger: { find: () => ({ sort: () => ({ lean: async () => [] }) }), findOne: () => thenableWithLean(revokedAt === 3 ? { id: "revoked" } : null) },
    Payment: { findOne: query => thenableWithLean(revokedAt === 1 ? { id: "revoked" } : cardPayment && query?.paymentType === "digital_content" ? cardPayment : null), updateOne: jest.fn(async () => ({})) },
    PointHistory: { findOne: query => thenableWithLean(revokedAt === 2 ? { id: "revoked" } : paidMode === "paid" && query.kind === "deduct" ? { _id: "64b7f2a1c3d4e5f600000009", metadata: { accessType: "coin" } } : null), create: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) },
    ContentEntitlement: {},
    ServiceExecutionTransaction: {},
  }));

  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => paidMode === "subscription" ? { ledgerId: "64b7f2a1c3d4e5f600000008" } : null }));
  legacyRefund = jest.fn(async () => true); monthlyRefund = jest.fn(async () => true);
  passRefund = jest.fn(); cardRefund = jest.fn();
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({ refundPassUseEvidence: passRefund }));
  jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({ autoRefundSinglePaymentDeliveryFailure: cardRefund }));
  const actualEligibility = await import("../../worker/lib/sukuyo-refund-eligibility.js");
  jest.unstable_mockModule("../../worker/lib/sukuyo-refund-eligibility.js", () => ({ ...actualEligibility, canRestoreSukuyoDebit: async () => restoreAllowed }));
  jest.unstable_mockModule("../../worker/lib/sukuyo-legacy-refund.js", () => ({ restoreSukuyoLegacyRefund: legacyRefund }));
  jest.unstable_mockModule("../../worker/lib/sukuyo-monthly-refund.js", () => ({ restoreSukuyoMonthlyRefund: monthlyRefund }));

  jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({
    restoreMonthlyCreditLot: jest.fn(async () => ({ restored: false })),
  }));

  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({
    cmsPromptText: jest.fn(async (_env, _key, fallback) => fallback),
  }));

  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({
    createLlmCacheStore: () => null,
  }));

  // 🔴 gemini.js 가 아니라 structured-consultation.js 를 mock 한다.
  // callGeminiJsonWithRetry 는 내부에서 callGeminiText 를 1~2회 부르므로 gemini 레벨 카운트는
  // 6~12 로 비결정적이다. structured 레벨에서만 "그룹 5 + 요약 1 = 6" 이 결정적으로 나온다.
  callGeminiJsonWithRetryMock = jest.fn();
  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({
    callGeminiJsonWithRetry: callGeminiJsonWithRetryMock,
  }));

  callGeminiTextMock = jest.fn(async () => ({ ok: false, error: "not-called" }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: callGeminiTextMock }));

  const mod = await import("../../worker/routes/sukuyo-compatibility-ai.js");
  handleSukuyoCompatibilityAiRoutes = mod.handleSukuyoCompatibilityAiRoutes;
  testUtils = mod.__sukuyoCompatibilityAiTestUtils;
  settleDue = mod.settleDueSukuyoRetryRefunds; settleStuck = mod.settleStuckDelivery;
});

beforeEach(() => {
  storageFault = null; revokedAt = -1; paidMode = "pass"; restoreAllowed = true;
  store.docs.length = 0;
  findCallArgs = [];
  callGeminiJsonWithRetryMock.mockReset();
  callGeminiTextMock.mockReset();
  legacyRefund.mockClear(); monthlyRefund.mockClear();
  cardPayment = null; passRefund.mockReset(); passRefund.mockImplementation(async () => ({ refunded: false }));
  cardRefund.mockReset(); cardRefund.mockImplementation(async () => ({ refunded: true }));
  callGeminiTextMock.mockImplementation(async () => ({ ok: false, error: "not-called" }));
  testUtils.clearStartLocks();
});

function mockSectionsResolvedImmediately() {
  const text = buildSectionPayload(testUtils.SUKUYO_SECTION_SPECS.map((spec) => spec.key));
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({
    ok: true, provider: "gemini", model: "gemini-2.5-flash", text, truncated: false,
  }));
}


async function runWave() { return handleSukuyoCompatibilityAiRoutes(startRequest(KEY), ENV); }
const postSession = (path, sessionId) => handleSukuyoCompatibilityAiRoutes(new Request(`https://example.com/api/sukuyo-compatibility-ai${path}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: String(sessionId) }) }), ENV);
const claimHeld = () => [...globalThis.__cdBillingEvidenceClaims.values()].some(row => row.userId === USER_ID && row.requestId === KEY);
async function holdFailure() {
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: "gemini", text: buildSectionPayload([]) }));
  await runWave(); await runWave(); return runWave();
}
async function finishReport() { let response; for (let i = 0; i < 6; i++) response = await runWave(); return response; }
test("본문 다섯 묶음과 요약을 순차 저장하고 완료 때만 결과를 확정한다", async () => {
  mockSectionsResolvedImmediately();
  for (let i = 0; i < 6; i++) {
    const response = await runWave(); expect(response.status).toBe(i === 5 ? 200 : 202);
    expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(i + 1);
    expect(Object.keys(store.docs[0].llmMeta.sections)).toHaveLength(Math.min(i + 1, 5) * 3);
  }
  expect((await runWave()).status).toBe(200); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
});
for (const status of ["delivery_pending", "completed"]) for (const kind of ["null", "throw"]) test(`저장 ${status}/${kind}: 503 후 정상 묶음을 재사용한다`, async () => {
  mockSectionsResolvedImmediately(); for (let i = 0; i < 5; i++) await runWave();
  storageFault = { status, kind }; const failed = await runWave(); expect(failed.status).toBe(503);
  expect(await failed.json()).toMatchObject({ ok: false, retryable: true, reason: "RESULT_STORAGE_UNAVAILABLE" });
  const stored = store.docs[0]; expect(stored.status).not.toBe("completed"); expect(Object.keys(stored.llmMeta.sections)).toHaveLength(15);
  if (status === "delivery_pending") stored.updatedAt = new Date(Date.now() - testUtils.SUKUYO_COMPAT_AI_GENERATING_FRESH_MS - 1);
  expect((await runWave()).status).toBe(200); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
});
test("다른 isolate의 동시 요청도 한 묶음만 생성한다", async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  callGeminiJsonWithRetryMock.mockImplementation(async () => { await gate; return { ok: true, provider: "gemini", text: buildSectionPayload(testUtils.SUKUYO_SECTION_SPECS.map(spec => spec.key)) }; });
  const first = runWave(); await waitFor(() => callGeminiJsonWithRetryMock.mock.calls.length === 1, "generation begins"); testUtils.clearStartLocks();
  expect((await runWave()).status).toBe(202); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(1);
  release(); expect((await first).status).toBe(202);
});
test('기존 증빙 claim이 없는 과거 부분 상담도 같은 결제의 새 생성을 막는다', async () => {
  paidMode = 'paid'; mockSectionsResolvedImmediately();
  expect((await runWave()).status).toBe(202);
  const saved = structuredClone(store.docs[0].llmMeta.sections);
  globalThis.__cdBillingEvidenceClaims.clear();
  const before = callGeminiJsonWithRetryMock.mock.calls.length;
  const response = await handleSukuyoCompatibilityAiRoutes(startRequest(KEY + '-different'), ENV);
  expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ reason: 'EVIDENCE_ALREADY_USED' });
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(before);
  expect(store.docs).toHaveLength(1); expect(store.docs[0].llmMeta.sections).toEqual(saved);
});
test("짧은 결과는 세 번만 보완한 뒤 실패로 남긴다", async () => {
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: "gemini", text: buildSectionPayload([]) }));
  for (let i = 0; i < 2; i++) expect((await runWave()).status).toBe(202);
  expect((await runWave()).status).toBe(503); expect(store.docs[0].status).toBe("generation_failed");
  expect((await runWave()).status).toBe(409); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(2);
});
test.each(['paid', 'subscription'])('%s: 복원 자격을 확인할 수 없으면 차감 증빙을 다른 요청에 풀지 않는다', async mode => {
  paidMode = mode; restoreAllowed = false;
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: 'gemini', text: buildSectionPayload([]) }));
  await runWave(); await runWave(); const held = await runWave();
  // R10: 실패는 먼저 다시 시도로 보류된다. 환불 요청 때 복원 자격이 없으면 검토로 넘기고 증빙을 붙잡는다.
  expect(held.status).toBe(503); expect(await held.json()).toMatchObject({ reason: 'LLM_ERROR', retry: { available: true } });
  expect(await (await postSession('/refund-request', store.docs[0]._id)).json()).toMatchObject({ ok: true, refunded: false, refundStatus: 'review_required' });
  expect(legacyRefund).not.toHaveBeenCalled(); expect(monthlyRefund).not.toHaveBeenCalled();
  const claims = globalThis.__cdBillingEvidenceClaims;
  expect([...claims.values()].some(row => row.userId === USER_ID && row.requestId === KEY)).toBe(true);
  const replay = await runWave(); expect(replay.status).toBe(409);
  expect(await replay.json()).toMatchObject({ reason: 'REFUND_REVIEW_REQUIRED' });
});
test.each(['paid', 'subscription'])('%s: 복원 완료 뒤에는 해당 요청의 증빙을 정리한다', async mode => {
  paidMode = mode;
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: 'gemini', text: buildSectionPayload([]) }));
  await runWave(); await runWave(); expect((await runWave()).status).toBe(503);
  expect(legacyRefund).not.toHaveBeenCalled(); expect(monthlyRefund).not.toHaveBeenCalled(); expect(claimHeld()).toBe(true);
  expect(await (await postSession('/refund-request', store.docs[0]._id)).json()).toMatchObject({ refunded: true, refundStatus: 'refunded' });
  expect(mode === 'paid' ? legacyRefund : monthlyRefund).toHaveBeenCalledTimes(1);
  expect([...globalThis.__cdBillingEvidenceClaims.values()].some(row => row.userId === USER_ID && row.requestId === KEY)).toBe(false);
});
test('복원 응답을 확인하지 못하면 검토 상태와 원 증빙을 유지한다', async () => {
  paidMode = 'paid'; legacyRefund.mockRejectedValueOnce(new Error('response lost'));
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: 'gemini', text: buildSectionPayload([]) }));
  await runWave(); await runWave(); expect((await runWave()).status).toBe(503);
  expect(await (await postSession('/refund-request', store.docs[0]._id)).json()).toMatchObject({ refundStatus: 'review_required' });
  expect(store.docs[0].generationError.code).toBe('REFUND_REVIEW_REQUIRED');
  expect([...globalThis.__cdBillingEvidenceClaims.values()].some(row => row.userId === USER_ID && row.requestId === KEY)).toBe(true);
  expect(await (await runWave()).json()).toMatchObject({ reason: 'REFUND_REVIEW_REQUIRED' });
});
test.each(["pass", "paid", "subscription"])("%s: 저장된 본문이 있으면 재시도 소진 시 본문과 결제를 보존한다", async mode => {
  paidMode = mode;
  mockSectionsResolvedImmediately();
  expect((await runWave()).status).toBe(202);
  const saved = structuredClone(store.docs[0].llmMeta.sections);
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: "gemini", text: buildSectionPayload([]) }));
  expect((await runWave()).status).toBe(202);
  expect((await runWave()).status).toBe(202);
  const response = await runWave();
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({ status: "partial", retryable: false, reviewRequired: true });
  expect(store.docs[0].status).toBe("partial");
  expect(store.docs[0].llmMeta.sections).toEqual(saved);
  expect(store.docs[0].llmMeta.recoveryReviewRequired).toBe(true);
  const count = callGeminiJsonWithRetryMock.mock.calls.length;
  const replay = await runWave();
  expect(await replay.json()).toMatchObject({ status: "partial", reviewRequired: true });
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(count);
  expect(legacyRefund).not.toHaveBeenCalled();
  expect(monthlyRefund).not.toHaveBeenCalled();
});
test("예전 완료본은 현재 분량 검사나 추가 생성 없이 다시 읽는다", async () => {
  store.seed({ userId: USER_ID, idempotencyKey: KEY, personA: {}, personB: {}, sukuyoResult: {}, relationshipType: "연인", topic: "전체", accessType: "pass", messages: [{ role: "assistant", content: "과거 본문" }] });
  const response = await runWave(); expect(response.status).toBe(200); expect((await response.json()).consultation.messages[0].content).toBe("과거 본문"); expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});
test("서버 결과 ID만으로 원래 입력과 미완료 묶음을 재개한다", async () => {
  mockSectionsResolvedImmediately(); await runWave(); const row = store.docs[0];
  const response = await handleSukuyoCompatibilityAiRoutes(new Request("https://mock.test/api/sukuyo-compatibility-ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeSessionId: row._id }) }), ENV);
  expect(response.status).toBe(202); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(2); expect(row.idempotencyKey).toBe(KEY);
});
test("목록은 진행 중 ID를 별도로 제공하고 과거 완료 목록을 유지한다", async () => {
  mockSectionsResolvedImmediately(); await runWave();
  const response = await handleSukuyoCompatibilityAiRoutes(new Request("https://mock.test/api/sukuyo-compatibility-ai/result"), ENV);
  expect(response.status).toBe(200); expect((await response.json()).pendingSessionId).toBe(store.docs[0]._id);
  const { default: sift } = await import("sift");
  const visible = sift(findCallArgs[0]);
  const userId = findCallArgs[0].userId;
  expect(visible({ userId, status: "completed" })).toBe(true);
  expect(visible({ userId, messages: [{ role: "assistant", content: "과거 완성 본문" }] })).toBe(true);
  expect(visible({ userId, messages: [] })).toBe(false);
  for (const status of ["partial", "generating", "delivery_pending", "generation_failed", "refunded", "unknown"]) {
    expect(visible({ userId, status, messages: [{ role: "assistant", content: "미완성 본문" }] })).toBe(false);
  }
});

for (const mode of ["subscription", "paid"]) test(`${mode}: 원래 차감 증빙과 다섯 요청으로 완료한다`, async () => {
  paidMode = mode; mockSectionsResolvedImmediately(); const response = await finishReport();
  expect(response.status).toBe(200); expect(store.docs[0].accessType).toBe(mode); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
});
for (const index of [0, 1, 2, 3]) test(`취소·환불 저장소 ${index}은 재개 시 다시 확인한다`, async () => {
  mockSectionsResolvedImmediately(); await runWave(); revokedAt = index;
  expect((await runWave()).status).toBe(402); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(1); expect(store.docs[0].status).toBe("partial");
});

afterEach(() => { expect(blockedFetch).not.toHaveBeenCalled(); });
afterAll(() => { blockedFetch.mockRestore(); });

for (const [length, accepted] of [[1199, true], [1200, true], [1499, true]]) {
  test(`P3 preserves nonrepeating drafts of ${length}-character sections: ${accepted}`, async () => {
    const input = testUtils.normalizeInput(SAMPLE_BODY);
    const calculation = testUtils.calculateSukuyo(input);
    const group = testUtils.SUKUYO_SECTION_GROUPS[0];
    // 서로 다른 한글 문자로 공백 제외 경계를 정확히 만들며 반복 판정은 우회하지 않는다.
    const body = Array.from({ length: length - 1 }, (_, i) => String.fromCharCode(0xac00 + i)).join('') + '다';
    const payload = Object.fromEntries(group.keys.map(key => [key, { body: key + body.slice(key.length) }]));
    callGeminiJsonWithRetryMock.mockResolvedValue({ ok: true, provider: 'gemini', text: JSON.stringify(payload) });
    const result = await testUtils.generateSectionGroup({}, input, calculation, group, 'test', 2);
    expect(Object.keys(result.sections)).toHaveLength(accepted ? group.keys.length : 0);
    const [, prompt, options] = callGeminiJsonWithRetryMock.mock.calls[0];
    expect(prompt).toContain('1,500');
    expect(prompt).toContain('2,250');
    expect(options.attempts).toBe(1);
    expect(Math.min(options.baseTokens, options.capTokens)).toBeGreaterThanOrEqual(12375);
    expect(options.fallbackMinChars).toBe(1350);
  });
}
test('P2 still rejects repeated and empty sections', async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY);
  const calculation = testUtils.calculateSukuyo(input);
  const group = testUtils.SUKUYO_SECTION_GROUPS[0];
  const body = '계산 근거를 살펴보고 관계에서 자신의 속도를 차분히 돌아보며 구체적인 행동의 방향을 정리하는 것이 좋습니다. '.repeat(40);
  callGeminiJsonWithRetryMock.mockResolvedValue({ ok: true, provider: 'gemini', text: JSON.stringify({ [group.keys[0]]: { body }, [group.keys[1]]: { body: '' } }) });
  const result = await testUtils.generateSectionGroup({}, input, calculation, group, 'test', 2);
  expect(result.sections).toEqual({});
});

test('all saved usable sections complete below the length target', async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY);
  const calculation = testUtils.calculateSukuyo(input);
  const sections = Object.fromEntries(testUtils.SUKUYO_SECTION_SPECS.map((spec, index) => [spec.key, {
    title: spec.title, body: Array.from({ length: 1200 }, (_, i) => String.fromCharCode(0xac00 + (index * 1200 + i) % 11172)).join(''),
  }]));
  callGeminiJsonWithRetryMock.mockResolvedValue({ ok: false, error: 'provider_unavailable' });
  const summary = { headline: 'saved summary' };
  const result = await testUtils.createCompatibilityAnswer({}, input, calculation, { sections, summary });
  expect(result.complete).toBe(true);
  expect(Object.keys(result.sections)).toHaveLength(15);
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(0);
  const exhausted = Object.fromEntries(testUtils.SUKUYO_SECTION_GROUPS.map(group => [group.id, 3]));
  const final = await testUtils.createCompatibilityAnswer({}, input, calculation, { sections, summary, attempts: exhausted });
  expect(final.complete).toBe(true);
  expect(final.retryable).toBe(false);
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(0);
});

test('P2 generates missing groups before reinforcing valid short sections', async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY);
  const calculation = testUtils.calculateSukuyo(input);
  const sections = Object.fromEntries(testUtils.SUKUYO_SECTION_GROUPS[0].keys.map(key => [key, {
    body: Array.from({ length: 1200 }, (_, i) => String.fromCharCode(0xac00 + i)).join(''),
  }]));
  callGeminiJsonWithRetryMock.mockResolvedValue({ ok: false, error: 'provider_unavailable' });
  const onReserve = jest.fn();
  const result = await testUtils.createCompatibilityAnswer({}, input, calculation, { sections, summary: { headline: 'saved' }, attempts: { essence: 3 }, onReserve });
  expect(onReserve).toHaveBeenCalledWith('attraction', 1, false);
  expect(Object.keys(result.sections)).toHaveLength(3);
  expect(result.complete).toBe(false);
});
test('P2 doubles the section budget only for the retry after an unsalvageable truncated group', async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY), calculation = testUtils.calculateSukuyo(input), group = testUtils.SUKUYO_SECTION_GROUPS[0];
  callGeminiJsonWithRetryMock.mockResolvedValue({ ok: true, provider: 'gemini', truncated: true, finishReason: 'MAX_TOKENS', text: `{"${group.keys[0]}":{"body":"` });
  const onCheckpoint = jest.fn();
  const first = await testUtils.createCompatibilityAnswer({}, input, calculation, { onCheckpoint });
  expect(first.attempts[`${group.id}:truncated`]).toBe(1); expect(onCheckpoint).toHaveBeenCalledWith(expect.objectContaining({ truncatedGroup: group.id }));
  await testUtils.createCompatibilityAnswer({}, input, calculation, { sections: first.sections, attempts: first.attempts });
  const [initial, retry] = callGeminiJsonWithRetryMock.mock.calls.map(args => args[2]);
  expect(retry.baseTokens).toBe(Math.max(initial.baseTokens, Math.min(32768, initial.baseTokens * 2))); expect(retry.capTokens).toBeGreaterThanOrEqual(retry.baseTokens);
});
function p3SectionBody(key, size) { return key + Array.from({ length: size - key.length }, (_, i) => String.fromCharCode(0xac00 + i % 11172)).join(''); }

test('one saved item in each group cannot complete a fifteen-item purchase', async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY), calculation = testUtils.calculateSukuyo(input);
  const sections = Object.fromEntries(testUtils.SUKUYO_SECTION_GROUPS.map((group, index) => [group.keys[0], {
    body: p3SectionBody(`${group.keys[0]}-${index}`, 500),
  }]));
  const originals = structuredClone(sections);
  mockSectionsResolvedImmediately();
  const onReserve = jest.fn();
  const result = await testUtils.createCompatibilityAnswer({}, input, calculation, {
    sections, summary: { headline: 'saved' }, onReserve,
  });
  expect(result.complete).toBe(false);
  expect(result.retryable).toBe(true);
  expect(onReserve).toHaveBeenCalledWith(testUtils.SUKUYO_SECTION_GROUPS[0].id, 1, true);
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(1);
  expect(Object.keys(result.sections)).toHaveLength(7);
  for (const [key, row] of Object.entries(originals)) expect(result.sections[key]).toEqual(row);
});

test('exhausted incomplete groups fail without accepting five of fifteen items', async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY), calculation = testUtils.calculateSukuyo(input);
  const sections = Object.fromEntries(testUtils.SUKUYO_SECTION_GROUPS.map(group => [group.keys[0], {
    body: p3SectionBody(group.keys[0], 500),
  }]));
  const attempts = Object.fromEntries(testUtils.SUKUYO_SECTION_GROUPS.map(group => [group.id, 2]));
  await expect(testUtils.createCompatibilityAnswer({}, input, calculation, {
    sections, summary: { headline: 'saved' }, attempts,
  })).rejects.toMatchObject({ code: 'LLM_FAILED', status: 503 });
  expect(Object.keys(sections)).toHaveLength(5);
  expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});

test('a sub-minimum saved item is still missing while all other accepted items stay intact', async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY), calculation = testUtils.calculateSukuyo(input);
  const specs = testUtils.SUKUYO_SECTION_SPECS;
  const sections = Object.fromEntries(specs.map(spec => [spec.key, { body: p3SectionBody(spec.key, 500) }]));
  sections[specs[0].key] = { body: '초안' };
  const originals = structuredClone(sections);
  mockSectionsResolvedImmediately();
  const result = await testUtils.createCompatibilityAnswer({}, input, calculation, {
    sections, summary: { headline: 'saved' },
  });
  expect(result.complete).toBe(true);
  expect(result.retryable).toBe(false);
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(1);
  expect(result.sections[specs[0].key].body.length).toBeGreaterThanOrEqual(40);
  for (const spec of specs.slice(1)) expect(result.sections[spec.key]).toEqual(originals[spec.key]);
});

for (const repair of ['shorter', 'empty', 'truncated', 'repeat']) test(`P3 keeps valid short sections after ${repair} repair`, async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY), calculation = testUtils.calculateSukuyo(input);
  const specs = testUtils.SUKUYO_SECTION_SPECS, group = testUtils.SUKUYO_SECTION_GROUPS[0];
  const sections = Object.fromEntries(specs.map((spec, i) => [spec.key, { title: spec.title, body: p3SectionBody(spec.key, i ? 1600 : 500) }]));
  const body = repair === 'empty' ? '' : repair === 'repeat' ? sections[specs[1].key].body : p3SectionBody(specs[0].key, 400);
  callGeminiJsonWithRetryMock.mockResolvedValue({ ok: true, provider: 'gemini', truncated: repair === 'truncated', text: JSON.stringify({ [specs[0].key]: { body } }) });
  const onReserve = jest.fn();
  const result = await testUtils.createCompatibilityAnswer({}, input, calculation, { sections, summary: { headline: 'saved' }, attempts: { [group.id]: 1 }, onReserve });
  expect(result.complete).toBe(true); expect(result.sections[specs[0].key].body).toBe(sections[specs[0].key].body);
  expect(onReserve).not.toHaveBeenCalled(); expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});
test('P3 last short attempt completes without an additional call when total is sufficient', async () => {
 const input=testUtils.normalizeInput(SAMPLE_BODY),calculation=testUtils.calculateSukuyo(input);
 const sections=Object.fromEntries(testUtils.SUKUYO_SECTION_SPECS.map((spec,i)=>[spec.key,{title:spec.title,body:p3SectionBody(spec.key,i?1600:500)}]));
 const result=await testUtils.createCompatibilityAnswer({},input,calculation,{sections,summary:{headline:'saved'},attempts:{essence:3}});
 expect(result.complete).toBe(true);expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});
test('P3 clamps oversized bodies but cannot hide repetition after the ceiling or accept non-string bodies',async()=>{
 const input=testUtils.normalizeInput(SAMPLE_BODY),calculation=testUtils.calculateSukuyo(input),group=testUtils.SUKUYO_SECTION_GROUPS[0];
 const body=p3SectionBody(group.keys[0],4000);
 callGeminiJsonWithRetryMock.mockResolvedValue({ok:true,provider:'gemini',text:JSON.stringify({[group.keys[0]]:{body},[group.keys[1]]:{body:[body]},[group.keys[2]]:{body:`${body}.\n${body}.`}})});
 const result=await testUtils.generateSectionGroup({},input,calculation,group,'test');
 expect(Object.keys(result.sections)).toEqual([group.keys[0]]);expect(result.sections[group.keys[0]].body.length).toBe(2250);
});
// 2026-10-15: 숙요 궁합 전문가 상담은 서한비 페르소나를 구조화 출력 지시 뒤에 붙인다.
test("본문 묶음 생성은 서한비 페르소나를 시스템 프롬프트 끝에 붙인다", async () => {
  mockSectionsResolvedImmediately();
  await runWave();
  const systemPrompt = String(callGeminiJsonWithRetryMock.mock.calls[0][2].systemPrompt);
  expect(systemPrompt).toMatch(/\[상담자 페르소나 — 서한비\][\s\S]*$/u);
  expect(systemPrompt).not.toMatch(/\d+년 경력/u);
});

// ── 판 2(llmMeta.groupPlanVersion = 2) 집중 테스트 — V2_ENV 로 돈다 ──
// 묶음은 mock 에 들어온 responseSchema 키로 알아본다.
const v2GroupKeys = (call) => Object.keys(call[2]?.responseSchema?.properties || {});
function v2Payload(keys, lines = 32, extra = "") {
  return JSON.stringify(Object.fromEntries(keys.map((key) => [key, { body: Array.from({ length: lines }, (_, i) => `${key}의 ${i}번째 조건에서는 계산된 관계의 방향을 따라 두 사람의 선택과 감정 표현을 구체적으로 해석하고 현실에서 실천할 방법을 설명합니다.`).join("\n") + extra }])));
}
const ALL_KEYS = () => testUtils.SUKUYO_SECTION_SPECS.map(spec => spec.key);
const V2_SUMMARY_TEXT = JSON.stringify({ headline: "서로의 속도를 맞춰 가는 인연입니다.", insight: "두 분의 별은 서로 다른 자리에서 관계를 받칩니다.", scoreNotes: { trust: "신뢰는 천천히 쌓입니다." } });
/** 요약 스키마(headline)면 요약 JSON, 아니면 sectionText(keys) 를 돌려준다. */
const v2Mock = (sectionText) => async (_env, _prompt, options) => {
  const keys = Object.keys(options?.responseSchema?.properties || {});
  return { ok: true, provider: "gemini", text: keys.includes("headline") ? V2_SUMMARY_TEXT : sectionText(keys) };
};
async function runV2() { return handleSukuyoCompatibilityAiRoutes(startRequest(KEY), V2_ENV); }
const V2_GROUP_IDS = ["nature", "attraction", "flow", "karma", "outlook"];
const V2_FIRST_KEYS = ["twoStars", "overview", "evidence_basis"];

test("판 2: 새 상담은 groupPlanVersion 2로 시작하고 질문은 첫 묶음 프롬프트에만 들어간다", async () => {
  callGeminiJsonWithRetryMock.mockImplementation(v2Mock(() => v2Payload(ALL_KEYS())));
  let response;
  for (let i = 0; i < 6; i++) response = await runV2();
  expect(response.status).toBe(200);
  const doc = store.docs[0];
  expect(doc.llmMeta.groupPlanVersion).toBe(2);
  expect(doc.status).toBe("completed");
  const calls = callGeminiJsonWithRetryMock.mock.calls;
  expect(calls).toHaveLength(6);
  expect(v2GroupKeys(calls[0])).toEqual(V2_FIRST_KEYS);
  expect(calls.slice(0, 5).map(call => v2GroupKeys(call)[0])).toEqual(["twoStars", "attraction", "energyFlow", "karma", "domains"]);
  expect(calls[0][1]).toContain(SAMPLE_BODY.question);
  for (const call of calls.slice(1)) expect(call[1]).not.toContain(SAMPLE_BODY.question);
  expect(Object.keys(doc.llmMeta.sections).slice(0, 3)).toEqual(V2_FIRST_KEYS);
  expect(JSON.parse(doc.messages[1].content).planVersion).toBe(2);
});

test("판 2: 끄는 스위치가 false면 새 상담도 판 1로 시작한다", async () => {
  mockSectionsResolvedImmediately();
  await runWave();
  expect(store.docs[0].llmMeta.groupPlanVersion).toBeUndefined();
  expect(v2GroupKeys(callGeminiJsonWithRetryMock.mock.calls[0])).not.toEqual(V2_FIRST_KEYS);
});

test("판 2: 시도를 다 쓴 묶음은 건너뛰고 배달한다(환불·검토 보류 없음)", async () => {
  paidMode = "paid";
  callGeminiJsonWithRetryMock.mockImplementation(v2Mock(keys => keys[0] === "attraction" ? v2Payload([]) : v2Payload(ALL_KEYS())));
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await runV2()).status);
  expect(statuses).toEqual([202, 202, 202, 202, 202, 202, 202, 200]);
  const doc = store.docs[0];
  expect(doc.status).toBe("completed");
  expect(doc.llmMeta.recoveryReviewRequired).toBeUndefined();
  expect(doc.llmMeta.attempts.attraction).toBe(3);
  expect(doc.llmMeta.attempts["attraction:skipped"]).toBe(3);
  for (const key of ["attraction", "emotionalDirection", "communication"]) expect(doc.llmMeta.sections[key]).toBeUndefined();
  expect(Object.keys(doc.llmMeta.sections)).toHaveLength(12);
  expect(legacyRefund).not.toHaveBeenCalled(); expect(monthlyRefund).not.toHaveBeenCalled();
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(8);
});

test("판 2: 분량 보완은 상담 전체에서 2번까지만 하고 짧아도 배달한다", async () => {
  callGeminiJsonWithRetryMock.mockImplementation(v2Mock(() => v2Payload(ALL_KEYS(), 8)));
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await runV2()).status);
  expect(statuses.at(-1)).toBe(200);
  const doc = store.docs[0];
  expect(doc.status).toBe("completed");
  expect(doc.llmMeta.attempts.lengthRepairs).toBe(2);
  expect(doc.llmMeta.attempts.nature).toBe(3);
  for (const id of V2_GROUP_IDS.slice(1)) expect(doc.llmMeta.attempts[id]).toBe(1);
  expect(Object.keys(doc.llmMeta.sections)).toHaveLength(15);
  const calls = callGeminiJsonWithRetryMock.mock.calls;
  expect(calls).toHaveLength(8);
  expect(calls[1][1]).toContain("[보정]");
  expect(calls[1][1]).toContain("분량이 모자랐습니다");
});

test("판 2: 말투 이탈 보정은 묶음마다 한 번만 하고 걸린 문장을 걷어 낸다", async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY), calculation = await testUtils.calculateSukuyo(input);
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: "gemini", text: v2Payload(ALL_KEYS(), 32, "\n찻잔을 내려놓고 이야기를 이어 갑니다.") }));
  let state = {};
  for (let i = 0; i < 3; i++) {
    state = await testUtils.createCompatibilityAnswerV2({}, input, calculation, { sections: state.sections, attempts: state.attempts });
  }
  const calls = callGeminiJsonWithRetryMock.mock.calls;
  expect(calls.map(call => v2GroupKeys(call)[0])).toEqual(["twoStars", "twoStars", "attraction"]);
  expect(calls[0][1]).not.toContain("[보정]");
  expect(calls[1][1]).toContain("[보정]");
  expect(calls[1][1]).toContain("말투에서 벗어났습니다");
  expect(state.attempts["nature:softRepair"]).toBe(1);
  expect(state.attempts["nature:settled"]).toBe(1);
  expect(state.attempts.nature).toBe(2);
  for (const key of V2_FIRST_KEYS) {
    expect(state.sections[key].body.length).toBeGreaterThan(1000);
    expect(state.sections[key].body).not.toContain("찻잔");
  }
});

test("판 2: 요약이 두 번 실패하면 확정 점수로 만든 요약으로 완료한다", async () => {
  const input = testUtils.normalizeInput(SAMPLE_BODY), calculation = await testUtils.calculateSukuyo(input);
  const sections = JSON.parse(v2Payload(ALL_KEYS()));
  const attempts = Object.fromEntries(V2_GROUP_IDS.flatMap(id => [[id, 1], [`${id}:settled`, 1]]));
  callGeminiJsonWithRetryMock.mockResolvedValue({ ok: false, error: "provider_unavailable" });
  const first = await testUtils.createCompatibilityAnswerV2({}, input, calculation, { sections, attempts });
  expect(first.complete).toBe(false); expect(first.retryable).toBe(true);
  expect(first.attempts.summary).toBe(1); expect(first.attempts["summary:fallback"]).toBeUndefined();
  const second = await testUtils.createCompatibilityAnswerV2({}, input, calculation, { sections, attempts: first.attempts });
  expect(second.complete).toBe(true);
  expect(second.attempts.summary).toBe(2); expect(second.attempts["summary:fallback"]).toBe(1);
  const content = JSON.parse(second.content);
  expect(content.headline).toEqual(expect.any(String)); expect(content.headline.length).toBeGreaterThan(0);
  expect(content.insight).toEqual(expect.any(String));
  expect(Object.keys(content.scoreNotes).length).toBeGreaterThan(0);
  expect(content.fallback).toBeUndefined();
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(2);
  expect(callGeminiJsonWithRetryMock.mock.calls[1][2].cache).toBeUndefined();
});

test("판 2: 모든 묶음이 비었을 때만 실패로 확정하고 환불한다", async () => {
  paidMode = "paid";
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: "gemini", text: v2Payload([]) }));
  const statuses = [];
  for (let i = 0; i < 15; i++) statuses.push((await runV2()).status);
  expect(statuses.slice(0, 14).every(status => status === 202)).toBe(true);
  expect(statuses[14]).toBe(503);
  const doc = store.docs[0];
  expect(doc.status).toBe("generation_failed");
  expect(doc.llmMeta.recoveryReviewRequired).toBeUndefined();
  // R10: 환불은 다시 시도 보류 뒤 환불 요청(또는 7일 창 만료) 때 한 번.
  expect(legacyRefund).not.toHaveBeenCalled();
  expect(await (await postSession("/refund-request", doc._id)).json()).toMatchObject({ refunded: true, refundStatus: "refunded" });
  expect(legacyRefund).toHaveBeenCalledTimes(1);
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(15);
  expect((await runV2()).status).toBe(409); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(15);
});

describe("R10 다시 시도 우선(2026-11-20)", () => {
  const card = () => ({ _id: "64b7f2a1c3d4e5f60000000a", userId: USER_ID, featureKey: "sukuyo-compatibility-ai", paymentType: "digital_content", status: "paid", merchantUid: KEY });
  test("본문 없이 실패하면 환불 없이 보류하고 /retry 로 추가 차감 없이 완성한다", async () => {
    const held = await holdFailure(); const body = await held.json(); const doc = store.docs[0];
    expect(held.status).toBe(503);
    expect(body).toMatchObject({ ok: false, reason: "LLM_ERROR", refunded: false, sessionId: String(doc._id), retry: { available: true, sessionId: String(doc._id) } });
    expect(body.retryable).toBeUndefined();
    expect(new Date(body.retry.refundAt).getTime()).toBe(new Date(doc.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(passRefund).not.toHaveBeenCalled(); expect(cardRefund).not.toHaveBeenCalled();
    const result = await handleSukuyoCompatibilityAiRoutes(new Request("https://example.com/api/sukuyo-compatibility-ai/result?id=" + doc._id, { method: "GET" }), ENV);
    expect(result.status).toBe(503); expect(await result.json()).toMatchObject({ retry: { available: true } });
    mockSectionsResolvedImmediately();
    expect((await postSession("/retry", doc._id)).status).toBe(202);
    let last; for (let i = 0; i < 6 && last?.status !== 200; i++) last = await runWave();
    expect(last.status).toBe(200); expect(store.docs[0].status).toBe("completed");
    expect(passRefund).not.toHaveBeenCalled(); expect(cardRefund).not.toHaveBeenCalled();
  });
  test("환불 요청은 이용권을 한 번만 되돌리고 다시 시도를 닫는다", async () => {
    passRefund.mockImplementation(async () => ({ refunded: true }));
    await holdFailure(); const id = store.docs[0]._id;
    expect(await (await postSession("/refund-request", id)).json()).toMatchObject({ ok: true, refunded: true, refundStatus: "refunded" });
    expect(await (await postSession("/refund-request", id)).json()).toMatchObject({ refundStatus: "refunded" });
    expect(passRefund).toHaveBeenCalledTimes(1); expect(passRefund.mock.calls[0][0]).toMatchObject({ requestId: KEY });
    expect(cardRefund).not.toHaveBeenCalled();
    expect(await (await postSession("/retry", id)).json()).toMatchObject({ ok: false, reason: "REFUND_STARTED" });
  });
  test("요청 키로 증명된 카드 단건은 이용권 복원이 없을 때 카드로 한 번 환불한다", async () => {
    cardPayment = card();
    await holdFailure();
    expect(await (await postSession("/refund-request", store.docs[0]._id)).json()).toMatchObject({ refunded: true, refundStatus: "refunded" });
    expect(cardRefund).toHaveBeenCalledTimes(1); expect(cardRefund.mock.calls[0][1]).toEqual(cardPayment);
  });
  test("이용권이 복원되면 같은 요청의 카드는 다시 환불하지 않는다", async () => {
    cardPayment = card(); passRefund.mockImplementation(async () => ({ refunded: true }));
    await holdFailure();
    expect(await (await postSession("/refund-request", store.docs[0]._id)).json()).toMatchObject({ refunded: true });
    expect(passRefund).toHaveBeenCalledTimes(1); expect(cardRefund).not.toHaveBeenCalled();
  });
  test("카드 환불 실패는 정산 표시 없이 남기고 크론이 다시 정산한다", async () => {
    cardPayment = card();
    cardRefund.mockImplementationOnce(async () => ({ refunded: false, refundFailed: true, reason: "pg down" }));
    await holdFailure();
    expect(await (await postSession("/refund-request", store.docs[0]._id)).json()).toMatchObject({ refunded: false, refundStatus: "failed" });
    expect(store.docs[0].llmMeta.retryable.refundSettledAt).toBeUndefined();
    expect(await settleDue(ENV, { model: store.model })).toEqual([{ service: "sukuyo-compatibility-ai", refundStatus: "refunded" }]);
    expect(cardRefund).toHaveBeenCalledTimes(2);
  });
  test("7일 창이 지나면 크론이 보류를 닫고 자동 환불한다", async () => {
    passRefund.mockImplementation(async () => ({ refunded: true }));
    await holdFailure();
    expect(await settleDue(ENV, { model: store.model })).toEqual([]);
    expect(passRefund).not.toHaveBeenCalled();
    const later = Date.now() + 8 * 24 * 60 * 60 * 1000;
    expect(await settleDue(ENV, { model: store.model, now: later })).toEqual([{ service: "sukuyo-compatibility-ai", refundStatus: "refunded" }]);
    expect(store.docs[0].generationError.code).toBe("RETRY_WINDOW_EXPIRED"); expect(passRefund).toHaveBeenCalledTimes(1);
  });
});

describe("판 2 개인 상담", () => {
  const personal = () => { const input = testUtils.normalizeInput({ ...SAMPLE_BODY, consultationType: "personal" }); return testUtils.calculateSukuyo(input).then(calculation => ({ input, calculation })); };
  test("짧아도 비지 않은 글은 받고, 첫 호출이 빈손이면 캐시 없이 한 번 더 부른다", async () => {
    const { input, calculation } = await personal();
    callGeminiTextMock.mockResolvedValueOnce({ ok: true, provider: "gemini", text: "" })
      .mockResolvedValueOnce({ ok: true, provider: "gemini", model: "gemini-2.5-flash", text: "두 분의 별은 서로 다른 속도로 빛납니다." });
    const result = await testUtils.createPersonalAnswer({}, input, calculation, { planVersion: 2 });
    expect(result.content).toContain("서로 다른 속도");
    expect(callGeminiTextMock).toHaveBeenCalledTimes(2);
    expect(callGeminiTextMock.mock.calls[1][2].cache).toBeUndefined();
  });
  test("두 번 다 비면 LLM_FAILED로 던진다(호출부가 환불)", async () => {
    const { input, calculation } = await personal();
    callGeminiTextMock.mockResolvedValue({ ok: true, provider: "gemini", text: "   " });
    await expect(testUtils.createPersonalAnswer({}, input, calculation, { planVersion: 2 })).rejects.toMatchObject({ code: "LLM_FAILED", status: 503 });
    expect(callGeminiTextMock).toHaveBeenCalledTimes(2);
  });
  test("판 1은 같은 짧은 글을 받지 않는다(240자 하한 그대로)", async () => {
    const { input, calculation } = await personal();
    callGeminiTextMock.mockResolvedValue({ ok: true, provider: "gemini", text: "두 분의 별은 서로 다른 속도로 빛납니다." });
    await expect(testUtils.createPersonalAnswer({}, input, calculation)).rejects.toBeTruthy();
    expect(callGeminiTextMock).toHaveBeenCalledTimes(1);
  });
});

// 2026-11-22 D: 복구 크론의 정체 확정. 창 안은 다시 시도 가능(묶음 보존·환불 없음), 창이 지나면 기존 보류 환불(settleSukuyoRetryRefund).
describe("settleStuckDelivery", () => {
  const stuckDoc = () => ({ _id: store.docs[0]._id, userId: store.docs[0].userId });
  const quiet = async work => { const warn = jest.spyOn(console, "warn").mockImplementation(() => {}); try { return await work(); } finally { warn.mockRestore(); } };
  const saved = () => JSON.parse(JSON.stringify({ messages: store.docs[0].messages, sections: store.docs[0].llmMeta?.sections, raw: store.docs[0].llmMeta?.rawResponses }));
  async function stalled() { mockSectionsResolvedImmediately(); expect((await runWave()).status).toBe(202); store.docs[0].updatedAt = new Date(Date.now() - 300000); return saved(); }
  test("멈춘 이용권 상담은 저장된 묶음을 지킨 채 다시 시도 가능으로 두고 환불하지 않는다", async () => {
    const before = await stalled(); expect(JSON.stringify(before).length).toBeGreaterThan(200);
    expect((await quiet(() => settleStuck(ENV, { doc: stuckDoc(), now: Date.now() }))).outcome).toBe("retryable");
    expect(store.docs[0]).toMatchObject({ status: "generation_failed", generationError: { code: "DELIVERY_STUCK" }, llmMeta: { retryable: { access: { accessType: "pass" } } } });
    expect(saved()).toEqual(before);
    expect(passRefund).not.toHaveBeenCalled(); expect(cardRefund).not.toHaveBeenCalled();
    expect((await postSession("/retry", store.docs[0]._id)).status).toBe(202);
  });
  test("창이 지난 정체는 기존 보류 환불로 한 번만 정산한다", async () => {
    passRefund.mockImplementation(async () => ({ refunded: true }));
    await stalled();
    expect(await quiet(() => settleStuck(ENV, { doc: stuckDoc(), now: Date.now() + 8 * 86400000 }))).toEqual({ outcome: "generation_failed", refundStatus: "refunded" });
    expect(passRefund).toHaveBeenCalledTimes(1); expect(passRefund.mock.calls[0][0]).toMatchObject({ requestId: KEY });
    await settleDue(ENV, { model: store.model, now: Date.now() + 8 * 86400000 }); expect(passRefund).toHaveBeenCalledTimes(1);
  });
  test("살아 있는 생성·토스 네이티브·증빙 없는 선결제·완료본은 건드리지 않는다", async () => {
    mockSectionsResolvedImmediately(); expect((await runWave()).status).toBe(202);
    expect((await settleStuck(ENV, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("leased");
    store.docs[0].updatedAt = new Date(Date.now() - 300000); store.docs[0].accessSource = "toss";
    expect((await quiet(() => settleStuck(ENV, { doc: stuckDoc(), now: Date.now() }))).outcome).toBe("unsettled");
    store.docs[0].accessSource = ""; store.docs[0].accessType = "subscription";
    expect((await settleStuck(ENV, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("pending");
    store.docs[0].status = "completed";
    expect((await settleStuck(ENV, { doc: stuckDoc(), now: Date.now() })).outcome).toBe("progressed");
    expect(passRefund).not.toHaveBeenCalled(); expect(cardRefund).not.toHaveBeenCalled();
  });
});
