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
import { listProducts, resolveProduct } from "../../worker/payments/catalog.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { testCard } from "../fixtures/profile-card-model.mjs";
import { isBirthScopedUnlockFeatureKey } from "../../worker/lib/paid-feature-registry.js";

const USER = "64b000000000000000000001";
const ENV = { JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };

// 영구 해금형(per_use 가 아닌) 상품을 레지스트리에서 고른다.
const UNLOCK_ITEM = listProducts().find((p) => p.billingType !== "per_use" && !p.monthlyExcluded && Number(p.priceCoins) > 0);
// 출생 기반 해금은 이 계정의 저장 프로필로만 산다. p2 는 p1 과 출생 정보가 같고, p3 는 다르다.
const CARDS = [
  testCard("p1", { userId: USER }),
  testCard("p2", { userId: USER }),
  testCard("p3", { userId: USER, day: 18 }),
];
const makeDb = (options = {}) => makeFakePaymentDb({ ...options, profileCards: CARDS });

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

async function postMoonstone(db, requestId, profileId = "p1") {
  const request = new Request("https://code-destiny.com/api/payments/coin-gate/moonstone", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenFor(USER)}` },
    body: JSON.stringify({ featureKey: UNLOCK_ITEM.featureKey, paymentMode: "MOONLIGHT_STONE", requestId, ...(profileId ? { profileId } : {}) }),
  });
  const opsBefore = db.ctx.ops;
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json(), ops: db.ctx.ops - opsBefore };
}

const ledgerCount = (db) => db.rows.filter((row) => row.type === "MONTHLY_CREDIT_SPEND").length;
const entitlementCount = (db) => db.rows.filter((row) => row.grantType === "permanent_unlock").length;

function seedBrokeUser(db) {
  const user = {
    _id: USER,
    points: 0,
    unlockedFeatures: [],
    paidFeatures: [],
    profileSubscription: {
      membershipCreditBalance: 0,
      membershipCreditGranted: 0,
      membershipCreditUsed: 0,
      membershipCreditLotsVersion: 0,
      membershipCreditLots: [],
    },
  };
  db.rows.push(user);
  return user;
}

test("🔴 월정석: 첫 결제는 차감하고, 같은 콘텐츠 재열람은 다시 깎지 않는다", async () => {
  if (!UNLOCK_ITEM) return;
  const db = makeDb();
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

test("과거 서비스 키의 출생 권한은 월정석 재열람에서 다시 차감하지 않는다", async () => {
  expect(isBirthScopedUnlockFeatureKey(UNLOCK_ITEM.featureKey)).toBe(true);
  const db = makeDb();
  const user = seedFundedUser(db);
  const first = await postMoonstone(db, "historical-key-buy");
  expect(first.response.status).toBe(200);
  const row = db.rows.find(item => item.grantType === "permanent_unlock");
  expect(row).toBeTruthy();
  row.serviceKey = "paid_content";
  const balance = user.profileSubscription.membershipCreditBalance;
  const second = await postMoonstone(db, "historical-key-reopen", "p2");
  expect(second.response.status).toBe(200);
  expect(second.payload.data.consume).toMatchObject({ alreadyUnlocked: true, membershipCreditCost: 0 });
  expect(user.profileSubscription.membershipCreditBalance).toBe(balance);
  expect(ledgerCount(db)).toBe(1);
  expect(entitlementCount(db)).toBe(1);
});

/**
 * 🔴 위 규칙의 뒷면. "한 번 결제하면 계속 열린다"는 **결제가 실제로 일어났을 때만** 성립한다.
 *
 * 지급(grantEntitlement)이 차감보다 먼저 일어나는데 차감이 실패하면, 되돌리지 않는 한 사용자는
 * 402 를 받고도 영구 해금을 갖는다 — 잔액 0 인 계정이 유료 콘텐츠를 무료로 여는 경로다.
 * withPaymentDb 는 트랜잭션이 아니므로 아무도 대신 걷어 주지 않는다.
 */
test("🔴 월정석 잔액이 부족하면 해금이 남지 않는다 — 402 를 받고 무료로 열리면 안 된다", async () => {
  if (!UNLOCK_ITEM) return;
  const db = makeDb();
  const user = seedBrokeUser(db);

  const denied = await postMoonstone(db, "broke-attempt-1");
  expect(denied.response.status).toBe(402);
  expect(denied.payload.code).toBe("INSUFFICIENT_MONTHLY_CREDITS");

  // 지급이 남아 있으면 다음 진입이 무료가 된다. 권한·해금목록·원장 어디에도 흔적이 없어야 한다.
  expect(entitlementCount(db)).toBe(0);
  expect(user.unlockedFeatures || []).not.toContain(UNLOCK_ITEM.featureKey);
  expect(user.paidFeatures || []).not.toContain(UNLOCK_ITEM.featureKey);
  expect(ledgerCount(db)).toBe(0);

  // 새 requestId 로 다시 눌러도 alreadyUnlocked 무료 경로로 접히지 않는다.
  const retry = await postMoonstone(db, "broke-attempt-2");
  expect(retry.response.status).toBe(402);
  expect(entitlementCount(db)).toBe(0);
});

test("🔴 월정석 출생 단위: 같은 출생의 다른 프로필은 다시 깎지 않고, 다른 출생은 새로 차감한다", async () => {
  if (!UNLOCK_ITEM || !isBirthScopedUnlockFeatureKey(UNLOCK_ITEM.featureKey)) return;
  const db = makeDb();
  const user = seedFundedUser(db);
  await postMoonstone(db, "birth-buy-1", "p1");
  const afterFirst = Number(user.profileSubscription.membershipCreditBalance);

  const sameBirth = await postMoonstone(db, "birth-same-2", "p2");
  expect(sameBirth.payload.data.consume.alreadyUnlocked).toBe(true);
  expect(Number(user.profileSubscription.membershipCreditBalance)).toBe(afterFirst);

  const otherBirth = await postMoonstone(db, "birth-other-3", "p3");
  expect(otherBirth.response.status).toBe(200);
  expect(otherBirth.payload.data.consume.alreadyUnlocked).toBe(false);
  expect(Number(user.profileSubscription.membershipCreditBalance)).toBeLessThan(afterFirst);
  expect(ledgerCount(db)).toBe(2);
});

test("🔴 월정석 출생 단위: profileId 가 없거나 남의 프로필이면 차감 전에 거절한다", async () => {
  if (!UNLOCK_ITEM || !isBirthScopedUnlockFeatureKey(UNLOCK_ITEM.featureKey)) return;
  const db = makeDb();
  const user = seedFundedUser(db);
  const missing = await postMoonstone(db, "no-profile-1", "");
  expect(missing.response.status).toBe(400);
  expect(missing.payload.code).toBe("MISSING_PROFILE_ID");
  const foreign = await postMoonstone(db, "foreign-profile-2", "someone-elses");
  expect(foreign.response.status).toBe(403);
  expect(foreign.payload.code).toBe("INVALID_PROFILE");
  expect(Number(user.profileSubscription.membershipCreditBalance)).toBe(100000);
  expect(ledgerCount(db)).toBe(0);
  expect(entitlementCount(db)).toBe(0);
});

test("재열람 응답은 모르는 잔액을 0 으로 싣지 않는다 — 해금 증빙은 그대로 싣는다", async () => {
  if (!UNLOCK_ITEM) return;
  const db = makeDb();
  seedFundedUser(db);
  await postMoonstone(db, "unlock-buy-3");
  const { payload } = await postMoonstone(db, "unlock-reopen-4");

  expect(payload.data.consume.monthlyStoneBalance).toBeUndefined();
  expect(payload.data.balance).toBeUndefined();
  expect(payload.data.unlockMap[UNLOCK_ITEM.featureKey]).toBe(true);
});


test('profile moonstone adapter rejects new subminimum purchases without debit',async()=>{
 const db=makeDb({uniqueKeys:[['userId','type','sourceId']]});const user=seedFundedUser(db);
 const requestId='profile-card:delete:yn_test:adapter';
 async function send(actionType='profile_card_delete') {
  return handlePaymentsContext(new Request('https://code-destiny.com/api/payments/coin-gate/moonstone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await tokenFor(USER)}`},body:JSON.stringify({featureKey:'profile-card-manage',paymentMode:'MOONLIGHT_STONE',profileId:'yn_test',requestId,actionType})}),ENV,{prefix:'/api/payments',withDb:(_e,_c,fn)=>fn(db)});
 }
 expect((await send()).status).toBe(402);expect((await send()).status).toBe(402);
 expect(db.rows.filter(r=>r.type==='MONTHLY_CREDIT_SPEND')).toHaveLength(0);
 expect(user.profileSubscription.membershipCreditBalance).toBe(100000);
 expect((await send('profile_card_update')).status).toBe(402);
});

