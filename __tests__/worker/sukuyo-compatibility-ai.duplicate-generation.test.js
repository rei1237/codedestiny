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

/** 24-hex ObjectId 모양. 라우트가 /^[0-9a-f]{24}$/ 로 검사한다. */
let objectIdCounter = 0;
function nextObjectId() {
  objectIdCounter += 1;
  return `64b7f2a1c3d4e5f6${String(objectIdCounter).padStart(8, "0")}`;
}

/** `await findOne(...)` 와 `await findOne(...).lean()` 을 둘 다 지원해야 한다(라우트가 양쪽을 쓴다). */
function thenableWithLean(value) {
  const promise = Promise.resolve(value);
  promise.lean = () => Promise.resolve(value);
  return promise;
}

/** updateOne 필터에 쓰이는 최소 연산자만 구현한다($or / $ne / $lt). */
function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([field, condition]) => {
    if (field === "$or") return condition.some((sub) => matchesFilter(doc, sub));
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      if ("$ne" in condition) return doc[field] !== condition.$ne;
      if ("$lt" in condition) return new Date(doc[field]).getTime() < new Date(condition.$lt).getTime();
      if ("$nin" in condition) return !condition.$nin.includes(doc[field]);
    }
    return String(doc[field]) === String(condition);
  });
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
        Object.assign(target, update.$set, { updatedAt: update.$set?.updatedAt || new Date() });
        return { matchedCount: 1, modifiedCount: 1 };
      },
      findOneAndUpdate(filter, update) {
        const target = docs.find((d) => matchesFilter(d, filter));
        if (target) Object.assign(target, update.$set, { updatedAt: new Date() });
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
  const body = "이 관계는 서로의 별자리가 만들어 내는 결이 분명해서, ".repeat(20);
  return JSON.stringify(Object.fromEntries(sectionKeys.map((key) => [key, { body }])));
}

async function waitFor(predicate, label) {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`waitFor timed out: ${label}`);
}

beforeAll(async () => {
  store = createConsultationStore();

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
    PaidExecutionRecord: { findOneAndUpdate: jest.fn(async () => ({})), findOne: () => thenableWithLean(null) },
    MonthlyCreditLedger: { find: () => ({ sort: () => ({ lean: async () => [] }) }), findOne: () => thenableWithLean(null) },
    Payment: { findOne: () => thenableWithLean(null), updateOne: jest.fn(async () => ({})) },
    PointHistory: { findOne: () => thenableWithLean(null), create: jest.fn(async () => ({})), updateOne: jest.fn(async () => ({})) },
  }));

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

test("생성 중 같은 idempotencyKey 로 두 번째 요청이 와도 LLM 호출은 6회를 넘지 않는다", async () => {
  const text = buildSectionPayload(testUtils.SUKUYO_SECTION_SPECS.map((spec) => spec.key));
  let releaseLlm;
  const llmGate = new Promise((resolve) => { releaseLlm = resolve; });
  // 🔴 즉시 resolve 하면 시드가 쓰이기 전에 생성이 끝나 중복 창 자체가 재현되지 않는다(오탐).
  callGeminiJsonWithRetryMock.mockImplementation(async () => {
    await llmGate;
    return { ok: true, provider: "gemini", model: "gemini-2.5-flash", text, truncated: false };
  });

  const first = handleSukuyoCompatibilityAiRoutes(startRequest(KEY), ENV);
  await waitFor(() => store.findByKey(USER_ID, KEY)?.status === "generating", "시드가 generating 으로 쓰이기");

  // 두 요청이 다른 isolate 에 떨어진 상황 — 인메모리 락이 두 번째를 먹지 않게 비운다.
  testUtils.clearStartLocks();
  const second = await handleSukuyoCompatibilityAiRoutes(startRequest(KEY), ENV);

  expect(second.status).toBe(202);
  const secondBody = await second.json();
  expect(secondBody.status).toBe("generating");
  expect(secondBody.sessionId).toMatch(/^[0-9a-f]{24}$/);
  // 빈 시드를 결과인 척 배달하지 않는다.
  expect(secondBody.consultation).toBeUndefined();

  // 이 스냅샷이 이 작업의 성공 조건 그 자체다 — 두 번째 요청이 호출을 한 건도 더하지 않았다.
  const callsAfterSecond = callGeminiJsonWithRetryMock.mock.calls.length;

  releaseLlm();
  const firstResponse = await first;
  expect(firstResponse.status).toBe(200);
  const firstBody = await firstResponse.json();
  expect(firstBody.consultation.messages).toHaveLength(2);
  expect(store.findByKey(USER_ID, KEY).status).toBe("completed");

  // 섹션 그룹 5 + 요약 1 = 6. 두 번째 요청이 뚫렸다면 12가 된다.
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
  expect(callsAfterSecond).toBe(callGeminiJsonWithRetryMock.mock.calls.length);
  expect(callGeminiTextMock).not.toHaveBeenCalled();
});

