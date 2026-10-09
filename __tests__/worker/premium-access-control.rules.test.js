/**
 * @jest-environment node
 */
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

// 출생 기반 해금 판정만 DB 대역으로 돌린다(규칙 함수 테스트는 DB 를 건드리지 않는다).
const entitlementFindOne = jest.fn();
const write = jest.fn(async () => { throw new Error("unexpected write"); });
const cards = [
  testCard("p1"),
  testCard("p2"), // p1 과 같은 생년월일
  testCard("p3", { day: 18 }), // 다른 생년월일
  testCard("x1", { userId: OTHER_USER_ID }),
];
const profileCards = profileCardModel(cards);
const emptyQuery = () => {
  const query = { select: () => query, sort: () => query, lean: async () => null };
  return query;
};
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  withMongoRetry: async (_env, callback) => callback(),
}));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
  CONTENT_ENTITLEMENT_SOURCES: { COIN: "COIN", PASS: "PASS", PAYMENT: "PAYMENT" },
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
  SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
  ContentEntitlement: { findOne: entitlementFindOne, findOneAndUpdate: write, create: write, updateOne: write },
  User: { findById: () => emptyQuery(), exists: async () => null },
  PointHistory: { findOne: () => emptyQuery() },
  ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
}));

let utils;
let requirePremiumReportAccess;

beforeAll(async () => {
  const mod = await import("../../worker/lib/access-control.js");
  utils = mod.__accessControlTestUtils;
  requirePremiumReportAccess = mod.requirePremiumReportAccess;
});

describe("Premium access-control rules", () => {
  test("sajuNewYear 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("sajuNewYear", {});
    expect(rules).toHaveLength(0);
  });

  test("lifeBook 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("lifeBook", {})).toHaveLength(0);
  });

  test("ziweiPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("ziweiPremium", { mode: "personal" })).toHaveLength(0);
    expect(utils.buildAlternativePaymentRules("ziweiPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("sookyoPremium compat 모드는 별도 required 규칙 없이 모드별 기본 과금으로 처리해야 한다", () => {
    const rules = utils.buildRequiredPaymentRules("sookyoPremium", { reportMode: "compatibility" });
    expect(rules).toHaveLength(0);
  });

  test("vedicPremium compat 모드는 별도 required 규칙 없이 모드별 기본 과금으로 처리해야 한다", () => {
    const rules = utils.buildRequiredPaymentRules("vedicPremium", { reportMode: "compatibility" });
    expect(rules).toHaveLength(0);
  });

  test("westernAstrologyPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("westernAstrologyPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("sookyoPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("sookyoPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("vedicPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("vedicPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("sibylDominator는 인하된 5,000원 결제 증빙을 허용한다", () => {
    const rules = utils.buildAlternativePaymentRules("sibylDominator", {});
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      featureKey: "premium-sibyl-dominator",
      reason: "시빌라 도미네이터 리포트",
      minCost: 50,
    });
  });

  test("결제 토큰 추출은 transaction/request/receipt/order 식별자를 모두 보존해야 한다", () => {
    const tokens = utils.extractPaymentLookupTokens({
      sourceTransactionId: "tx_root",
      sourceRequestId: "req_root",
      receipt: "rcpt_root",
      merchantUid: "ord_root",
      payment: {
        transactionId: "tx_payment",
        requestId: "req_payment",
      },
      _paymentContext: {
        transactionId: "tx_ctx",
      },
      consume: {
        receiptId: "rcpt_consume",
      },
    });

    expect(tokens).toEqual({
      transactionId: "tx_root",
      requestId: "req_root",
      receiptId: "rcpt_root",
      orderId: "ord_root",
      purchaseId: "tx_root",
    });
  });
});

// New lower-price receipts must not be rejected by a stale report-specific floor.
test.each([
  ["celestialHarmony", 50], ["sibylDominator", 50], ["geomancyOracle", 30],
  ["destinyCompassDeepReport", 50], ["petSajuReport", 30], ["petCompatReport", 30],
  ["sukuyoPastLifeReading", 50], ["fptiPremium", 100], ["sajuCompatBasic", 50],
])("%s uses the approved receipt floor %i for canonical and historical aliases", (reportType, expected) => {
  const rules = utils.buildAlternativePaymentRules(reportType);
  expect(rules.length).toBeGreaterThan(0);
  for (const rule of rules) expect(rule.minCost).toBe(expected);
});

