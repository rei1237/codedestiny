/**
 * @jest-environment node
 *
 * 운명 찻집 타로: 뽑힌 카드가 한 장도 빠짐없이 개별 해석되는지 / 카드 조합·마음의 향이
 * 결과와 연결되는지 / 3카드·5카드가 각자의 featureKey로만 결제되는지 검증한다.
 */

import { jest } from "@jest/globals";
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
    if (!fakeCollections.has(name)) fakeCollections.set(name, createFakeCollection());
    return fakeCollections.get(name);
  },
};

function modelStub() {
  return {
    findOne: () => ({ lean: async () => null, exec: async () => null }),
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }), lean: async () => [] }),
    create: async (doc) => doc,
    updateOne: async () => ({ matchedCount: 0 }),
  };
}

const SPREAD_POSITIONS = {
  three: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문이 놓인 자리입니다." },
    { positionId: "flow", positionLabel: "흐름", positionMeaning: "곧 이어질 마음과 상황의 결입니다." },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 가장 현실적인 기준입니다." },
  ],
  five: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문이 놓인 자리입니다." },
    { positionId: "other", positionLabel: "상대/상황", positionMeaning: "상대 또는 상황이 보여주는 결입니다." },
    { positionId: "obstacle", positionLabel: "장애", positionMeaning: "흐름을 거칠게 만드는 반복 지점입니다." },
    { positionId: "possibility", positionLabel: "가능성", positionMeaning: "열릴 수 있는 문과 조건입니다." },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 가장 현실적인 기준입니다." },
  ],
};

const CARD_POOL = [
  { cardId: "minor_pentacles_10", number: 10, nameKo: "펜타클 10", nameEn: "Ten of Pentacles", keywords: ["가족 재산", "장기 자산"], meaning: "쌓아 온 것이 형태를 갖추는 카드입니다." },
  { cardId: "minor_cups_05", number: 5, nameKo: "컵 5", nameEn: "Five of Cups", keywords: ["후회", "놓친 기회"], meaning: "잃은 것에 시선이 머무는 카드입니다." },
  { cardId: "major_04_emperor", number: 4, nameKo: "황제", nameEn: "The Emperor", keywords: ["안정", "리더십"], meaning: "구조와 원칙을 세우는 카드입니다." },
  { cardId: "major_09_hermit", number: 9, nameKo: "은둔자", nameEn: "The Hermit", keywords: ["성찰", "기다림"], meaning: "안으로 등불을 돌리는 카드입니다." },
  { cardId: "major_17_star", number: 17, nameKo: "별", nameEn: "The Star", keywords: ["희망", "회복"], meaning: "메마른 자리에 물이 다시 흐르는 카드입니다." },
];

function buildDraftSpreadCards(spread) {
  return SPREAD_POSITIONS[spread].map((position, index) => ({
    ...CARD_POOL[index],
    orientation: index % 2 === 0 ? "upright" : "reversed",
    source: "existing-card-data",
    ...position,
    reading: `${position.positionLabel} 자리에는 ${CARD_POOL[index].nameKo}이 떠올랐습니다.`,
  }));
}

function consultBody({ spread = "three", featureKey, attemptId = "cardwise-1" } = {}) {
  return {
    consultationMode: "tarot",
    tarotSpread: spread,
    attemptId,
    selectedTeaCupId: "gold-cinnamon",
    selectedTeaCupName: "황금 계피차",
    selectedTeaCupTopic: "금전운",
    question: "올해 돈의 흐름을 어떻게 잡아야 할까요?",
    ...(featureKey ? { featureKey } : {}),
    draftResult: {
      consultationMode: "tarot",
      tarotSpread: spread,
      tarot: { ...CARD_POOL[0], orientation: "upright", reading: "펜타클 10이 재물의 결을 비춥니다." },
      tarotSpreadCards: buildDraftSpreadCards(spread),
    },
  };
}

// 길이 게이트를 넘기기 위한 채움 문장. 카드명을 인자로 받아 카드별 detail에 이름이 남게 한다.
// 찻잔 이름·정역방향·질문 용어는 assertTarotAnchorCoverage가 요구하는 앵커라 함께 넣고,
// hasRepeatedLongBlock에 걸리지 않도록 (카드명, 라벨) 조합마다 문장이 달라지게 만든다.
let padSeq = 0;
function pad(cardName, label) {
  padSeq += 1;
  return [
    `황금 계피차 위에서 ${cardName}은 정방향으로 ${label}의 결을 비춥니다.`,
    `이 자리에서 재성의 흐름은 ${label}을 기준으로 갈리며, 돈이 들어오고 나가는 지점을 감정이 아니라 숫자로 보게 합니다.`,
    `역방향으로 기울 때는 소비의 속도를 30일 단위로 조정하고, 확인 가능한 항목 ${padSeq}개를 먼저 붙잡는 편이 안전합니다.`,
  ].join(" ");
}

