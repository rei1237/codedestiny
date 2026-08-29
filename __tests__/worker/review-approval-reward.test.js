/**
 * @jest-environment node
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { jest } from "@jest/globals";

const REVIEW_ID = "507f1f77bcf86cd799439099";
const USER_ID = "507f1f77bcf86cd799439011";

const userLean = jest.fn();
const userSelect = jest.fn(() => ({ lean: userLean }));
const userFindById = jest.fn(() => ({ select: userSelect }));
const ledgerUpdateOne = jest.fn(async () => ({ upsertedCount: 1 }));
const reviewUpdateOne = jest.fn(async () => ({ modifiedCount: 1 }));
const grantMonthlyCreditLotDetailed = jest.fn();

let REVIEW_REWARD_AMOUNT;
let buildReviewRewardSourceId;
let grantReviewApprovalReward;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      mongoose: { Types: { ObjectId: { isValid: (value) => /^[a-f0-9]{24}$/i.test(String(value)) } } },
      withMongoRetry: jest.fn(async (_env, operation) => operation()),
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      MonthlyCreditLedger: { updateOne: ledgerUpdateOne },
      User: { findById: userFindById },
    })),
    jest.unstable_mockModule("../../worker/lib/monthly-credit-store.js", () => ({
      grantMonthlyCreditLotDetailed,
    })),
    jest.unstable_mockModule("../../worker/lib/review-models.js", () => ({
      Review: { updateOne: reviewUpdateOne },
    })),
  ]);

  const mod = await import("../../worker/lib/review-reward.js");
  REVIEW_REWARD_AMOUNT = mod.REVIEW_REWARD_AMOUNT;
  buildReviewRewardSourceId = mod.buildReviewRewardSourceId;
  grantReviewApprovalReward = mod.grantReviewApprovalReward;
});

beforeEach(() => {
  jest.clearAllMocks();
  userLean.mockResolvedValue({ _id: USER_ID, status: "active" });
  grantMonthlyCreditLotDetailed.mockResolvedValue({
    user: { _id: USER_ID, profileSubscription: { membershipCreditBalance: 340 } },
    added: true,
    beforeBalance: 240,
    afterBalance: 340,
  });
});

function reviewDoc(overrides = {}) {
  return {
    _id: REVIEW_ID,
    userId: USER_ID,
    productId: "saju-ai",
    productName: "AI 사주 분석",
    createdByAdmin: false,
    ...overrides,
  };
}

describe("후기 승인 보상 — 지급 금액과 단위", () => {
  test("보상은 월정석 100개다(= 1,000원 상당, 월정석 1개 10원)", () => {
    expect(REVIEW_REWARD_AMOUNT).toBe(100);
  });

  test("멱등키는 reviewId 하나로만 만들어진다", () => {
    expect(buildReviewRewardSourceId(REVIEW_ID)).toBe(`review-reward:${REVIEW_ID}`);
  });
});

describe("후기 승인 보상 — 정상 지급", () => {
  test("지급·원장 기록·리뷰 문서 갱신이 모두 같은 sourceId 로 이뤄진다", async () => {
    const result = await grantReviewApprovalReward({ reviewDoc: reviewDoc(), actorId: "admin-1" });

    const sourceId = buildReviewRewardSourceId(REVIEW_ID);
    expect(result).toMatchObject({ granted: true, amount: 100, balanceAfter: 340, sourceId });

    expect(grantMonthlyCreditLotDetailed).toHaveBeenCalledWith({
      userId: USER_ID,
      lotId: sourceId,
      amount: 100,
    });

    const [ledgerFilter, ledgerUpdate, ledgerOptions] = ledgerUpdateOne.mock.calls[0];
    expect(ledgerFilter).toEqual({ userId: USER_ID, type: "MONTHLY_CREDIT_GRANT", sourceId });
    expect(ledgerOptions).toEqual({ upsert: true });
    expect(ledgerUpdate.$setOnInsert).toMatchObject({
      amount: 100,
      beforeBalance: 240,
      afterBalance: 340,
      serviceKey: "review_reward",
      metadata: { grantKind: "review_reward", reviewId: REVIEW_ID, productId: "saju-ai", actorId: "admin-1" },
    });

    const [, reviewUpdate] = reviewUpdateOne.mock.calls[0];
    expect(reviewUpdate.$set).toMatchObject({
      "reviewReward.granted": true,
      "reviewReward.amount": 100,
      "reviewReward.ledgerSourceId": sourceId,
    });
  });
});

describe("후기 승인 보상 — 지급하지 않는 경우", () => {
  test("이미 지급된 리뷰는 재지급 없이 멱등 응답만 준다", async () => {
    const result = await grantReviewApprovalReward({
      reviewDoc: reviewDoc({ reviewReward: { granted: true, amount: 100, ledgerSourceId: "review-reward:x" } }),
    });

    expect(result).toMatchObject({ granted: true, idempotent: true, amount: 100 });
    expect(grantMonthlyCreditLotDetailed).not.toHaveBeenCalled();
    expect(ledgerUpdateOne).not.toHaveBeenCalled();
  });

  test("운영진이 시딩한 리뷰(createdByAdmin)에는 지급하지 않는다", async () => {
    const result = await grantReviewApprovalReward({ reviewDoc: reviewDoc({ createdByAdmin: true }) });

    expect(result).toMatchObject({ granted: false, reason: "ADMIN_SEEDED_REVIEW" });
    expect(grantMonthlyCreditLotDetailed).not.toHaveBeenCalled();
  });

  test("작성자 계정이 연결되지 않은 리뷰에는 지급하지 않는다", async () => {
    const result = await grantReviewApprovalReward({ reviewDoc: reviewDoc({ userId: "" }) });

    expect(result).toMatchObject({ granted: false, reason: "NO_AUTHOR_ACCOUNT" });
    expect(grantMonthlyCreditLotDetailed).not.toHaveBeenCalled();
  });

  test("탈퇴한 계정에는 지급하지 않는다", async () => {
    userLean.mockResolvedValue({ _id: USER_ID, status: "withdrawn" });

    const result = await grantReviewApprovalReward({ reviewDoc: reviewDoc() });

    expect(result).toMatchObject({ granted: false, reason: "TARGET_USER_WITHDRAWN" });
    expect(grantMonthlyCreditLotDetailed).not.toHaveBeenCalled();
  });

  test("계정을 찾지 못하면 지급하지 않는다", async () => {
    userLean.mockResolvedValue(null);

    const result = await grantReviewApprovalReward({ reviewDoc: reviewDoc() });

    expect(result).toMatchObject({ granted: false, reason: "TARGET_USER_NOT_FOUND" });
    expect(grantMonthlyCreditLotDetailed).not.toHaveBeenCalled();
  });
});

describe("후기 승인 보상 — 실패해도 승인을 막지 않는다", () => {
  test("월정석 지급이 null 로 끝나면 원장·리뷰를 건드리지 않고 사유만 돌려준다", async () => {
    grantMonthlyCreditLotDetailed.mockResolvedValue(null);

    const result = await grantReviewApprovalReward({ reviewDoc: reviewDoc() });

    expect(result).toMatchObject({ granted: false, reason: "MONTHLY_CREDIT_GRANT_FAILED" });
    expect(ledgerUpdateOne).not.toHaveBeenCalled();
    expect(reviewUpdateOne).not.toHaveBeenCalled();
  });

  test("지급 도중 예외가 나도 던지지 않는다", async () => {
    grantMonthlyCreditLotDetailed.mockRejectedValue(new Error("mongo down"));

    await expect(grantReviewApprovalReward({ reviewDoc: reviewDoc() })).resolves.toMatchObject({
      granted: false,
      reason: "MONTHLY_CREDIT_GRANT_FAILED",
    });
  });

  test("원장의 중복 키 충돌(11000)은 정상 경로로 흡수된다", async () => {
    ledgerUpdateOne.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));

    const result = await grantReviewApprovalReward({ reviewDoc: reviewDoc() });

    expect(result).toMatchObject({ granted: true, amount: 100 });
    expect(reviewUpdateOne).toHaveBeenCalled();
  });
});

// 🔴 지급 시점이 "승인 전환" 하나뿐이라는 것은 라우트 쪽 분기에 걸려 있다. 그 분기가 사라지면
// 반려·숨김 처리에도 월정석이 나가므로, 소스에서 직접 확인한다.
describe("후기 승인 보상 — 라우트 배선", () => {
  const adminSource = readFileSync(path.join(process.cwd(), "worker/routes/admin.js"), "utf8");

  test("보상 지급 호출은 admin.js 에 정확히 1곳이다", () => {
    expect(adminSource.match(/grantReviewApprovalReward\(/g)).toHaveLength(1);
  });

  test("승인이 아닌 상태 전환은 지급 호출 전에 조기 반환한다", () => {
    const guardIndex = adminSource.indexOf("statusRaw !== REVIEW_STATUSES.APPROVED");
    const callIndex = adminSource.indexOf("grantReviewApprovalReward({");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(callIndex).toBeGreaterThan(guardIndex);
  });
});
