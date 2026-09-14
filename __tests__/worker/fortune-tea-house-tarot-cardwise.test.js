/**
 * @jest-environment node
 *
 * 운명 찻집 타로: 뽑힌 카드가 한 장도 빠짐없이 개별 해석되는지 / 카드 조합·마음의 향이
 * 결과와 연결되는지 / 3카드·5카드가 각자의 featureKey로만 결제되는지 검증한다.
 */

import { jest } from "@jest/globals";
import createResultStore from "../fixtures/fortune-tea-result-store.cjs";
import teaFixtures from "../fixtures/fortune-tea-llm-payload.cjs";
const { buildLlmPayload, consultBody } = teaFixtures;
import { isHeartScentName } from "../../lib/fortune-tea-house/heart-scents.js";

const USER_ID = "64f0a1b2c3d4e5f678901299";
const TAROT_THREE_KEY = "fortune-tea-house-tarot-consultation";
const TAROT_FIVE_KEY = "fortune-tea-house-tarot-five-consultation";
const DETAIL_FIELDS = ["coreMeaning", "currentSituation", "questionLink", "advice", "caution"];

let handleFortuneTeaHouseRoutes;
let callGeminiTextMock;

// 워커가 실제로 붙잡는 collection은 없어도 되므로, 최소한의 in-memory 스텁만 둔다.
function createFakeCollection() {
  const rows = [];
  return {
    rows,
    async findOne() { return null; },
    async insertOne(doc) { rows.push(doc); return { insertedId: doc?._id }; },
    async updateOne() { return { matchedCount: 0, upsertedCount: 1 }; },
    async deleteOne() { return { deletedCount: 0 }; },
    find() { return { sort: () => ({ limit: () => ({ toArray: async () => [] }) }), toArray: async () => [] }; },
  };
}

const fakeCollections = new Map();
const fakeDb = {
  collection(name) {
    if (!fakeCollections.has(name)) fakeCollections.set(name, name === "fortune_tea_house_results" ? createResultStore() : createFakeCollection());
    return fakeCollections.get(name);
  },
};

/* 체이닝은 끝까지 이어져야 한다 — 월정석 증빙 정본(worker/lib/moonstone-spend-proof.js)이
   find().select().sort().limit().lean() 을 쓰므로 중간에 끊기면 스위트 전체가 로드 단계에서 죽는다. */
function chainStub(result) {
  const chain = {
    select: () => chain,
    sort: () => chain,
    limit: () => chain,
    lean: async () => result,
    exec: async () => result,
  };
  return chain;
}

function modelStub() {
  return {
    findOne: () => chainStub(null),
    findById: () => chainStub(null),
    find: () => chainStub([]),
    exists: async () => null,
    create: async (doc) => doc,
    updateOne: async () => ({ matchedCount: 0 }),
  };
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getCurrentUser: jest.fn(async () => ({ userId: USER_ID, role: "admin" })),
    getOptionalUserFromRequest: jest.fn(async () => ({ userId: USER_ID, role: "admin" })),
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
      allowed: true,
      reason: "license_active",
      userId,
      featureKey,
      pricing: null,
    })),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    PaidExecutionRecord: modelStub(),
    PointHistory: modelStub(),
    MonthlyCreditLedger: modelStub(),
    Payment: modelStub(),
    // 월정석 증빙 정본이 미정산 예약행을 판정할 때 읽는다(recentConsumeRequestIds).
    User: modelStub(),
    // 라우트가 llm-cache-store 를 통해 참조한다. 이 스위트는 캐시 동작을 검증하지 않으므로 빈 스텁.
    LlmResponseCache: {},
  }));
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({
    handleBillingRoutes: jest.fn(async () => new Response(JSON.stringify({ ok: true, data: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })),
    BILLING_SNAPSHOT_USER_PROJECTION: {},
  }));
  callGeminiTextMock = jest.fn(async () => ({ ok: false, error: "blocked" }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: callGeminiTextMock }));

  const mod = await import("../../worker/routes/fortune-tea-house.js");
  handleFortuneTeaHouseRoutes = mod.handleFortuneTeaHouseRoutes;
});