test("status 필드가 없던 옛 문서는 완료본으로 읽어 그대로 재사용한다", async () => {
  // 🔴 회귀 잠금: 이 분기가 깨지면 재-POST 가 결제된 상담을 빈 시드로 덮고 6회를 다시 태운다.
  mockSectionsResolvedImmediately();
  store.seed({
    userId: USER_ID,
    idempotencyKey: KEY,
    personA: { name: "나", birthDate: "1993-07-21", calendarType: "solar", shuku: "각" },
    personB: { name: "상대", birthDate: "1990-03-08", calendarType: "solar", shuku: "항" },
    sukuyoResult: { personAShuku: "각", personBShuku: "항", relationType: "안괴" },
    relationshipType: "연인",
    topic: "전체 궁합",
    accessType: "pass",
    messages: [
      { role: "user", content: "질문", createdAt: new Date() },
      { role: "assistant", content: "예전에 결제하고 받은 상담문", createdAt: new Date() },
    ],
    // status 없음 — 이 필드가 도입되기 전에 저장된 문서다.
  });

  const response = await handleSukuyoCompatibilityAiRoutes(startRequest(KEY), ENV);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.reused).toBe(true);
  expect(body.consultation.messages).toHaveLength(2);
  expect(body.consultation.status).toBe("completed");
  expect(store.findByKey(USER_ID, KEY).messages).toHaveLength(2);
  expect(callGeminiJsonWithRetryMock).not.toHaveBeenCalled();
});

test("신선도 창을 넘긴 generating 은 202 로 막지 않고 재생성한다", async () => {
  mockSectionsResolvedImmediately();
  const stale = new Date(Date.now() - testUtils.SUKUYO_COMPAT_AI_GENERATING_FRESH_MS - 1000);
  store.seed({
    userId: USER_ID, idempotencyKey: KEY, status: "generating", messages: [],
    personA: {}, personB: {}, sukuyoResult: {}, relationshipType: "연인", topic: "전체 궁합", accessType: "pass",
    createdAt: stale, updatedAt: stale,
  });

  const response = await handleSukuyoCompatibilityAiRoutes(startRequest(KEY), ENV);

  expect(response.status).toBe(200);
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
  expect(store.findByKey(USER_ID, KEY).status).toBe("completed");
});

test("generation_failed 문서는 재생성 대상이다", async () => {
  mockSectionsResolvedImmediately();
  store.seed({
    userId: USER_ID, idempotencyKey: KEY, status: "generation_failed", messages: [],
    generationError: { code: "LLM_FAILED", message: "앞선 실패" },
    personA: {}, personB: {}, sukuyoResult: {}, relationshipType: "연인", topic: "전체 궁합", accessType: "pass",
  });

  const response = await handleSukuyoCompatibilityAiRoutes(startRequest(KEY), ENV);

  expect(response.status).toBe(200);
  expect(callGeminiJsonWithRetryMock).toHaveBeenCalledTimes(6);
  expect(store.findByKey(USER_ID, KEY).status).toBe("completed");
});

