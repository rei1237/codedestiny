/**
 * @jest-environment node
 *
 * upsertContentUnlock 의 두 가지 계약을 고정한다.
 *  1) 동시 지급 경합(E11000)은 결제 실패가 아니라 승자 행 반환으로 끝난다.
 *     여기서 예외가 새면 payments.js 의 refundOrDefer 가 정상 결제를 취소하고
 *     billing.js 가 코인을 환급한다(콘텐츠는 그대로 남는다).
 *  2) featureKey 가 상수이고 contentKey 만 다른 상품(sukyo_yearly_fortune_unlock)에서
 *     기존 연도 행을 매칭해 덮어쓰지 않는다.
 *
 * verify:saju-unlock-entitlement-regression 은 자체 in-memory 가짜 구현을 쓰므로
 * 이 동작을 검증하지 못한다. 실제 함수를 부르는 곳은 이 파일뿐이다.
 */

import { jest } from "@jest/globals";

const findOneAndUpdate = jest.fn();

let upsertContentUnlock;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER" },
    CONTENT_ENTITLEMENT_SOURCES: {
      COIN: "COIN",
      PAYMENT: "PAYMENT",
      PASS: "PASS",
      MONTHLY: "MONTHLY",
      ADMIN: "ADMIN",
      BACKFILL: "BACKFILL",
    },
    CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE", REFUNDED: "REFUNDED", CANCELLED: "CANCELLED" },
    ContentEntitlement: { findOneAndUpdate },
    SAJU_LOCKED_CONTENT_KEYS: {
      DAEUN_ANALYSIS: "saju.daeunAnalysis",
      FULL_READING: "saju.fullReading",
      COMPATIBILITY: "saju.compatibility",
    },
    User: {},
  }));
  ({ upsertContentUnlock } = await import("../../worker/lib/content-unlocks.js"));
});

function duplicateKeyError() {
  return Object.assign(new Error("E11000 duplicate key error"), { code: 11000 });
}

function chain(lean) {
  return { session: jest.fn(), lean };
}

const SAJU_INPUT = {
  userId: "user-1",
  profileId: "profile-1",
  serviceKey: "saju",
  contentKey: "saju.fullReading",
  featureKey: "section_summary",
  scope: "PROFILE",
  source: "PAYMENT",
};

beforeEach(() => {
  findOneAndUpdate.mockReset();
});

test("동시 지급 경합(E11000)은 실패가 아니라 승자 행을 돌려준다", async () => {
  findOneAndUpdate
    .mockReturnValueOnce(chain(async () => { throw duplicateKeyError(); }))
    .mockReturnValueOnce(chain(async () => ({ _id: "winner", contentKey: "saju.fullReading" })));

  await expect(upsertContentUnlock(SAJU_INPUT)).resolves.toMatchObject({ _id: "winner" });
  expect(findOneAndUpdate).toHaveBeenCalledTimes(2);

  // 복구는 1차와 동일한 identity 를 쓴다 — 1차가 고르지 않았을 행을 고를 수 없어야 한다.
  expect(findOneAndUpdate.mock.calls[1][0]).toEqual(findOneAndUpdate.mock.calls[0][0]);
  // 복구는 다시 insert 하지 않는다.
  expect(findOneAndUpdate.mock.calls[1][2]).not.toHaveProperty("upsert");
  // $set 페이로드는 1차와 같은 객체다(드리프트 금지).
  expect(findOneAndUpdate.mock.calls[1][1].$set).toBe(findOneAndUpdate.mock.calls[0][1].$set);
});

test("재조회가 비면 우리 필터가 소유하지 않는 행과의 충돌이므로 삼키지 않는다", async () => {
  findOneAndUpdate
    .mockReturnValueOnce(chain(async () => { throw duplicateKeyError(); }))
    .mockReturnValueOnce(chain(async () => null));

  await expect(upsertContentUnlock(SAJU_INPUT)).rejects.toMatchObject({ code: 11000 });
  expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
});

test("트랜잭션(session) 안에서는 재조회하지 않고 그대로 올린다", async () => {
  findOneAndUpdate.mockReturnValueOnce(chain(async () => { throw duplicateKeyError(); }));

  await expect(upsertContentUnlock({ ...SAJU_INPUT, session: {} })).rejects.toMatchObject({ code: 11000 });
  // 11000 은 트랜잭션을 abort 시키므로 같은 세션의 재조회는 NoSuchTransaction 이 된다.
  expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
});

test("11000 이 아닌 오류는 복구를 시도하지 않는다", async () => {
  findOneAndUpdate.mockReturnValueOnce(chain(async () => { throw new Error("boom"); }));

  await expect(upsertContentUnlock(SAJU_INPUT)).rejects.toThrow("boom");
  expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
});

test("연도별 상품은 featureKey 가 같아도 다른 연도 행을 매칭하지 않는다", async () => {
  findOneAndUpdate.mockReturnValueOnce(chain(async () => ({ _id: "row-2027" })));

  await upsertContentUnlock({
    userId: "user-1",
    profileId: "profile-1",
    serviceKey: "sukuyo",
    contentKey: "sukyo_yearly_fortune_unlock:2027",
    featureKey: "sukyo_yearly_fortune_unlock",
    scope: "PROFILE",
    source: "PAYMENT",
  });

  const [featureClause] = findOneAndUpdate.mock.calls[0][0].$or;
  expect(featureClause).toEqual({
    featureKey: "sukyo_yearly_fortune_unlock",
    contentKey: "sukyo_yearly_fortune_unlock:2027",
  });
});

test("contentKey 별칭 치유는 유지된다", async () => {
  findOneAndUpdate.mockReturnValueOnce(chain(async () => ({ _id: "row-saju" })));

  await upsertContentUnlock(SAJU_INPUT);

  const [featureClause] = findOneAndUpdate.mock.calls[0][0].$or;
  expect(featureClause.featureKey).toBe("section_summary");
  expect(featureClause.contentKey.$in).toEqual(expect.arrayContaining(["saju.fullReading", "section_summary"]));
});
