/**
 * @jest-environment node
 *
 * 한 번 결제해 해금한 콘텐츠는 **결제수단과 무관하게** 재열람이 무료다.
 *
 * 규칙(2026-08-12 사용자 확정): "한번 결제 후 잠금 해제한 것은 결제 이후에는 계속 유지되고,
 * 월 예산을 또 깎으면 안 된다 — 어떤 결제로 해도 동일하다."
 *
 * 이용권 경로(pass-check)는 소유 확정을 소비보다 먼저 하도록 이미 고쳐 두었는데, 월정석 경로에는
 * 그 대칭이 빠져 있어 재열람마다 월정석이 다시 빠졌다. 여기서 두 경로를 같은 기준으로 고정한다.
 * 해금 레코드의 식별자 모양을 테스트가 추측하지 않도록, **실제 첫 결제를 거친 뒤** 재열람한다.
 * 부수 효과로 재열람은 차감·원장 기록을 통째로 건너뛰어 더 빠르다.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { listProducts } from "../../worker/payments/catalog.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const ENV = { JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };

// 영구 해금형(per_use 가 아닌) 상품을 레지스트리에서 고른다.
const UNLOCK_ITEM = listProducts().find((p) => p.billingType !== "per_use" && Number(p.priceCoins) > 0);

async function tokenFor(userId) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, ENV);
}

function seedFundedUser(db) {
  const grantedAt = new Date();
  const user = {
    _id: USER,
    points: 0,
    profileSubscription: {
      membershipCreditBalance: 100000,
      membershipCreditGranted: 100000,
      membershipCreditUsed: 0,
      membershipCreditLotsVersion: 0,
      membershipCreditLots: [{
        amount: 100000,
        remaining: 100000,
        grantedAt,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      }],
    },
  };
  db.rows.push(user);
  return user;
}

async function postMoonstone(db, requestId) {
  const request = new Request("https://code-destiny.com/api/payments/coin-gate/moonstone", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenFor(USER)}` },
    body: JSON.stringify({ featureKey: UNLOCK_ITEM.featureKey, paymentMode: "MOONLIGHT_STONE", requestId }),
  });
  const opsBefore = db.ctx.ops;
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json(), ops: db.ctx.ops - opsBefore };
}

const ledgerCount = (db) => db.rows.filter((row) => row.type === "MONTHLY_CREDIT_SPEND").length;

test("🔴 월정석: 첫 결제는 차감하고, 같은 콘텐츠 재열람은 다시 깎지 않는다", async () => {
  if (!UNLOCK_ITEM) return;
  const db = makeFakePaymentDb();
  const user = seedFundedUser(db);

  const first = await postMoonstone(db, "unlock-buy-1");
  expect(first.response.status).toBe(200);
  expect(first.payload.data.consume.alreadyUnlocked).toBe(false);
  const balanceAfterPurchase = Number(user.profileSubscription.membershipCreditBalance);
  expect(balanceAfterPurchase).toBeLessThan(100000); // 실제로 깎였다
  const ledgerAfterPurchase = ledgerCount(db);
  expect(ledgerAfterPurchase).toBe(1);

  // 재열람: 새 requestId(=새 클릭)라 멱등 마커로는 막히지 않는다. 소유 여부가 막아야 한다.
  const second = await postMoonstone(db, "unlock-reopen-2");
  expect(second.response.status).toBe(200);
  expect(second.payload.data.consume.alreadyUnlocked).toBe(true);
  expect(second.payload.data.consume.chargedCoins).toBe(0);
  expect(second.payload.data.consume.membershipCreditCost).toBe(0);
  // 잔액도 원장도 그대로다.
  expect(Number(user.profileSubscription.membershipCreditBalance)).toBe(balanceAfterPurchase);
  expect(ledgerCount(db)).toBe(ledgerAfterPurchase);
  // 재열람은 차감·원장을 건너뛰므로 왕복이 확 준다(= 더 빠르다).
  expect(second.ops).toBeLessThan(first.ops);
});

test("재열람 응답은 모르는 잔액을 0 으로 싣지 않는다 — 해금 증빙은 그대로 싣는다", async () => {
  if (!UNLOCK_ITEM) return;
  const db = makeFakePaymentDb();
  seedFundedUser(db);
  await postMoonstone(db, "unlock-buy-3");
  const { payload } = await postMoonstone(db, "unlock-reopen-4");

  expect(payload.data.consume.monthlyStoneBalance).toBeUndefined();
  expect(payload.data.balance).toBeUndefined();
  expect(payload.data.unlockMap[UNLOCK_ITEM.featureKey]).toBe(true);
});
