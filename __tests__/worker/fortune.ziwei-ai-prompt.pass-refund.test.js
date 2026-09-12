/**
 * @jest-environment node
 *
 * handleZiweiAIPrompt(자미두수 AI 질문) 경로 — 이용권 커버로 monthlySpendCoin 이 차감된 뒤
 * AI 생성이 실패해도 되돌아오지 않던 결함의 수정을 고정한다.
 *
 * findAIPromptPaidAccessEvidence 의 pass_payload 분기가 "이번 호출에서 새로 차감됐을 때만"
 * metadata.passRefund 를 채우고, buildAIPromptVerifiedConsumePayload 가 그것을 최상위
 * passRefund 필드로 승격하는지를 검증한다 — handleZiweiAIPrompt 의 catch 분기(코인/카드 환불과
 * 나란한 이용권 환불)는 refundPassCoverage 자체의 CAS 정확성(pass-consumption.refund.test.js)에
 * 얹혀 있으므로 여기서는 이 두 글루 지점만 고정한다.
 */
import { jest } from "@jest/globals";

const USER_ID = "64b000000000000000000001";
const FEATURE_KEY = "ziwei-ai-prompt";
const COST = 100;
const CYCLE_KEY = "2026-09-30T00:00:00.000Z";

const consumePassForFeatureMock = jest.fn();
const hasConsumedPassFeatureMock = jest.fn();

let findAIPromptPaidAccessEvidence;
let buildAIPromptVerifiedConsumePayload;
let User;

function query(result) {
  return { select: () => ({ lean: async () => result }) };
}

const familyUser = {
  _id: USER_ID,
  points: 0,
  recentConsumeRequestIds: [],
  profileSubscription: {
    tier: "family",
    passTier: "family",
    status: "active",
    isActive: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    premiumUseCycleKey: CYCLE_KEY,
    monthlySpendCoin: 0,
    monthlyLimitCoin: 0,
    membershipCreditBalance: 0,
  },
};

beforeAll(async () => {
  // models.js 는 fortune.js 를 통해 수십 개 모듈이 각기 다른 export 를 끌어쓰는 대형 파일이라
  // 통째로 모킹하면 무관한 모듈들이 "export 없음"으로 깨진다(실측). User 하나만 실제 모델을
  // 그대로 두고 findById 메서드만 스파이로 바꾼다 — 실제 DB 연결은 이 메서드가 항상 스텁으로
  // 대체되므로 시도되지 않는다.
  await jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({
    hasConsumedPassFeature: (...args) => hasConsumedPassFeatureMock(...args),
    consumePassForFeature: (...args) => consumePassForFeatureMock(...args),
    passDenialCode: (reason) => (reason ? "MONTHLY_PASS_LIMIT_EXCEEDED" : ""),
    refundPassCoverage: jest.fn(),
  }));

  ({ User } = await import("../../worker/lib/models.js"));
  jest.spyOn(User, "findById");

  ({ findAIPromptPaidAccessEvidence, buildAIPromptVerifiedConsumePayload } =
    (await import("../../worker/routes/fortune.js")).__fortuneAccessTestUtils);
});

beforeEach(() => {
  User.findById.mockReset().mockReturnValue(query(familyUser));
  hasConsumedPassFeatureMock.mockReset().mockResolvedValue(false);
  consumePassForFeatureMock.mockReset().mockResolvedValue({
    covered: true, reason: "", replayed: false, coverage: { cycleKey: CYCLE_KEY, budgetApplies: true },
  });
});

describe("findAIPromptPaidAccessEvidence — pass_payload 환불 정보 캡처", () => {
  const body = { freeBySubscription: true };

  test("이번 호출에서 새로 차감됐으면(replayed=false, budgetApplies) metadata.passRefund 를 채운다", async () => {
    const evidence = await findAIPromptPaidAccessEvidence({
      auth: { userId: USER_ID }, featureKey: FEATURE_KEY, body, requestId: "req-1", cost: COST, consume: true,
    });
    expect(evidence).toMatchObject({ source: "pass_payload" });
    expect(evidence.record.metadata.passRefund).toEqual({ cycleKey: CYCLE_KEY, cost: COST });
  });

  test("재시도(replayed=true)면 이번 호출에서 새로 깎인 것이 없으므로 passRefund 를 채우지 않는다", async () => {
    consumePassForFeatureMock.mockResolvedValue({
      covered: true, reason: "", replayed: true, coverage: { cycleKey: CYCLE_KEY, budgetApplies: true },
    });
    const evidence = await findAIPromptPaidAccessEvidence({
      auth: { userId: USER_ID }, featureKey: FEATURE_KEY, body, requestId: "req-1", cost: COST, consume: true,
    });
    expect(evidence.record.metadata.passRefund).toBeNull();
  });

  test("월 예산을 셀 수 없으면(budgetApplies=false) passRefund 를 채우지 않는다", async () => {
    consumePassForFeatureMock.mockResolvedValue({
      covered: true, reason: "", replayed: false, coverage: { cycleKey: CYCLE_KEY, budgetApplies: false },
    });
    const evidence = await findAIPromptPaidAccessEvidence({
      auth: { userId: USER_ID }, featureKey: FEATURE_KEY, body, requestId: "req-1", cost: COST, consume: true,
    });
    expect(evidence.record.metadata.passRefund).toBeNull();
  });

  test("선검사(consume=false)는 아직 차감하지 않으므로 consumePassForFeature 를 부르지 않는다", async () => {
    const evidence = await findAIPromptPaidAccessEvidence({
      auth: { userId: USER_ID }, featureKey: FEATURE_KEY, body, requestId: "req-1", cost: COST, consume: false,
    });
    expect(consumePassForFeatureMock).not.toHaveBeenCalled();
    expect(evidence.record.metadata.passRefund).toBeNull();
  });

  test("이미 소비된 요청(재시도, alreadyConsumed)은 다시 차감하지 않고 passRefund 도 만들지 않는다", async () => {
    hasConsumedPassFeatureMock.mockResolvedValue(true);
    const evidence = await findAIPromptPaidAccessEvidence({
      auth: { userId: USER_ID }, featureKey: FEATURE_KEY, body, requestId: "req-1", cost: COST, consume: true,
    });
    expect(consumePassForFeatureMock).not.toHaveBeenCalled();
    expect(evidence.record.metadata.passRefund).toBeNull();
  });
});

describe("buildAIPromptVerifiedConsumePayload — passRefund 최상위 승격", () => {
  test("metadata.passRefund 가 있으면 최상위 passRefund 로 승격한다", () => {
    const payload = buildAIPromptVerifiedConsumePayload({
      auth: { userId: USER_ID },
      featureKey: FEATURE_KEY,
      reason: "test",
      requestId: "req-1",
      cost: COST,
      body: { freeBySubscription: true },
      evidence: { source: "pass_payload", record: { metadata: { passRefund: { cycleKey: CYCLE_KEY, cost: COST } } } },
      subscriptionUser: familyUser,
    });
    expect(payload.passRefund).toEqual({ cycleKey: CYCLE_KEY, cost: COST });
  });

  test("이용권 경로가 아니면(코인/카드/월정석) passRefund 는 null 이다 — 회귀 가드", () => {
    const payload = buildAIPromptVerifiedConsumePayload({
      auth: { userId: USER_ID },
      featureKey: FEATURE_KEY,
      reason: "test",
      requestId: "req-1",
      cost: COST,
      body: {},
      evidence: { source: "point_history", record: { metadata: {} } },
      subscriptionUser: familyUser,
    });
    expect(payload.passRefund).toBeNull();
  });
});
