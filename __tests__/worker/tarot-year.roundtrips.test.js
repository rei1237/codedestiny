/**
 * @jest-environment node
 *
 * POST /api/tarot/reading (십이지신 천운 타로) 이 잡는 Mongo admission 슬롯 수를 고정한다.
 *
 * 왜 세는가: withMongoRetry 는 호출 1회당 아이솔레이트 전역 게이트 슬롯 1개를 잡는다
 * (worker/lib/db.js, 기본 limit 8). 초과분은 MongoOperationOverloadedError 인데 이건
 * **재시도 대상에서 명시적으로 제외**돼 그대로 503 이 된다. 이 라우트는 하필 결제 확인 직후,
 * 즉 셸이 balance·subscription·access-state·profile 을 한꺼번에 갱신하는 피크와 겹쳐서 돈다.
 * 그래서 이 라우트가 슬롯을 몇 개 먹는지가 곧 "결제하고 결과를 못 받을 확률"이다.
 *
 * 2026-08-11 사고: 한 요청이 슬롯 7개(인증 2 + 결제 1 + 멱등조회 2 + 쓰기 2)를 직렬로 먹었고,
 * 그중 3개가 순수 중복이었다. LLM 을 전혀 쓰지 않는 결정적 경로라 왕복 사이에 지연이 끼지도 않는다.
 */

import { jest } from "@jest/globals";

import { drawPremiumYearCards } from "../../lib/tarot/tarot-year-premium.mjs";

const TEST_USER_ID = "507f1f77bcf86cd799439011";
const YEAR = 2026;

const withMongoRetry = jest.fn((env, op) => op());
const connectDb = jest.fn(async () => ({}));
const requireAuth = jest.fn();
const canAccessPaidFeature = jest.fn();
const paidExecutionFindOne = jest.fn();
const paidExecutionFindOneAndUpdate = jest.fn();
const paidExecutionUpdateOne = jest.fn();

/** mongoose 체이너(.sort().lean()) 흉내 — 최종 값만 돌려준다. */
function chain(value) {
  const node = {
    select: () => node,
    sort: () => node,
    lean: () => Promise.resolve(value),
  };
  return node;
}

let handleTarotRoutes;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({ connectDb, withMongoRetry })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireAuth,
      isAuthDbInfraError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      PaidExecutionRecord: {
        findOne: paidExecutionFindOne,
        findOneAndUpdate: paidExecutionFindOneAndUpdate,
        updateOne: paidExecutionUpdateOne,
      },
    })),
    jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
      canAccessPaidFeature,
      PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    })),
    jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
      verifyPerUsePayment: jest.fn(async () => ({ proven: true, source: "test" })),
      logPerUsePaymentProof: jest.fn(),
    })),
  ]);
  ({ handleTarotRoutes } = await import("../../worker/routes/tarot.js"));
});

function yearReadingRequest() {
  const cards = drawPremiumYearCards({ seed: "roundtrip-test-seed", year: YEAR })
    .map((card) => ({ cardId: card.cardId, position: card.position, orientation: card.orientation }));
  return new Request("https://example.com/api/tarot/reading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "general",
      spreadType: "yearly_twelve_card",
      cards,
      year: YEAR,
      requestId: "tarot-year:2026:test-request",
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  withMongoRetry.mockImplementation((env, op) => op());
  requireAuth.mockResolvedValue({ userId: TEST_USER_ID, authUserDoc: { _id: TEST_USER_ID } });
  canAccessPaidFeature.mockResolvedValue({ allowed: true, licenseType: "single" });
  paidExecutionFindOne.mockReturnValue(chain(null));
  paidExecutionFindOneAndUpdate.mockReturnValue(chain({
    resultId: "tarot-year-result:2026:tarot-year:2026:test-request",
    profileId: "year:2026",
    completedAt: new Date(),
    result: { cards: [], reading: { summary: "ok" }, consultingHighlights: [], engineMeta: {} },
  }));
});

describe("POST /api/tarot/reading (yearly_twelve_card) — Mongo 왕복 예산", () => {
  test("라우트 자신이 잡는 슬롯은 2개다 (멱등 조회 1 + 저장 1)", async () => {
    const response = await handleTarotRoutes(yearReadingRequest(), {});

    expect(response.status).toBe(200);
    // 🔴 4로 되돌아가면(중복 멱등 조회 부활 또는 generating→completed 2단 쓰기 부활) 여기서 실패한다.
    expect(withMongoRetry).toHaveBeenCalledTimes(2);
    expect(paidExecutionFindOne).toHaveBeenCalledTimes(1);
    expect(paidExecutionFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  test("인증은 한 번만 푼다 (범용 게이트 + 결제 게이트 이중 인증 차단)", async () => {
    await handleTarotRoutes(yearReadingRequest(), {});

    // requireAuth 는 그 자체로 슬롯 1개 + User 조회 1회다. 두 번 부르면 둘 다 두 배가 된다.
    expect(requireAuth).toHaveBeenCalledTimes(1);
  });

  test('저장은 곧바로 completed 로 쓴다 (중간 "generating" 쓰기 없음)', async () => {
    await handleTarotRoutes(yearReadingRequest(), {});

    const [, update, options] = paidExecutionFindOneAndUpdate.mock.calls[0];
    expect(update.$set.status).toBe("completed");
    expect(update.$set.completedAt).toBeInstanceOf(Date);
    expect(options.upsert).toBe(true);
  });

  test("결제한 요청은 admission 슬롯을 상한까지 기다린다", async () => {
    await handleTarotRoutes(yearReadingRequest(), {});

    for (const [, , options] of withMongoRetry.mock.calls) {
      expect(options?.admissionTimeoutMS).toBe(5000);
    }
  });

  test("저장이 실패해도 결제한 사용자는 리딩을 받는다 (degrade-not-throw)", async () => {
    paidExecutionFindOneAndUpdate.mockReturnValue({
      lean: () => Promise.reject(Object.assign(new Error("MongoDB operation capacity is temporarily saturated."), {
        name: "MongoOperationOverloadedError",
      })),
    });

    const response = await handleTarotRoutes(yearReadingRequest(), {});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.persisted).toBe(false);
    expect(payload.reading).toBeTruthy();
    expect(payload.cards.length).toBe(12);
    // 포화된 아이솔레이트에서 보상 쓰기로 슬롯을 하나 더 요구하지 않는다.
    expect(paidExecutionUpdateOne).not.toHaveBeenCalled();
  });

  test("이미 완료된 요청은 저장 없이 그대로 돌려준다 (멱등)", async () => {
    paidExecutionFindOne.mockReturnValue(chain({
      status: "completed",
      resultId: "tarot-year-result:2026:tarot-year:2026:test-request",
      profileId: "year:2026",
      completedAt: new Date(),
      result: { cards: [], reading: { summary: "stored" }, consultingHighlights: [], engineMeta: {} },
    }));

    const response = await handleTarotRoutes(yearReadingRequest(), {});
    const payload = await response.json();

    expect(payload.stored).toBe(true);
    expect(paidExecutionFindOneAndUpdate).not.toHaveBeenCalled();
    expect(withMongoRetry).toHaveBeenCalledTimes(1);
  });

  test("결제 미확인이면 402 이고 리딩을 만들지 않는다", async () => {
    canAccessPaidFeature.mockResolvedValue({ allowed: false });

    const response = await handleTarotRoutes(yearReadingRequest(), {});
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.code).toBe("TAROT_YEAR_PAYMENT_REQUIRED");
    expect(paidExecutionFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
