/**
 * @jest-environment node
 *
 * 운명 찻집 사주: ① 시기 질문의 근거 테이블(timingFacts)이 실제로 프롬프트에 실리는지
 * ② LLM 섹션 하나가 부실해도 아홉 섹션 전부가 폴백으로 갈아치워지지 않는지 검증한다.
 *
 * 🔴 절대 규칙 1 — 과금 LLM 실호출 없이 gemini 모듈을 목으로 대체한다.
 */

import { jest } from "@jest/globals";

const USER_ID = "64f0a1b2c3d4e5f678901288";
// 황금 계피차(금전운) 규칙의 정본 섹션 제목 — 개수(9)와 문구가 프롬프트·검증기·폴백에 함께 전파된다.
const SECTION_TITLES = [
  "타고난 결 — 내 명식의 돈 그릇",
  "첫 잔 — 돈 걱정이 놓인 자리",
  "마음의 물길 — 재성을 살리고 새게 하는 십성",
  "잘 풀리는 결 — 돈이 들어오는 방식",
  "삐걱대는 결 — 소비가 새는 패턴",
  "지금 이 시기 — 금전 흐름이 움직이는 지점",
  "돈을 지키는 현실 기준",
  "찻집의 처방 — 30일 금전 회복 플랜",
  "연이의 한마디",
];

let handleFortuneTeaHouseRoutes;
let callGeminiTextMock;

function createFakeCollection() {
  return {
    async findOne() { return null; },
    async insertOne(doc) { return { insertedId: doc?._id }; },
    async updateOne() { return { matchedCount: 0, upsertedCount: 1 }; },
    async deleteOne() { return { deletedCount: 0 }; },
    find() { return { sort: () => ({ limit: () => ({ toArray: async () => [] }) }), toArray: async () => [] }; },
  };
}

const fakeCollections = new Map();
const fakeDb = {
  collection(name) {
    if (!fakeCollections.has(name)) fakeCollections.set(name, createFakeCollection());
    return fakeCollections.get(name);
  },
};

function chainStub(result) {
  const chain = { select: () => chain, sort: () => chain, limit: () => chain, lean: async () => result, exec: async () => result };
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

// 어댑터(sajuAdapter.ts)가 엔진 대운 목록을 축약해 보내는 형태 그대로.
const DAEWOON_ROWS = Array.from({ length: 9 }, (_, index) => ({
  label: `${20 + index * 10}세 대운`,
  pillar: ["갑자", "을축", "병인", "정묘", "무진", "기사", "경오", "신미", "임신"][index],
  startAge: 20 + index * 10,
  startYear: 2000 + index * 10,
  endYear: 2009 + index * 10,
  isCurrent: index === 2,
}));

function consultBody(overrides = {}) {
  return {
    consultationMode: "saju",
    attemptId: "saju-timing-1",
    selectedTeaCupId: "gold-cinnamon",
    selectedTeaCupName: "황금 계피차",
    selectedTeaCupTopic: "금전운",
    question: "대체 언제쯤 내가 하는 일에서 돈다운 돈을 벌 수 있을까?",
    birthDate: "1990-03-14",
    birthTime: "09:30",
    gender: "여성",
    draftResult: {
      consultationMode: "saju",
      saju: {
        available: true,
        pillars: {
          year: "경오",
          month: "기묘",
          day: "정축",
          hour: "을사",
        },
        daewoon: DAEWOON_ROWS,
      },
    },
    ...overrides,
  };
}

async function postConsult(body) {
  const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { NODE_ENV: "test", GEMINIF_API_KEY: "test-key" });
  return { status: response.status, payload: await response.json() };
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
    PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    canAccessPaidFeature: jest.fn(async (userId, featureKey) => ({ allowed: true, reason: "license_active", userId, featureKey, pricing: null })),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    PaidExecutionRecord: modelStub(),
    PointHistory: modelStub(),
    MonthlyCreditLedger: modelStub(),
    Payment: modelStub(),
    User: modelStub(),
    LlmResponseCache: {},
  }));
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({
    handleBillingRoutes: jest.fn(async () => new Response(JSON.stringify({ ok: true, data: {} }), { status: 200, headers: { "content-type": "application/json" } })),
    BILLING_SNAPSHOT_USER_PROJECTION: {},
  }));
  callGeminiTextMock = jest.fn(async () => ({ ok: false, error: "blocked" }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: callGeminiTextMock }));

  const mod = await import("../../worker/routes/fortune-tea-house.js");
  handleFortuneTeaHouseRoutes = mod.handleFortuneTeaHouseRoutes;
});

