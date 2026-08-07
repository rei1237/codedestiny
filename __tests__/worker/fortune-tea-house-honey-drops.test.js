/**
 * @jest-environment node
 */

const USER_ID = "64f0a1b2c3d4e5f678901234";
const SERVICE_SCOPE = "FORTUNE_TEA_HOUSE";

let handleFortuneTeaHouseRoutes;
let authState = { userId: USER_ID, email: "tea@example.com", role: "user" };
let paidAccessAllowed = true;
let callGeminiTextMock;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function valueAt(source, path) {
  return String(path).split(".").reduce((current, key) => (current == null ? undefined : current[key]), source);
}

function setAt(target, path, value) {
  const keys = String(path).split(".");
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  });
  current[keys[keys.length - 1]] = value;
}

function unsetAt(target, path) {
  const keys = String(path).split(".");
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    current = current?.[key];
  });
  if (current && typeof current === "object") delete current[keys[keys.length - 1]];
}

function matchesCondition(actual, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (Object.prototype.hasOwnProperty.call(expected, "$gte")) return Number(actual || 0) >= Number(expected.$gte);
    if (Object.prototype.hasOwnProperty.call(expected, "$exists")) return expected.$exists ? actual !== undefined : actual === undefined;
    if (Object.prototype.hasOwnProperty.call(expected, "$in")) return Array.isArray(expected.$in) && expected.$in.includes(actual);
    if (Object.prototype.hasOwnProperty.call(expected, "$ne")) return actual !== expected.$ne;
  }
  return actual === expected;
}

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return Array.isArray(expected) && expected.some((item) => matchesQuery(doc, item));
    if (key === "$and") return Array.isArray(expected) && expected.every((item) => matchesQuery(doc, item));
    return matchesCondition(valueAt(doc, key), expected);
  });
}

function applyUpdate(doc, update, inserting = false) {
  if (update.$inc) {
    Object.entries(update.$inc).forEach(([key, amount]) => {
      setAt(doc, key, Number(valueAt(doc, key) || 0) + Number(amount));
    });
  }
  if (update.$set) {
    Object.entries(update.$set).forEach(([key, value]) => setAt(doc, key, clone(value)));
  }
  if (update.$unset) {
    Object.keys(update.$unset).forEach((key) => unsetAt(doc, key));
  }
  if (inserting && update.$setOnInsert) {
    Object.entries(update.$setOnInsert).forEach(([key, value]) => setAt(doc, key, clone(value)));
  }
}

class FakeCollection {
  constructor() {
    this.rows = new Map();
    this.seq = 0;
  }

  async insertOne(doc) {
    const next = clone(doc);
    next._id = next._id || `fake_${++this.seq}`;
    if (this.rows.has(next._id)) {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    }
    this.rows.set(next._id, next);
    return { acknowledged: true, insertedId: next._id };
  }

  async findOne(query) {
    const row = Array.from(this.rows.values()).find((doc) => matchesQuery(doc, query));
    return clone(row || null);
  }

  async updateOne(query, update, options = {}) {
    const key = Array.from(this.rows.keys()).find((id) => matchesQuery(this.rows.get(id), query));
    if (!key) {
      if (!options.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      const doc = {};
      Object.entries(query).forEach(([queryKey, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) setAt(doc, queryKey, value);
      });
      applyUpdate(doc, update, true);
      doc._id = doc._id || `fake_${++this.seq}`;
      this.rows.set(doc._id, doc);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    applyUpdate(this.rows.get(key), update, false);
    return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  }

  async findOneAndUpdate(query, update) {
    const key = Array.from(this.rows.keys()).find((id) => matchesQuery(this.rows.get(id), query));
    if (!key) return { value: null };
    applyUpdate(this.rows.get(key), update, false);
    return { value: clone(this.rows.get(key)) };
  }

  all() {
    return Array.from(this.rows.values()).map(clone);
  }
}

const fakeDb = {
  collections: new Map(),
  collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new FakeCollection());
    return this.collections.get(name);
  },
  reset() {
    this.collections.clear();
  },
};

function collection(name) {
  return fakeDb.collection(name);
}

function modelForCollection(name) {
  return {
    findOne(query) {
      const row = collection(name).all().find((doc) => matchesQuery(doc, query)) || null;
      const chain = {
        sort() { return chain; },
        select() { return chain; },
        lean: async () => clone(row),
      };
      return chain;
    },
    exists: async (query) => Boolean(collection(name).all().find((doc) => matchesQuery(doc, query))),
  };
}