/**
 * 🔴 출생 기반 전환 이전에 산 고객(레거시 USER·PROFILE 행)은 월정석·이용권을 골라도 다시 깎이지 않는다.
 * coin-gate 의 월정석·이용권 갈래는 billing.js 를 거치지 않고 여기로 오므로 같은 레거시 규칙을 따로 고정한다.
 * 2026-06 무렵 행은 featureKey 없이 contentKey 만 있다.
 */
describe("레거시 해금 행(출생 기반 전환 이전 구매)", () => {
  const DAEWUN = resolveProduct({ featureKey: "section_daewun" });
  const legacyRow = (extra) => ({ userId: USER, serviceKey: "saju", contentKey: "saju.daeunAnalysis", status: "ACTIVE", expiresAt: null, grantType: "permanent_unlock", ...extra });

  async function post(db, path, body) {
    const request = new Request(`https://code-destiny.com/api/payments/coin-gate/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenFor(USER)}` },
      body: JSON.stringify({ featureKey: DAEWUN.featureKey, ...body }),
    });
    const response = await handlePaymentsContext(request, ENV, { prefix: "/api/payments", withDb: (_env, _ctx, fn) => fn(db) });
    return { response, payload: await response.json() };
  }

  test.each([
    ["USER 행 · 프로필 없음", { scope: "USER", profileId: "__user__" }, ""],
    ["USER 행 · 다른 출생 카드", { scope: "USER", profileId: "__user__" }, "p3"],
    ["PROFILE 행 · 그 카드", { scope: "PROFILE", profileId: "p1" }, "p1"],
  ])("월정석: %s 는 차감 없이 already_unlocked", async (_label, row, profileId) => {
    const db = makeDb();
    const user = seedFundedUser(db);
    db.rows.push(legacyRow(row));
    const { response, payload } = await post(db, "moonstone", { paymentMode: "MOONLIGHT_STONE", requestId: `legacy-${profileId || "none"}`, ...(profileId ? { profileId } : {}) });
    expect(response.status).toBe(200);
    expect(payload.data.consume.alreadyUnlocked).toBe(true);
    expect(Number(user.profileSubscription.membershipCreditBalance)).toBe(100000);
    expect(ledgerCount(db)).toBe(0);
  });

  test.each(["saju", "section_daewun", "paid_content"])("이용권: 과거 USER 권한 %s는 다시 소비하지 않는다", async serviceKey => {
    const db = makeDb();
    const pass = { tier: "family", passTier: "family", isActive: true, expiresAt: new Date(Date.now() + 10 * 86400000) };
    const user = { _id: USER, points: 0, profileSubscription: pass };
    db.rows.push(user, legacyRow({ scope: "USER", profileId: "__user__", serviceKey }));
    const { response, payload } = await post(db, "pass-check", { paymentMode: "MEMBERSHIP_PASS", requestId: `legacy-pass-${serviceKey}` });
    expect(response.status).toBe(200);
    expect(payload.data.consume.alreadyUnlocked).toBe(true);
    expect(Number(user.profileSubscription.monthlySpendCoin || 0)).toBe(0);
  });

  test("월정석: 다른 카드의 레거시 PROFILE 행으로는 열리지 않고 새로 차감한다", async () => {
    const db = makeDb();
    const user = seedFundedUser(db);
    db.rows.push(legacyRow({ scope: "PROFILE", profileId: "p1" }));
    const { response, payload } = await post(db, "moonstone", { paymentMode: "MOONLIGHT_STONE", requestId: "legacy-other-card", profileId: "p3" });
    expect(response.status).toBe(200);
    expect(payload.data.consume.alreadyUnlocked).toBe(false);
    expect(Number(user.profileSubscription.membershipCreditBalance)).toBeLessThan(100000);
  });

  test("이용권: 레거시 USER 행이면 저장 프로필 없이도 예산을 깎지 않는다", async () => {
    const db = makeDb();
    const pass = { tier: "family", passTier: "family", isActive: true, expiresAt: new Date(Date.now() + 10 * 86400000) };
    const user = { _id: USER, points: 0, profileSubscription: pass };
    db.rows.push(user, legacyRow({ scope: "USER", profileId: "__user__" }));
    const { response, payload } = await post(db, "pass-check", { paymentMode: "MEMBERSHIP_PASS", requestId: "legacy-pass" });
    expect(response.status).toBe(200);
    expect(payload.data.consume.alreadyUnlocked).toBe(true);
    expect(Number(user.profileSubscription.monthlySpendCoin || 0)).toBe(0);
  });
});