beforeEach(() => {
  fakeCollections.clear();
  callGeminiTextMock.mockReset();
});

describe("운명 찻집 사주 — 시기 근거 테이블", () => {
  test("대운·다년 세운이 프롬프트의 timingFacts 로 전달된다", async () => {
    callGeminiTextMock.mockImplementation(async () => ({ ok: false, error: "blocked" }));

    await postConsult(consultBody());

    expect(callGeminiTextMock.mock.calls.length).toBeGreaterThan(0);
    const prompt = JSON.parse(callGeminiTextMock.mock.calls[0][1]);
    const timingFacts = prompt.sajuFactInput?.timingFacts;
    expect(timingFacts).toBeTruthy();
    // 대운은 최대 8행까지만 싣는다(초안이 9행을 줘도).
    expect(timingFacts.daewoonRows).toHaveLength(8);
    expect(timingFacts.daewoonRows[0]).toMatchObject({ pillar: "갑자", startYear: 2000, endYear: 2009 });
    expect(timingFacts.daewoonRows.some((row) => row.isCurrent === true)).toBe(true);
    // 세운은 올해부터 +5년, 총 6행.
    expect(timingFacts.sewoonRows).toHaveLength(6);
    expect(timingFacts.sewoonRows[0].year).toBe(new Date().getUTCFullYear());
    timingFacts.sewoonRows.forEach((row) => expect(row.pillar).toMatch(/^[가-힣]{2}$/));
    // 대운이 있으면 구간(PERIOD) 해상도까지 답할 수 있다.
    expect(timingFacts.resolution).toBe("PERIOD");
    expect(timingFacts.availableYears).toContain(new Date().getUTCFullYear());
  });

  test("대운이 없으면 해상도가 연 단위로 내려간다", async () => {
    callGeminiTextMock.mockImplementation(async () => ({ ok: false, error: "blocked" }));

    await postConsult(consultBody({
      attemptId: "saju-timing-none",
      draftResult: { consultationMode: "saju", saju: { available: true } },
    }));

    const prompt = JSON.parse(callGeminiTextMock.mock.calls[0][1]);
    const timingFacts = prompt.sajuFactInput?.timingFacts;
    expect(timingFacts.daewoonRows).toHaveLength(0);
    expect(timingFacts.resolution).toBe("YEAR");
    expect(timingFacts.rule).toContain("실제로 있는 연도");
  });
});

describe("운명 찻집 사주 — 섹션 부분 병합", () => {
  test("일부 섹션만 부실해도 나머지 LLM 섹션은 살아남는다", async () => {
    const strongBody = (title) => `${title}에 대해 말씀드리면, 재성이 월지에 뿌리를 두어 돈이 들어오는 통로가 분명합니다. `
      + "다만 비겁이 함께 서 있어 소비가 새는 자리도 같이 만들어지니, 30일 단위로 지출을 끊어 보는 편이 안전합니다. "
      + "일간과 오행의 균형을 기준으로 보면 지금은 규모를 키우기보다 기준을 세우는 시기입니다.";
    const weakBody = "이 대목은 조금 더 살펴보면 좋겠습니다. 마음이 머무는 자리를 천천히 확인해 보세요. 오늘은 여기까지만 짚어 둡니다.";
    const deepSections = SECTION_TITLES.map((title, index) => ({
      id: `llm-${index + 1}`,
      title,
      body: index % 2 === 0 ? strongBody(title) : weakBody,
    }));

    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify({ saju: { deepSections } }),
    }));

    const { status, payload } = await postConsult(consultBody({ attemptId: "saju-partial-merge" }));

    expect(status).toBe(200);
    const merged = payload.result.saju.deepSections;
    expect(merged.map((section) => section.title)).toEqual(SECTION_TITLES);
    SECTION_TITLES.forEach((title, index) => {
      if (index % 2 === 0) {
        // 하한을 넘긴 LLM 섹션은 그대로 살아 있어야 한다(전량 폴백 교체 회귀 방지).
        expect(merged[index].body).toBe(strongBody(title));
      } else {
        // 하한 미달 섹션만 폴백으로 채운다.
        expect(merged[index].body).not.toBe(weakBody);
        expect(merged[index].body.length).toBeGreaterThan(weakBody.length);
      }
    });
  });
});