function validConsultBody(attemptId = "attempt-1") {
  return {
    consultationMode: "tarot",
    attemptId,
    selectedTeaCupId: "honey-peach",
    selectedTeaCupName: "꿀복숭아차",
    selectedTeaCupTopic: "인연",
    question: "지금 이 마음을 어떻게 바라보면 좋을까요?",
  };
}

function longHoneyLetter() {
  const paragraph = "손님, 연이가 달빛 아래 찻잔을 두 손으로 감싸고 천천히 편지를 씁니다. 오늘 달 카드의 정방향은 마음이 아직 다 말하지 못한 장면을 비추지만, 그 빛은 겁을 주려는 빛이 아니라 조용히 속도를 늦추라는 빛에 가깝습니다. 꿀방울을 하나씩 모아 여기까지 온 마음이 참 기특해서, 연이는 꽃돼지처럼 살짝 웃으며 말하고 싶어요. 지금은 누군가의 마음을 단정하기보다 손님 마음이 어디에서 떨리고 어디에서 쉬고 싶은지 먼저 살피면 좋아요. 찻잔 끝에 남은 향처럼, 직감은 작지만 분명하게 남아 있습니다. 오늘은 큰 결론을 밀어붙이지 말고, 마음을 해치지 않는 말 한 줄과 손님을 지키는 침묵 한 조각을 함께 골라 주세요. 그 작은 선택이 내일의 문을 조금 더 부드럽게 열어 줄 거예요. ";
  return `${paragraph}${paragraph}${paragraph}`;
}

async function readJson(response) {
  return { status: response.status, payload: await response.json() };
}

async function seedReadyResult({ resultId = "fortune-tea-house:letter-1", balance = 10, serviceScope = SERVICE_SCOPE, mode = "tarot", generationMode = "gemini" } = {}) {
  await collection("fortune_tea_house_honey_wallets").insertOne({
    _id: `wallet:${USER_ID}`,
    userId: USER_ID,
    serviceScope: SERVICE_SCOPE,
    balance,
    totalEarned: balance,
    totalSpent: 0,
  });
  await collection("fortune_tea_house_results").insertOne({
    _id: `result:${USER_ID}:${resultId}`,
    userId: USER_ID,
    resultId,
    serviceScope,
    consultationMode: mode,
    status: "completed",
    generationMeta: { mode: generationMode },
    result: {
      resultId,
      serviceScope,
      consultationMode: mode,
      questionSummary: "지금 이 마음을 어떻게 바라보면 좋을까요?",
      teaCup: { id: "honey-peach", name: "꿀복숭아차", topic: "인연" },
      tarot: { nameKo: "달", orientation: "upright", keywords: ["직감", "달빛"] },
    },
  });
  return resultId;
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getCurrentUser: jest.fn(async () => authState),
    getOptionalUserFromRequest: jest.fn(async () => authState),
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => undefined),
    mongoose: { connection: { db: fakeDb } },
    resetMongooseConnection: jest.fn(async () => undefined),
    requestPoolRecovery: jest.fn(async () => undefined),
    resolveMongoDbName: jest.fn(() => "test"),
    withMongoRetry: jest.fn(async (env, fn) => fn()),
    isTransientMongoError: jest.fn(() => false),
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    // 라우트가 인증 단계에서 같은 User 문서를 한 번에 읽으려고 이 projection 을 함께 import 한다.
    // 모킹에서 빠지면 라우트 모듈 로드가 SyntaxError 로 죽으므로 실제 모듈 표면과 맞춰 둔다.
    PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    canAccessPaidFeature: jest.fn(async (userId, featureKey) => ({
      allowed: paidAccessAllowed,
      // isReusableFortuneTeaAccessDecision()이 reason/accessSource/licenseType에서
      // admin|monthly|subscription|membership_credit|license|pass|family 중 하나를 인식해야
      // allowed=true가 실제로 반영된다 — "TEST_ACCESS"는 매칭되지 않아 항상 결제 필요로 처리됐다.
      reason: paidAccessAllowed ? "license_active" : "PAYMENT_REQUIRED",
      userId,
      featureKey,
      pricing: null,
    })),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    PaidExecutionRecord: modelForCollection("paid_execution_records"),
    PointHistory: modelForCollection("point_histories"),
    MonthlyCreditLedger: modelForCollection("monthly_credit_ledger"),
    Payment: modelForCollection("payments"),
  }));
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({
    handleBillingRoutes: jest.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: { deferredUsage: true, status: "completed" },
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })),
  }));
  callGeminiTextMock = jest.fn(async () => ({ ok: false, error: "external_call_blocked" }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({
    callGeminiText: callGeminiTextMock,
  }));
  const mod = await import("../../worker/routes/fortune-tea-house.js");
  handleFortuneTeaHouseRoutes = mod.handleFortuneTeaHouseRoutes;
});

