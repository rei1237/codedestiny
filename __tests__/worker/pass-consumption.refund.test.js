/**
 * @jest-environment node
 *
 * refundPassCoverage — consumePassForFeature 가 이미 차감한 monthlySpendCoin 을
 * 후속 AI 생성 실패 시 되돌리는 CAS 헬퍼. worker/payments/passes.js 의 consumePassCoverage
 * 와 같은 사이클키 일치 + 잔액 조건부 $inc 규칙을 반대 방향으로 검증한다.
 */
import { refundPassCoverage } from "../../worker/lib/pass-consumption.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const CYCLE_KEY = "2026-09-30T00:00:00.000Z";

function seed(db, { monthlySpendCoin, premiumUseCycleKey = CYCLE_KEY } = {}) {
  const user = {
    _id: USER,
    profileSubscription: {
      tier: "family", passTier: "family", isActive: true,
      premiumUseCycleKey, monthlySpendCoin, monthlyLimitCoin: 0,
    },
    recentConsumeRequestIds: [],
  };
  db.rows.push(user);
  return user;
}

test("사이클키가 일치하고 잔액이 충분하면 정확히 cost 만큼 되돌린다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300 });

  const result = await refundPassCoverage({ userId: USER, cycleKey: CYCLE_KEY, cost: 300, db });

  expect(result).toMatchObject({ refunded: true, amount: 300 });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(0);
});

test("사이클이 넘어간 뒤에는 다른 달 카운터를 건드리지 않고 조용히 skip 한다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300, premiumUseCycleKey: "old-cycle" });

  const result = await refundPassCoverage({ userId: USER, cycleKey: CYCLE_KEY, cost: 300, db });

  expect(result).toMatchObject({ refunded: false, skipped: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(300);
});

test("잔액이 환불액보다 적으면(끼어든 다른 소비) skip 하고 음수로 만들지 않는다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 100 });

  const result = await refundPassCoverage({ userId: USER, cycleKey: CYCLE_KEY, cost: 300, db });

  expect(result).toMatchObject({ refunded: false, skipped: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(100);
});

test("같은 요청을 재호출해도(재시도) 잔액 가드 때문에 이중 환불되지 않는다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300 });

  const first = await refundPassCoverage({ userId: USER, cycleKey: CYCLE_KEY, cost: 300, db });
  const second = await refundPassCoverage({ userId: USER, cycleKey: CYCLE_KEY, cost: 300, db });

  expect(first).toMatchObject({ refunded: true, amount: 300 });
  expect(second).toMatchObject({ refunded: false, skipped: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(0);
});

test("cost 가 0 이하이거나 cycleKey 가 없으면 DB 를 건드리지 않고 skip 한다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300 });

  expect(await refundPassCoverage({ userId: USER, cycleKey: CYCLE_KEY, cost: 0, db })).toMatchObject({ refunded: false, skipped: true });
  expect(await refundPassCoverage({ userId: USER, cycleKey: "", cost: 300, db })).toMatchObject({ refunded: false, skipped: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(300);
});
