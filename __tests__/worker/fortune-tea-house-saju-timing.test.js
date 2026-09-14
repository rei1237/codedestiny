/**
 * @jest-environment node
 *
 * 운명 찻집 사주: ① 시기 질문의 근거 테이블(timingFacts)이 실제로 프롬프트에 실리는지
 * ② LLM 섹션 하나가 부실해도 아홉 섹션 전부가 폴백으로 갈아치워지지 않는지 검증한다.
 *
 * 🔴 절대 규칙 1 — 과금 LLM 실호출 없이 gemini 모듈을 목으로 대체한다.
 */

import { jest } from "@jest/globals";
import createResultStore from "../fixtures/fortune-tea-result-store.cjs";
import teaFixtures from '../fixtures/fortune-tea-llm-payload.cjs';

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
    if (!fakeCollections.has(name)) fakeCollections.set(name, name === "fortune_tea_house_results" ? createResultStore() : createFakeCollection());
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
    headers: { "content-type": "application/json", 'cf-connecting-ip': body.attemptId },
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
  // LLM resolves immediately in this suite; its losing group deadline must not
  // keep the Node test process alive. This suite checks content, not timeouts.
  jest.useFakeTimers({ doNotFake: ['Date', 'performance', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
  fakeCollections.clear();
  callGeminiTextMock.mockReset();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
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
  test('all required sections complete across requests and preserve original pillars and timing facts', async () => {
    const body = consultBody({ attemptId: 'saju-complete-parts' });
    const long = (label) => Array.from({length: 17}, (_, index) => `${label} 사례 ${index}에서는 일간과 오행, 십성의 계산 근거를 확인합니다. ${label} 검토 ${index}의 재성, 비겁, 소비, 금전, 투자, 30일 계획은 대운과 세운의 주어진 구간을 기준으로 현실의 수입과 지출을 비교하며 해석하는 예시입니다.`).join('\n');
    let mismatched = false;
    callGeminiTextMock.mockImplementation(async (_env, raw) => {
      const output = JSON.parse(JSON.stringify(teaFixtures.buildLlmPayload('three')).replace(/펜타클 10|황제|컵 5/g, '입력 명식').replace(/카드/g, '명식'));
      output.saju = { title: '명식과 금전의 흐름', summary: long('요약'), oneLineAdvice: '지출 기록으로 작은 기준을 확인하세요.', pillars: { day: '잘못된 계산' }, deepSections: SECTION_TITLES.map((title, index) => ({ id: 'llm-' + index, title, body: long(title) })) };
      if (!mismatched && JSON.parse(raw).groupRule.exactSectionTitle === SECTION_TITLES[0]) {
        mismatched = true;
        output.saju.deepSections[0].body = '경금은 정관입니다. ' + output.saju.deepSections[0].body;
      }
      return { ok: true, provider: 'gemini', text: JSON.stringify(output) };
    });
    let response;
    for (let wave = 0; wave < 12; wave += 1) {
      response = await postConsult(body);
      if (response.status !== 202 || response.payload.retryable === false) break;
    }
    const saved = await fakeDb.collection('fortune_tea_house_results').find({}).next();
    expect({ status: response.status, quality: saved.generationCheckpoint.qualityError }).toEqual({ status: 200, quality: undefined });
    expect(response.payload.result.saju.deepSections.map(section => section.title)).toEqual(SECTION_TITLES);
    expect(response.payload.result.saju.pillars).toEqual(body.draftResult.saju.pillars);
    expect(response.payload.result.saju.daewoon).toEqual(DAEWOON_ROWS);
    expect(callGeminiTextMock).toHaveBeenCalledTimes(16);
    expect(response.payload.result.saju.deepSections[0].body).not.toContain('경금은 정관');
  });
  test("일부 섹션만 부실해도 나머지 LLM 섹션은 살아남는다", async () => {
    const strongBody = (title) => Array.from({ length: 16 }, (_, i) => `${title}의 ${i + 1}번째 검토는 입력된 명식의 재성과 일간, 오행을 확인하고 실제 지출의 순서를 비교하는 연습입니다. ${title} 사례 ${i + 1}에서는 단정하지 않고 30일 안에 확인할 수 있는 금전 기록을 근거로 소비와 투자의 선택을 나누어 살펴봅니다.`).join('\n');
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

    expect(status).toBe(202);
    expect(payload.result).toBeUndefined();
    const first = await fakeDb.collection('fortune_tea_house_results').find({}).next();
    const sections = first.generationCheckpoint.parts;
    expect(sections['saju-section-0'].saju.deepSections[0].body).toBe(strongBody(SECTION_TITLES[0]));
    expect(sections['saju-section-1']).toBeUndefined();
    await postConsult(consultBody({ attemptId: 'saju-partial-merge' }));
    const next = await fakeDb.collection('fortune_tea_house_results').find({}).next();
    expect(next.generationCheckpoint.parts['saju-section-0']).toEqual(sections['saju-section-0']);
    expect(next.generationCheckpoint.attempts['saju-section-0']).toBe(1);
  });
});