beforeEach(() => {
  fakeDb.reset();
  authState = { userId: USER_ID, email: "tea@example.com", role: "user" };
  paidAccessAllowed = true;
  callGeminiTextMock?.mockClear();
});

const FEATURE_KEYS = {
  tarot: "fortune-tea-house-tarot-consultation",
  saju: "fortune-tea-house-saju-consultation",
  sukuyo: "fortune-tea-house-sukuyo-compatibility-consultation",
};

function consultBodyForMode(mode, attemptId) {
  const body = {
    ...validConsultBody(attemptId),
    consultationMode: mode,
  };
  if (mode === "saju") {
    body.birthDate = "1990-01-01";
    body.birthTime = "12:00";
    body.gender = "female";
    body.calendarType = "solar";
  }
  if (mode === "sukuyo") {
    body.sukuyo = {
      user: { name: "A", birthDate: "1990-01-01", calendarType: "solar", gender: "female" },
      partner: { name: "B", birthDate: "1991-02-02", calendarType: "solar", gender: "male" },
      relationshipType: "love",
      focus: "current",
    };
  }
  return body;
}

async function seedBillingEvidence({ featureKey, requestId, accessMethod = "single" }) {
  await collection("paid_execution_records").insertOne({
    _id: `paid:${requestId}`,
    userId: USER_ID,
    featureId: featureKey,
    requestId,
    idempotencyKey: requestId,
    executionId: `exec:${requestId}`,
    paymentId: `pay:${requestId}`,
    orderId: `order:${requestId}`,
    accessMethod,
    status: "paid_pending_generation",
    result: { deferredUsage: { requestId, paymentId: `pay:${requestId}`, accessType: accessMethod } },
  });
}

function billingGatePayload(featureKey, requestId) {
  return {
    featureKey,
    requestId,
    idempotencyKey: requestId,
    executionId: `exec:${requestId}`,
    paymentId: `pay:${requestId}`,
    accessGrant: { featureKey, requestId, paymentId: `pay:${requestId}` },
    consume: { featureKey, requestId, transactionId: `exec:${requestId}`, accessType: "single_purchase" },
  };
}

