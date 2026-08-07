/**
 * @jest-environment node
 */

// 회귀 방지: POST /api/fortune/pig-coin/refund 의 폴백 조회가 delta:0 감사행을 잡으면
// 인증된 사용자 누구나 임의 금액의 레거시 코인을 발행할 수 있다(→ 월정석 1:10 전환).
// delta:0 감사행은 프로필 카드 조작마다 정상적으로 생성되므로 공격 재료가 상시 존재한다.

let buildPigCoinRefundDeductQueries;

const USER_ID = "507f1f77bcf86cd799439011";
const SOURCE_ID = "64f0a1b2c3d4e5f678901234";
const RECENT_WINDOW = new Date("2026-08-06T00:00:00.000Z");

beforeAll(async () => {
  const mod = await import("../../worker/routes/fortune.js");
  buildPigCoinRefundDeductQueries = mod.__fortuneAccessTestUtils.buildPigCoinRefundDeductQueries;
});

function build(overrides = {}) {
  return buildPigCoinRefundDeductQueries({
    userId: USER_ID,
    cost: 100000,
    featureKey: "pig-coin-unlock",
    sourceTransactionId: SOURCE_ID,
    recentWindow: RECENT_WINDOW,
  ...overrides,
  });
}

describe("pig-coin refund 차감행 조회", () => {
  test("폴백 조회가 delta 음수 조건을 걸어 delta:0 감사행을 배제해야 한다", () => {
    const { fallback } = build();
    expect(fallback.delta).toEqual({ $lt: 0 });
  });

  test("폴백 조회가 featureKey와 최근 창을 1차 조회와 동일하게 유지해야 한다", () => {
    const { primary, fallback } = build();
    expect(fallback.featureKey).toBe(primary.featureKey);
    expect(fallback.createdAt).toEqual(primary.createdAt);
    expect(fallback.userId).toBe(USER_ID);
    expect(fallback.kind).toBe("deduct");
    expect(fallback._id).toBe(SOURCE_ID);
  });

  test("폴백이 완화하는 것은 delta 정확값뿐이어야 한다", () => {
    const { primary, fallback } = build();
    expect(primary.delta).toBe(-100000);
    expect(fallback.delta).not.toBe(-100000);
    expect(Object.keys(fallback).sort()).toEqual(Object.keys(primary).sort());
  });

  test("sourceTransactionId가 ObjectId 형식이 아니면 폴백 조회를 만들지 않는다", () => {
    expect(build({ sourceTransactionId: "" }).fallback).toBeNull();
    expect(build({ sourceTransactionId: "not-an-object-id" }).fallback).toBeNull();
  });

  test("sourceTransactionId가 없으면 1차 조회도 _id로 좁히지 않는다", () => {
    const { primary } = build({ sourceTransactionId: "" });
    expect(primary._id).toBeUndefined();
    expect(primary.delta).toBe(-100000);
    expect(primary.featureKey).toBe("pig-coin-unlock");
  });
});
