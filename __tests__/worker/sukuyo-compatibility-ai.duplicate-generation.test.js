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

const USER_ID = "64b7f2a1c3d4e5f601234567";
const KEY = "sukuyo-ai-duplicate-window-test";
const ENV = { GEMINIF_API_KEY: "test-key" };

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
        const rows = docs.filter((d) => matchesFilter(d, query));
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

  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    SukuyoCompatibilityAiConsultation: store.model,
    User: { findById: () => ({ select: () => ({ lean: async () => ({ role: "user" }) }) }) },
    PaidExecutionRecord: { findOneAndUpdate: jest.fn(async () => ({})), findOne: () => thenableWithLean(revokedAt === 0 ? { id: "revoked" } : null) },
    MonthlyCreditLedger: { find: () => ({ sort: () => ({ lean: async () => [] }) }), findOne: () => thenableWithLean(revokedAt === 3 ? { id: "revoked" } : null) },
    Payment: { findOne: () => thenableWithLean(revokedAt === 1 ? { id: "revoked" } : null), updateOne: jest.fn(async () => ({})) },
    PointHistory: { findOne: query => thenableWithLean(revokedAt === 2 ? { id: "revoked" } : paidMode === "paid" && query.kind === "deduct" ? { _id: "64b7f2a1c3d4e5f600000009", metadata: { accessType: "coin" } } : null), create: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) },
  }));

  jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => paidMode === "subscription" ? { ledgerId: "64b7f2a1c3d4e5f600000008" } : null }));

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
});

beforeEach(() => {
  storageFault = null; revokedAt = -1; paidMode = "pass";
  store.docs.length = 0;
  findCallArgs = [];
  callGeminiJsonWithRetryMock.mockReset();
  callGeminiTextMock.mockReset();
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
async function finishReport() { let response; for (let i = 0; i < 5; i++) response = await runWave(); return response; }
test("다섯 요청에 한 묶음씩 저장하고 완료 때만 결과를 확정한다", async () => {
  mockSectionsResolvedImmediately();
  for (let i = 0; i < 5; i++) {
    const response = await runWave(); expect(response.status).toBe(i === 4 ? 200 : 202);
    expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(i + 2);
    expect(Object.keys(store.docs[0].llmMeta.sections)).toHaveLength((i + 1) * 3);
  }
  expect((await runWave()).status).toBe(200); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
});
for (const status of ["delivery_pending", "completed"]) for (const kind of ["null", "throw"]) test(`저장 ${status}/${kind}: 503 후 정상 묶음을 재사용한다`, async () => {
  mockSectionsResolvedImmediately(); for (let i = 0; i < 4; i++) await runWave();
  storageFault = { status, kind }; const failed = await runWave(); expect(failed.status).toBe(503);
  expect(await failed.json()).toMatchObject({ ok: false, retryable: true, reason: "RESULT_STORAGE_UNAVAILABLE" });
  const stored = store.docs[0]; expect(stored.status).not.toBe("completed"); expect(Object.keys(stored.llmMeta.sections)).toHaveLength(15);
  if (status === "delivery_pending") stored.updatedAt = new Date(Date.now() - testUtils.SUKUYO_COMPAT_AI_GENERATING_FRESH_MS - 1);
  expect((await runWave()).status).toBe(200); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
});
test("다른 isolate의 동시 요청도 한 묶음만 생성한다", async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  callGeminiJsonWithRetryMock.mockImplementation(async () => { await gate; return { ok: true, provider: "gemini", text: buildSectionPayload(testUtils.SUKUYO_SECTION_SPECS.map(spec => spec.key)) }; });
  const first = runWave(); await waitFor(() => callGeminiJsonWithRetryMock.mock.calls.length === 2, "generation begins"); testUtils.clearStartLocks();
  expect((await runWave()).status).toBe(202); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(2);
  release(); expect((await first).status).toBe(202);
});
test("짧은 결과는 세 번만 보완한 뒤 실패로 남긴다", async () => {
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: true, provider: "gemini", text: buildSectionPayload([]) }));
  for (let i = 0; i < 3; i++) expect((await runWave()).status).toBe(202);
  expect((await runWave()).status).toBe(503); expect(store.docs[0].status).toBe("generation_failed");
  expect((await runWave()).status).toBe(409); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(4);
});
test("예전 완료본은 현재 분량 검사나 추가 생성 없이 다시 읽는다", async () => {
  store.seed({ userId: USER_ID, idempotencyKey: KEY, personA: {}, personB: {}, sukuyoResult: {}, relationshipType: "연인", topic: "전체", accessType: "pass", messages: [{ role: "assistant", content: "과거 본문" }] });
  const response = await runWave(); expect(response.status).toBe(200); expect((await response.json()).consultation.messages[0].content).toBe("과거 본문"); expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});
test("서버 결과 ID만으로 원래 입력과 미완료 묶음을 재개한다", async () => {
  mockSectionsResolvedImmediately(); await runWave(); const row = store.docs[0];
  const response = await handleSukuyoCompatibilityAiRoutes(new Request("https://mock.test/api/sukuyo-compatibility-ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeSessionId: row._id }) }), ENV);
  expect(response.status).toBe(202); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(3); expect(row.idempotencyKey).toBe(KEY);
});
test("목록은 진행 중 ID를 별도로 제공하고 과거 완료 목록을 유지한다", async () => {
  mockSectionsResolvedImmediately(); await runWave();
  const response = await handleSukuyoCompatibilityAiRoutes(new Request("https://mock.test/api/sukuyo-compatibility-ai/result"), ENV);
  expect(response.status).toBe(200); expect((await response.json()).pendingSessionId).toBe(store.docs[0]._id);
  expect(findCallArgs[0].status.$nin).toContain("partial");
});

for (const mode of ["subscription", "paid"]) test(`${mode}: 원래 차감 증빙과 다섯 요청으로 완료한다`, async () => {
  paidMode = mode; mockSectionsResolvedImmediately(); const response = await finishReport();
  expect(response.status).toBe(200); expect(store.docs[0].accessType).toBe(mode); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
});
for (const index of [0, 1, 2, 3]) test(`취소·환불 저장소 ${index}은 재개 시 다시 확인한다`, async () => {
  mockSectionsResolvedImmediately(); await runWave(); revokedAt = index;
  expect((await runWave()).status).toBe(402); expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(2); expect(store.docs[0].status).toBe("partial");
});

afterEach(() => { expect(blockedFetch).not.toHaveBeenCalled(); });
afterAll(() => { blockedFetch.mockRestore(); });