describe("fortune tea house honey drops", () => {
  test.each(["tarot", "saju", "sukuyo"])("%s consult accepts verified billing gate evidence", async (mode) => {
    paidAccessAllowed = false;
    const requestId = `billing-${mode}`;
    const featureKey = FEATURE_KEYS[mode];
    await seedBillingEvidence({ featureKey, requestId });

    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...consultBodyForMode(mode, requestId),
        featureKey,
        billingGate: billingGatePayload(featureKey, requestId),
      }),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);

    expect(status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.result.consultationMode).toBe(mode);
    expect(payload.result.featureKey).toBe(featureKey);
  });

  test("paid consult without evidence returns payment payload", async () => {
    paidAccessAllowed = false;
    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("payment-required")),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);

    expect(status).toBe(402);
    expect(payload.paymentRequired).toBe(true);
    expect(payload.paymentPayload.featureKey).toBe(FEATURE_KEYS.tarot);
    expect(payload.paymentPayload.amountKRW).toBe(5000);
    expect(payload.paymentPayload.runtimeGate.paymentAmount).toBe(5000);
  });

  test("billing evidence with another fortune tea feature key is rejected", async () => {
    paidAccessAllowed = false;
    const requestId = "mismatch-feature";
    await seedBillingEvidence({ featureKey: FEATURE_KEYS.tarot, requestId });

    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...consultBodyForMode("saju", requestId),
        billingGate: billingGatePayload(FEATURE_KEYS.tarot, requestId),
      }),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);

    expect(status).toBe(400);
    expect(payload.ok).toBe(false);
  });
  test("상담 성공 후 전용 wallet에 꿀방울 1개만 중복 없이 지급한다", async () => {
    const env = { NODE_ENV: "test" };
    const first = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("same-result")),
    }), env);
    const callCountAfterFirst = callGeminiTextMock.mock.calls.length;
    const second = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("same-result")),
    }), env);

    const firstPayload = await first.json();
    const secondPayload = await second.json();
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });
    const ledgers = collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.reason === "TEA_HOUSE_CONSULTATION_REWARD");

    expect(firstPayload.honeyDrops.earnedThisResult).toBe(true);
    expect(secondPayload.honeyDrops.duplicateResult).toBe(true);
    expect(callGeminiTextMock.mock.calls.length).toBe(callCountAfterFirst);
    expect(wallet.balance).toBe(1);
    expect(ledgers).toHaveLength(1);
  });

  test("비로그인 상담에는 전용 꿀방울을 지급하지 않는다", async () => {
    authState = null;
    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("guest-result")),
    }), { NODE_ENV: "test" });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.paymentRequired).toBe(true);
    expect(collection("fortune_tea_house_honey_wallets").all()).toHaveLength(0);
    expect(collection("fortune_tea_house_honey_ledgers").all()).toHaveLength(0);
  });

  test("꿀방울 부족 시 결제 흐름 없이 부족 코드만 반환한다", async () => {
    const resultId = await seedReadyResult({ balance: 4 });
    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "short-balance" }),
    }), { NODE_ENV: "test", FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT: longHoneyLetter() });
    const { status, payload } = await readJson(response);
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });

    expect(status).toBe(402);
    expect(payload.errorCode).toBe("INSUFFICIENT_TEA_HOUSE_HONEY_DROPS");
    expect(wallet.balance).toBe(4);
    expect(collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.type === "spend")).toHaveLength(0);
  });

  test("꿀방울 10개로 연이의 꿀편지를 한 번만 생성하고 재요청은 재사용한다", async () => {
    const resultId = await seedReadyResult({ balance: 10 });
    const env = { NODE_ENV: "test", FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT: longHoneyLetter() };
    const first = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/results/honey-letter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resultId, idempotencyKey: "letter-once" }),
    }), env);
    const second = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "letter-once" }),
    }), env);

    const firstPayload = await first.json();
    const secondPayload = await second.json();
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });
    const spendLedgers = collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.type === "spend");

    expect(firstPayload.success).toBe(true);
    expect(firstPayload.spent).toBe(10);
    expect(firstPayload.honeyLetter.body.length).toBeGreaterThanOrEqual(800);
    expect(secondPayload.success).toBe(true);
    expect(secondPayload.spent).toBe(0);
    expect(secondPayload.alreadyApplied).toBe(true);
    expect(wallet.balance).toBe(0);
    expect(spendLedgers).toHaveLength(1);
  });

  test("운명의 찻집 외부 scope 결과에는 꿀방울을 사용할 수 없다", async () => {
    const resultId = await seedReadyResult({ balance: 10, serviceScope: "SAJU" });
    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "wrong-scope" }),
    }), { NODE_ENV: "test", FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT: longHoneyLetter() });
    const { status, payload } = await readJson(response);

    expect(status).toBe(403);
    expect(payload.errorCode).toBe("HONEY_DROPS_ONLY_FOR_FORTUNE_TEA_HOUSE");
    expect(collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.type === "spend")).toHaveLength(0);
  });

  test("LLM 실패 시 꿀방울을 차감하지 않는다", async () => {
    const resultId = await seedReadyResult({ balance: 10 });
    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "llm-fails" }),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });

    expect(status).toBe(503);
    expect(payload.errorCode).toBe("YEONI_HONEY_LETTER_GENERATION_FAILED");
    expect(wallet.balance).toBe(10);
    expect(collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.type === "spend")).toHaveLength(0);
  });

  test("꿀편지 저장 실패 시 차감한 꿀방울을 환급한다", async () => {
    const resultId = await seedReadyResult({ balance: 10 });
    const results = collection("fortune_tea_house_results");
    const updateOne = results.updateOne.bind(results);
    results.updateOne = async (query, update, options) => {
      if (update?.$set?.honeyLetter) return { matchedCount: 1, modifiedCount: 0, upsertedCount: 0 };
      return updateOne(query, update, options);
    };

    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "store-fails" }),
    }), { NODE_ENV: "test", FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT: longHoneyLetter() });
    const { status, payload } = await readJson(response);
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });
    const ledgers = collection("fortune_tea_house_honey_ledgers").all();
    const resultDoc = await results.findOne({ userId: USER_ID, resultId });

    expect(status).toBe(500);
    expect(payload.errorCode).toBe("YEONI_HONEY_LETTER_SAVE_FAILED");
    expect(wallet.balance).toBe(10);
    expect(ledgers.filter((row) => row.type === "spend")).toHaveLength(1);
    expect(ledgers.filter((row) => row.type === "refund")).toHaveLength(1);
    expect(resultDoc.honeyLetter).toBeUndefined();
  });
});