beforeEach(() => {
  // These immediate LLM fixtures verify card content, not deadline behavior.
  jest.useFakeTimers({ doNotFake: ['Date', 'performance', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
  fakeCollections.clear();
  callGeminiTextMock.mockReset();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

async function postConsultOnce(body) {
  const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
    method: "POST",
    headers: { "content-type": "application/json", 'cf-connecting-ip': body.attemptId },
    body: JSON.stringify(body),
  }), { NODE_ENV: "test", GEMINIF_API_KEY: "test-key" });
  return { status: response.status, payload: await response.json() };
}

async function postConsult(body) {
  for (let wave = 0; wave < 12; wave += 1) {
    const response = await postConsultOnce(body);
    if (response.status !== 202 || response.payload.retryable === false) return response;
  }
  const saved = await fakeDb.collection('fortune_tea_house_results').find({}).next();
  throw new Error('mock generation did not settle ' + JSON.stringify({ status: saved?.status, lock: saved?.generationLock, attempts: saved?.generationCheckpoint?.attempts, repairs: saved?.generationCheckpoint?.repairs, quality: saved?.generationCheckpoint?.qualityError }));
}

function expectEveryCardExplained(result, expectedCount) {
  expect(result.tarotSpreadCards).toHaveLength(expectedCount);
  result.tarotSpreadCards.forEach((card) => {
    expect(card.detail).toBeTruthy();
    DETAIL_FIELDS.forEach((field) => {
      expect(typeof card.detail[field]).toBe("string");
      expect(card.detail[field].trim().length).toBeGreaterThan(20);
    });
    // 카드 해석이 다른 카드 자리로 밀리지 않았는지.
    const detailText = DETAIL_FIELDS.map((field) => card.detail[field]).join("\n");
    expect(detailText).toContain(card.nameKo);
    // 카드당 최소 분량(공백 제외 500자) — LLM 폴백 문안도 이 기준을 지켜야 한다.
    expect(detailText.replace(/\s/g, "").length).toBeGreaterThanOrEqual(500);
  });
}

describe("운명 찻집 타로 — 카드별 해석", () => {
  test.each([["three", 3], ["five", 5]])("%s 스프레드: 뽑힌 카드 %i장이 모두 개별 해석된다", async (spread, count) => {
    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(buildLlmPayload(spread)),
    }));

    const { status, payload } = await postConsult(consultBody({ spread, attemptId: `cardwise-${spread}` }));

    expect(status).toBe(200);
    // 품질 게이트를 실제로 통과했는지 확인한다(degrade로 새어 통과하는 것을 막는다).
    expect(payload.generationMeta.mode).toBe("gemini");
    expect(payload.generationMeta.degraded).toBeFalsy();
    expectEveryCardExplained(payload.result, count);
  });

  test("LLM이 카드별 해석을 빠뜨리면 제한된 재시도 뒤 미완료로 보존한다", async () => {
    const payloadWithoutCards = buildLlmPayload("five");
    delete payloadWithoutCards.tarotCardReadings;
    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(payloadWithoutCards),
    }));

    const { status, payload } = await postConsult(consultBody({ spread: "five", attemptId: "cardwise-missing" }));

    expect(status).toBe(202);
    expect(payload.retryable).toBe(false);
    expect(payload.result).toBeUndefined();
    expect(payload.completedSections.some(section => section.key.startsWith('tarot-card'))).toBe(false);
    const count = callGeminiTextMock.mock.calls.length;
    await postConsultOnce(consultBody({ spread: 'five', attemptId: 'cardwise-missing' }));
    expect(callGeminiTextMock).toHaveBeenCalledTimes(count);
  });

  test("LLM이 타로 게이지를 모두 0으로 보내도 결정론 폴백 수치를 유지한다", async () => {
    const zeroGaugePayload = buildLlmPayload("three");
    zeroGaugePayload.emotionAnalysis.forEach((item) => { item.value = 0; });
    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(zeroGaugePayload),
    }));

    const { status, payload } = await postConsult(consultBody({ spread: "three", attemptId: "cardwise-zero-gauges" }));

    expect(status).toBe(200);
    expect(payload.result.emotionAnalysis.map((item) => item.value)).toEqual([66, 72, 61, 58]);
  });

  test("반복된 장문 타로 상세는 전달 전에 다시 작성된다", async () => {
    const repeatedPayload = buildLlmPayload("three");
    const repairedPayload = buildLlmPayload("three");
    const repeatedPassage = "Ten of Pentacles appears in this reading with a stable financial pattern, so the same decision should be reviewed calmly before making a large commitment today.";
    repeatedPayload.tarotCardReadings[0].coreMeaning = repeatedPassage;
    repeatedPayload.tarotCardReadings[0].currentSituation = repeatedPassage;

    // 섹션 병렬 전환(2026-08-15) 이후 웨이브 1은 그룹 수만큼 호출된다. 카드 판독 그룹이
    // 첫 호출이라 거기에만 반복 문단을 심고, 재작성 웨이브는 기본 목으로 정상 응답을 받는다.
    callGeminiTextMock
      .mockResolvedValueOnce({ ok: true, provider: 'gemini', text: JSON.stringify(repairedPayload) })
      .mockResolvedValueOnce({
        ok: true,
        provider: "gemini",
        model: "gemini-2.5-flash",
        text: JSON.stringify(repeatedPayload),
      })
      .mockResolvedValue({
        ok: true,
        provider: "gemini",
        model: "gemini-2.5-flash",
        text: JSON.stringify(repairedPayload),
      });

    const { status, payload } = await postConsult(consultBody({ spread: "three", attemptId: "cardwise-repetition-repair" }));

    expect(status).toBe(200);
    expect(payload.generationMeta.mode).toBe("gemini");
    // 웨이브 1(그룹 수) + 반복 재작성 웨이브가 돌았다.
    const groupCount = 3;
    expect(callGeminiTextMock.mock.calls.length).toBeGreaterThan(groupCount);
    expect(callGeminiTextMock.mock.calls.filter(call => JSON.parse(call[1]).groupRule.exactPositionId === 'present')).toHaveLength(2);
    expect(payload.result.tarotSpreadCards[0].detail.coreMeaning).not.toBe(payload.result.tarotSpreadCards[0].detail.currentSituation);
  });

  test("카드 조합과 마음의 향이 실제 뽑힌 카드와 연결된다", async () => {
    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(buildLlmPayload("three")),
    }));

    const { payload } = await postConsult(consultBody({ spread: "three", attemptId: "cardwise-link" }));
    const result = payload.result;
    const cardNames = result.tarotSpreadCards.map((card) => card.nameKo);

    expect(result.cardInteractions.length).toBeGreaterThanOrEqual(3);
    result.cardInteractions.forEach((interaction) => {
      expect(cardNames.some((name) => interaction.pair.includes(name))).toBe(true);
      expect(interaction.insight.trim().length).toBeGreaterThan(20);
    });

    expect(isHeartScentName(result.heartScent.name)).toBe(true);
    expect(result.heartScent.category).toBe("재물");
    expect(cardNames.some((name) => result.heartScent.reason.includes(name))).toBe(true);
  });

  test("카탈로그 밖의 향 이름은 결정론 폴백으로 교체된다", async () => {
    const payloadWithBadScent = buildLlmPayload("three");
    payloadWithBadScent.heartScent = { name: "달빛 이슬", category: "평온", reason: payloadWithBadScent.heartScent.reason };
    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(payloadWithBadScent),
    }));

    const { payload } = await postConsult(consultBody({ spread: "three", attemptId: "cardwise-scent" }));

    expect(payload.result.heartScent.name).not.toBe("달빛 이슬");
    expect(isHeartScentName(payload.result.heartScent.name)).toBe(true);
  });
});

describe("운명 찻집 타로 — 스프레드별 결제", () => {
  beforeEach(() => {
    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(buildLlmPayload("five")),
    }));
  });

  test("5카드 요청은 5카드 featureKey로 처리된다", async () => {
    const { status, payload } = await postConsult(consultBody({ spread: "five", featureKey: TAROT_FIVE_KEY, attemptId: "pricing-five" }));
    expect(status).toBe(200);
    expect(payload.result.featureKey).toBe(TAROT_FIVE_KEY);
  });

  test("5카드 요청에 3카드 featureKey를 보내면 거부한다(금액 조작 차단)", async () => {
    const { status, payload } = await postConsult(consultBody({ spread: "five", featureKey: TAROT_THREE_KEY, attemptId: "pricing-mismatch" }));
    expect(status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  test("3카드 요청에 5카드 featureKey를 보내면 거부한다", async () => {
    const { status } = await postConsult(consultBody({ spread: "three", featureKey: TAROT_FIVE_KEY, attemptId: "pricing-mismatch-2" }));
    expect(status).toBe(400);
  });
});