describe("출생 기반 키의 프리미엄 접근 판정 (userId + birthKey + contentKey)", () => {
  const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
  let grants;

  function matches(doc, query) {
    return Object.entries(query).every(([key, value]) => {
      if (key === "$and") return value.every((part) => matches(doc, part));
      if (key === "$or") return value.some((part) => matches(doc, part));
      if (value === null) return doc[key] == null;
      if (value && typeof value === "object") {
        if ("$in" in value) return value.$in.includes(doc[key]);
        if ("$gt" in value) return doc[key] != null && doc[key] > value.$gt;
        if ("$exists" in value) return (doc[key] !== undefined) === value.$exists;
      }
      return doc[key] === value;
    });
  }

  function sibylGrant(overrides = {}) {
    grants.push({
      _id: `grant-${grants.length + 1}`,
      userId: TEST_USER_ID,
      serviceKey: "saju",
      contentKey: "premium-sibyl-dominator",
      featureKey: "premium-sibyl-dominator",
      status: "ACTIVE",
      scope: "BIRTH",
      profileId: birthProfileId("p1"),
      purchaseProfileId: "p1",
      expiresAt: null,
      ...overrides,
    });
  }

  const sibyl = (body = {}) => requirePremiumReportAccess({}, TEST_USER_ID, "sibylDominator", {
    _userDoc: { _id: TEST_USER_ID, unlockedFeatures: [] },
    ...body,
  });

  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    grants = [];
    entitlementFindOne.mockReset().mockImplementation((query) => ({
      lean: async () => grants.find((row) => matches(row, query)) || null,
    }));
  });
  afterEach(() => jest.restoreAllMocks());

  test("같은 생년월일의 다른 저장 프로필로도 열린다", async () => {
    sibylGrant();
    const access = await sibyl({ profileId: "p2" });
    expect(access).toMatchObject({ ok: true, accessType: "already_unlocked", featureKey: "premium-sibyl-dominator" });
  });

  test("다른 생년월일 프로필은 잠긴다", async () => {
    sibylGrant();
    const access = await sibyl({ profileId: "p3" });
    expect(access).toMatchObject({ ok: false, status: 402, code: "PAYMENT_REQUIRED" });
    expect(access.requiresProfile).toBeUndefined();
  });

  test("다른 계정의 프로필 id 로는 열리지 않는다", async () => {
    sibylGrant();
    expect((await sibyl({ profileId: "x1" })).ok).toBe(false);
  });

  test.each([
    ["missing", {}],
    ["account marker", { profileId: "__user__" }],
    ["synthetic birth id", { profileId: "birth:forged" }],
  ])("profileId %s → 잠금 + requiresProfile, 계정(USER) 행으로 폴백하지 않는다", async (_label, body) => {
    sibylGrant({ scope: "USER", profileId: "__user__" });
    sibylGrant();
    const access = await sibyl(body);
    expect(access).toMatchObject({ ok: false, status: 402, reason: "MISSING_PROFILE_ID", requiresProfile: true });
    expect(entitlementFindOne).not.toHaveBeenCalled();
  });

  test.each([
    ["USER", { scope: "USER", profileId: "__user__" }],
    ["PROFILE", { scope: "PROFILE", profileId: "p1" }],
  ])("레거시 %s 행은 출생 기반 키의 근거가 아니다", async (_label, overrides) => {
    sibylGrant(overrides);
    expect((await sibyl({ profileId: "p1" })).ok).toBe(false);
  });

  test("User.unlockedFeatures 계정 배열은 출생 기반 키의 근거가 아니다", async () => {
    const access = await requirePremiumReportAccess({}, TEST_USER_ID, "fptiPremium", {
      _userDoc: { _id: TEST_USER_ID, unlockedFeatures: ["premium-fpti-report"] },
      profileId: "p1",
    });
    expect(access).toMatchObject({ ok: false, status: 402 });
  });

  test("계정 기반 키는 종전대로 계정 배열로 열린다", async () => {
    const access = await requirePremiumReportAccess({}, TEST_USER_ID, "sukuyoPastLifeReading", {
      _userDoc: { _id: TEST_USER_ID, unlockedFeatures: ["premiumDivinationPack"] },
    });
    expect(access).toMatchObject({ ok: true, accessType: "unlock", entitlementId: "premiumDivinationPack" });
  });

  test("요청 profileId 추출은 계정 표식·합성 출생 id 를 프로필로 받지 않는다", () => {
    expect(utils.extractPaidContentProfileId({ profileId: "p1" })).toBe("p1");
    expect(utils.extractPaidContentProfileId({ payment: { selectedProfileId: "p2" } })).toBe("p2");
    expect(utils.extractPaidContentProfileId({ profileId: "__user__" })).toBe("");
    expect(utils.extractPaidContentProfileId({ profileId: "birth:abc" })).toBe("");
  });
});