test("생성이 실패하면 시드를 지우지 않고 generation_failed 로 뒤집는다", async () => {
  // 전 그룹이 빈손이면 totalChars < 600 이라 createCompatibilityAnswer 가 LLM_FAILED 를 던진다.
  callGeminiJsonWithRetryMock.mockImplementation(async () => ({ ok: false, error: "blocked" }));

  const response = await handleSukuyoCompatibilityAiRoutes(startRequest(KEY), ENV);

  expect(response.status).toBe(503);
  const stored = store.findByKey(USER_ID, KEY);
  // 지워지지 않는다 — 남아 있어야 다음 POST 가 202 에 막히지 않고 재생성으로 떨어진다.
  expect(stored).toBeDefined();
  expect(stored.status).toBe("generation_failed");
  expect(stored.generationError.code).toBe("LLM_FAILED");
});

test("목록은 시드와 실패본을 감추고 status 없는 옛 문서는 남긴다", async () => {
  const request = new Request("https://example.com/api/sukuyo-compatibility-ai/result", { method: "GET" });
  await handleSukuyoCompatibilityAiRoutes(request, ENV);

  expect(findCallArgs).toHaveLength(1);
  // $nin 은 필드가 없는 문서도 매칭하므로 옛 문서가 목록에 그대로 남는다.
  expect(findCallArgs[0].status).toEqual({ $nin: ["generating", "generation_failed"] });
});

test("생성 중인 상담에 후속 질문을 보내면 LLM 을 부르지 않고 409 로 막는다", async () => {
  const seeded = store.seed({
    userId: USER_ID, idempotencyKey: KEY, status: "generating", messages: [],
    personA: {}, personB: {}, sukuyoResult: {}, relationshipType: "연인", topic: "전체 궁합", accessType: "pass",
  });

  const response = await handleSukuyoCompatibilityAiRoutes(
    new Request("https://example.com/api/sukuyo-compatibility-ai/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: seeded._id, message: "추가로 궁금한 게 있어요" }),
    }),
    ENV,
  );

  expect(response.status).toBe(409);
  const body = await response.json();
  expect(body.reason).toBe("GENERATION_IN_PROGRESS");
  expect(callGeminiTextMock).not.toHaveBeenCalled();
});

test("GET /result 는 신선한 generating 에 202, 창을 넘기면 409 로 폴링을 끊는다", async () => {
  const fresh = store.seed({
    userId: USER_ID, idempotencyKey: `${KEY}-fresh`, status: "generating", messages: [],
    personA: {}, personB: {}, sukuyoResult: {}, relationshipType: "연인", topic: "전체 궁합", accessType: "pass",
  });
  const freshResponse = await handleSukuyoCompatibilityAiRoutes(
    new Request(`https://example.com/api/sukuyo-compatibility-ai/result?id=${fresh._id}`, { method: "GET" }),
    ENV,
  );
  expect(freshResponse.status).toBe(202);
  expect(freshResponse.headers.get("Retry-After")).toBe("3");

  const staleAt = new Date(Date.now() - testUtils.SUKUYO_COMPAT_AI_GENERATING_FRESH_MS - 1000);
  const stale = store.seed({
    userId: USER_ID, idempotencyKey: `${KEY}-stale`, status: "generating", messages: [],
    personA: {}, personB: {}, sukuyoResult: {}, relationshipType: "연인", topic: "전체 궁합", accessType: "pass",
    createdAt: staleAt, updatedAt: staleAt,
  });
  const staleResponse = await handleSukuyoCompatibilityAiRoutes(
    new Request(`https://example.com/api/sukuyo-compatibility-ai/result?id=${stale._id}`, { method: "GET" }),
    ENV,
  );
  // 🔴 503 이면 isRetriableResultPollFailure 가 재시도로 읽어 폴링이 상한까지 헛돈다.
  expect(staleResponse.status).toBe(409);
  expect((await staleResponse.json()).reason).toBe("GENERATION_INTERRUPTED");
});