function buildLlmPayload(spread) {
  const cards = buildDraftSpreadCards(spread);
  const pairs = spread === "five"
    ? [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]]
    : [[0, 1], [1, 2], [0, 2]];
  return {
    sessionTitle: "황금 계피차에 비친 오늘의 타로 상담",
    questionSummary: "올해 돈의 흐름을 어떻게 잡아야 할까요?",
    tarot: { reading: `${cards.map((card) => card.nameKo).join(", ")}가 함께 재성의 결을 비춥니다. ${pad("펜타클 10", "재물")}` },
    tarotCardReadings: cards.map((card) => ({
      positionId: card.positionId,
      coreMeaning: pad(card.nameKo, "핵심 의미"),
      currentSituation: pad(card.nameKo, card.positionLabel),
      questionLink: pad(card.nameKo, "질문 연결"),
      advice: pad(card.nameKo, "조언"),
      caution: pad(card.nameKo, "주의"),
    })),
    cardInteractions: pairs.map(([a, b]) => ({
      pair: `${cards[a].nameKo} + ${cards[b].nameKo}`,
      insight: `${cards[a].nameKo}의 결이 ${cards[b].nameKo}으로 이어지며 돈의 흐름과 소비 습관을 함께 보게 합니다. 30일 안에 확인할 재성 신호를 나눠 잡아 주세요.`,
    })),
    heartScent: {
      name: "시나몬",
      category: "재물",
      reason: `지금 손님에게 필요한 것은 돈의 흐름을 감정이 아니라 기준으로 보는 눈이에요. 오늘의 ${cards[0].nameKo}과 ${cards[1].nameKo}은 이미 쌓아 온 것과 아쉽게 놓친 것을 함께 보라고 말하고 있고, 어느 한쪽만 붙들면 판단이 기울어진다고 짚어 줍니다. 특히 30일 안에 결정을 몰아서 내리지 말고, 확인 가능한 숫자부터 붙잡으라는 신호가 반복해서 나타나고 있어요. 시나몬은 흩어진 기운을 데워 현실의 결실로 이어주는 향이라, 지금 손님의 재성 흐름을 가장 잘 보완해 줍니다.`,
    },
    // 라벨은 황금 계피차(gold-cinnamon)의 정본 게이지 목록과 일치해야 한다.
    emotionAnalysis: ["안정감", "소비 충동", "회복력", "기회감", "현실감"].map((label) => ({
      label,
      value: 60,
      description: `${label}은 ${pad("펜타클 10", label)}`,
      tone: "gold",
    })),
    yeoniReading: {
      intro: pad("펜타클 10", "첫 인사"),
      main: pad("황제", "카드 배치 서사"),
      advice: pad("컵 5", "방향 제시"),
      caution: pad("컵 5", "위험 신호"),
    },
    synthesis: {
      title: "연이가 읽은 타로의 장면",
      summary: pad("황제", "종합"),
      sajuTarotBridge: pad("펜타클 10", "앞으로의 변화"),
    },
    choiceSimulation: ["줄이기", "지키기", "늘리기", "정리하기"].map((title, index) => ({
      id: `choice-${index + 1}`,
      title,
      subtitle: `${title} 단계`,
      result: pad("펜타클 10", title),
      caution: pad("컵 5", `${title} 리스크`),
    })),
    // requiredTerms(금전·소비·30일·투자)는 결과 어딘가에 반드시 등장해야 한다.
    actionPrescription: `${pad("황제", "행동 처방")} 오늘 30일 지출표를 열어 금전이 새는 항목 하나를 표시하고, 투자 결정은 한 주 미뤄 두세요.`,
    luckyKeywords: ["재성", "30일", "소비 기준", "금전", "투자"],
    closingLine: "돈은 서두르는 손보다 기준을 지키는 손에 오래 머뭅니다.",
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
  fakeCollections.clear();
  callGeminiTextMock.mockReset();
});

async function postConsult(body) {
  const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { NODE_ENV: "test", GEMINIF_API_KEY: "test-key" });
  return { status: response.status, payload: await response.json() };
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

  test("LLM이 카드별 해석을 통째로 빠뜨려도 모든 카드가 설명된 채 전달된다", async () => {
    const payloadWithoutCards = buildLlmPayload("five");
    delete payloadWithoutCards.tarotCardReadings;
    callGeminiTextMock.mockImplementation(async () => ({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(payloadWithoutCards),
    }));

    const { status, payload } = await postConsult(consultBody({ spread: "five", attemptId: "cardwise-missing" }));

    expect(status).toBe(200);
    // 품질 게이트는 실패하지만(degrade), 결제된 결과는 버리지 않고 카드별 폴백 해석과 함께 전달된다.
    expectEveryCardExplained(payload.result, 5);
  });

  test("반복된 장문 타로 상세는 전달 전에 다시 작성된다", async () => {
    const repeatedPayload = buildLlmPayload("three");
    const repairedPayload = buildLlmPayload("three");
    const repeatedPassage = "Ten of Pentacles appears in this reading with a stable financial pattern, so the same decision should be reviewed calmly before making a large commitment today.";
    repeatedPayload.tarotCardReadings[0].coreMeaning = repeatedPassage;
    repeatedPayload.tarotCardReadings[0].currentSituation = repeatedPassage;

    callGeminiTextMock
      .mockResolvedValueOnce({
        ok: true,
        provider: "gemini",
        model: "gemini-2.5-flash",
        text: JSON.stringify(repeatedPayload),
      })
      .mockResolvedValueOnce({
        ok: true,
        provider: "gemini",
        model: "gemini-2.5-flash",
        text: JSON.stringify(repairedPayload),
      });

    const { status, payload } = await postConsult(consultBody({ spread: "three", attemptId: "cardwise-repetition-repair" }));

    expect(status).toBe(200);
    expect(payload.generationMeta.mode).toBe("gemini");
    expect(callGeminiTextMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(callGeminiTextMock.mock.calls[1][1]).qualityRecovery).toContain("같은 문단");
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
