/**
 * @jest-environment node
 *
 * 사주 영구 묶음: 포함·판매 종료 키의 신규 개별 판매가 V2 결제(주문 발급·이용권·월정석)에서도 닫힌다.
 * 닫힌 뒤에도 산 것은 열리고(보유가 먼저), 닫히기 전에 만든 주문의 확정은 권리를 그대로 지급한다.
 * 가짜 드라이버·인메모리 DB 만 쓴다(PG·운영 DB 호출 없음).
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { resolveProduct } from "../../worker/payments/catalog.js";
import { findOwnedEntitlement, grantEntitlement } from "../../worker/payments/entitlements.js";
import { resolvePaymentBirthIdentity } from "../../worker/payments/birth-identity.js";
import { SAJU_BUNDLE_FEATURE_KEY, SAJU_BUNDLE_SALE_CLOSED_KEYS } from "../../worker/lib/saju-bundle-policy.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { testCard } from "../fixtures/profile-card-model.mjs";

const USER = "64b000000000000000000001";
const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};
const CARDS = [
  testCard("p1", { userId: USER }),
  testCard("p2", { userId: USER }), // p1 과 같은 출생
  testCard("p3", { userId: USER, day: 18 }), // 다른 출생
];
const makeDb = () => makeFakePaymentDb({ profileCards: CARDS });
const DAY_MS = 86400000;

async function tokenFor(userId) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, ENV);
}

async function post(db, path, body, extra = {}) {
  const request = new Request(`https://code-destiny.com/api/payments${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenFor(USER)}` },
    body: JSON.stringify(body),
  });
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    withDb: (_env, _ctx, fn) => fn(db),
    ...extra,
  });
  return { response, payload: await response.json() };
}

function seedUser(db, { subscription = null, credit = 0 } = {}) {
  const grantedAt = new Date();
  const user = {
    _id: USER,
    points: 0,
    email: "buyer@example.com",
    name: "테스터",
    phoneNumber: "01012345678",
    profileSubscription: subscription || (credit ? {
      membershipCreditBalance: credit,
      membershipCreditGranted: credit,
      membershipCreditUsed: 0,
      membershipCreditLotsVersion: 0,
      membershipCreditLots: [{ amount: credit, remaining: credit, grantedAt, expiresAt: new Date(Date.now() + 30 * DAY_MS) }],
    } : undefined),
  };
  db.rows.push(user);
  return user;
}

const orderRows = (db) => db.rows.filter((row) => row.merchantUid);
const entitlementRows = (db) => db.rows.filter((row) => row.grantType === "permanent_unlock");
const ledgerCount = (db) => db.rows.filter((row) => row.type === "MONTHLY_CREDIT_SPEND").length;

async function grantBundle(db, profileId = "p1") {
  const product = resolveProduct({ featureKey: SAJU_BUNDLE_FEATURE_KEY });
  return grantEntitlement(db, { userId: USER, product, orderId: "cdbundleorder0000000000000000000000000", profileId });
}

describe("KRW 주문 생성은 판매 종료 키를 닫는다", () => {
  test("KRW 주문 생성은 409다 — /orders·/prepare 모두 주문을 만들지 않는다", async () => {
    const db = makeDb();
    seedUser(db);
    for (const featureKey of SAJU_BUNDLE_SALE_CLOSED_KEYS) {
      const orders = await post(db, "/orders", { featureKey, profileId: "p1", idempotencyKey: `closed-orders-${featureKey}` });
      expect({ featureKey, status: orders.response.status, code: orders.payload.code })
        .toEqual({ featureKey, status: 409, code: "PRODUCT_SALE_ENDED" });
      expect(orders.payload.bundleFeatureKey).toBe(SAJU_BUNDLE_FEATURE_KEY);
      const prepare = await post(db, "/prepare", {
        paymentType: "digital_content", featureKey, profileId: "p1", idempotencyKey: `closed-prepare-${featureKey}`,
      }, { legacyEnvelope: "prepare" });
      expect({ featureKey, status: prepare.response.status }).toEqual({ featureKey, status: 409 });
      expect(JSON.stringify(prepare.payload)).toContain("PRODUCT_SALE_ENDED");
    }
    expect(orderRows(db)).toHaveLength(0);
  });

  test("묶음 자체는 계속 주문할 수 있다(29,000원)", async () => {
    const db = makeDb();
    seedUser(db);
    const { response, payload } = await post(db, "/orders", {
      featureKey: SAJU_BUNDLE_FEATURE_KEY, profileId: "p1", idempotencyKey: "bundle-order-1",
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.amountKRW).toBe(29000);
    expect(orderRows(db)).toHaveLength(1);
  });

  test("회당 키와 타로·숙요·베다·점성 주문은 그대로 만들어진다", async () => {
    const db = makeDb();
    seedUser(db);
    for (const featureKey of ["fortune-chat-consultation", "tarot-myeongri-three-card", "sukuyo-nature-deep-dive", "vedic_basic_reading", "astro_basic_deep_pack"]) {
      const { response, payload } = await post(db, "/orders", { featureKey, profileId: "p1", idempotencyKey: `open-${featureKey}` });
      expect({ featureKey, status: response.status, code: payload.code }).toEqual({ featureKey, status: 200, code: undefined });
    }
  });
});

describe("확정 경로는 닫힘의 영향을 받지 않는다", () => {
  test("판매 종료 전에 만든 주문의 확정은 권리를 부여한다", async () => {
    const db = makeDb();
    seedUser(db);
    const merchantUid = "cdclosedconfirm00000000000000000000000";
    db.rows.push({
      merchantUid,
      userId: USER,
      productId: "section_daewun",
      featureKey: "section_daewun",
      paymentType: "digital_content",
      status: "paid",
      orderState: "PAID_VERIFIED",
      paymentAmount: 5000,
      impUid: "portone-tx-closed",
      paidAt: new Date(),
      entitlementGrantedAt: null,
      pricingSnapshot: { profileId: "p1" },
      createdAt: new Date(),
    });
    const { response, payload } = await post(db, "/confirm", {
      merchantUid, impUid: "portone-tx-closed", paymentId: "portone-tx-closed", featureKey: "section_daewun",
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.code).not.toBe("PRODUCT_SALE_ENDED");
    expect(payload.accessGrant).toMatchObject({ ok: true, featureKey: "section_daewun" });
    const rows = entitlementRows(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ featureKey: "section_daewun", orderId: merchantUid, status: "ACTIVE" });
  });
});

describe("보유가 판매 종료 판정보다 먼저다 — 월정석·이용권", () => {
  test("월정석: 묶음 보유 프로필의 포함 키는 차감 없이 already_unlocked, 비보유는 409", async () => {
    const db = makeDb();
    const user = seedUser(db, { credit: 100000 });
    await grantBundle(db, "p1");
    const owned = await post(db, "/coin-gate/moonstone", { featureKey: "section_daewun", paymentMode: "MOONLIGHT_STONE", requestId: "moon-owned-1", profileId: "p2" });
    expect(owned.response.status).toBe(200);
    expect(owned.payload.data.consume).toMatchObject({ alreadyUnlocked: true, chargedCoins: 0, membershipCreditCost: 0 });
    expect(user.profileSubscription.membershipCreditBalance).toBe(100000);

    const otherBirth = await post(db, "/coin-gate/moonstone", { featureKey: "section_daewun", paymentMode: "MOONLIGHT_STONE", requestId: "moon-other-2", profileId: "p3" });
    expect(otherBirth.response.status).toBe(409);
    expect(otherBirth.payload.code).toBe("PRODUCT_SALE_ENDED");
    expect(otherBirth.payload.bundleFeatureKey).toBe(SAJU_BUNDLE_FEATURE_KEY);
    expect(user.profileSubscription.membershipCreditBalance).toBe(100000);
    expect(ledgerCount(db)).toBe(0);
    expect(entitlementRows(db)).toHaveLength(1);
  });

  test("월정석: 이미 산 개별 키(묶음 없음)는 계속 열린다", async () => {
    const db = makeDb();
    seedUser(db, { credit: 100000 });
    await grantEntitlement(db, { userId: USER, product: resolveProduct({ featureKey: "section_daewun" }), orderId: "cdoldorder000000000000000000000000000", profileId: "p1" });
    const { response, payload } = await post(db, "/coin-gate/moonstone", { featureKey: "section_daewun", paymentMode: "MOONLIGHT_STONE", requestId: "moon-old-1", profileId: "p1" });
    expect(response.status).toBe(200);
    expect(payload.data.consume.alreadyUnlocked).toBe(true);
    expect(ledgerCount(db)).toBe(0);
  });

  test("월정석 직접 차감(/moonstone/spend)도 판매 종료 키는 409이고 차감·지급이 없다", async () => {
    const db = makeDb();
    const user = seedUser(db, { credit: 100000 });
    const { response, payload } = await post(db, "/moonstone/spend", { featureKey: "section_daewun", idempotencyKey: "spend-closed-1", profileId: "p1" });
    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ code: "PRODUCT_SALE_ENDED", bundleFeatureKey: SAJU_BUNDLE_FEATURE_KEY });
    expect(user.profileSubscription.membershipCreditBalance).toBe(100000);
    expect(ledgerCount(db)).toBe(0);
    expect(entitlementRows(db)).toHaveLength(0);
  });

  test("이용권: 활성 이용권이 있어도 묶음·판매 종료 키를 열거나 차감하지 않는다", async () => {
    const db = makeDb();
    const subscription = { tier: "vvip", passTier: "vvip", isActive: true, expiresAt: new Date(Date.now() + 10 * DAY_MS) };
    const user = seedUser(db, { subscription });
    for (const featureKey of ["section_daewun", SAJU_BUNDLE_FEATURE_KEY]) {
      const { response, payload } = await post(db, "/coin-gate/pass-check", { featureKey, requestId: `pass-${featureKey}`, profileId: "p1" });
      expect(response.status).not.toBe(200);
      expect(payload.data?.consume?.ok).not.toBe(true);
      expect(payload.data?.consume?.alreadyUnlocked).not.toBe(true);
    }
    expect(user.profileSubscription.monthlySpendCoin || 0).toBe(0);
    expect(entitlementRows(db)).toHaveLength(0);
  });

  test("이용권: 묶음 보유 프로필의 포함 키는 already_unlocked, 비보유는 409", async () => {
    const db = makeDb();
    seedUser(db, { subscription: { tier: "vvip", passTier: "vvip", isActive: true, expiresAt: new Date(Date.now() + 10 * DAY_MS) } });
    await grantBundle(db, "p1");
    const owned = await post(db, "/coin-gate/pass-check", { featureKey: "section_summary", requestId: "pass-owned-1", profileId: "p2" });
    expect(owned.response.status).toBe(200);
    expect(JSON.stringify(owned.payload)).toContain("alreadyUnlocked");
    expect(owned.payload.data.consume.alreadyUnlocked).toBe(true);
    const other = await post(db, "/coin-gate/pass-check", { featureKey: "section_summary", requestId: "pass-other-2", profileId: "p3" });
    expect(other.response.status).toBe(409);
    expect(other.payload.code).toBe("PRODUCT_SALE_ENDED");
  });
});

describe("findOwnedEntitlement는 묶음 별칭을 읽는다(공유 리더와 같은 규칙)", () => {
  test("묶음을 가진 프로필의 포함 키 요청은 already_unlocked다", async () => {
    const db = makeDb();
    await grantBundle(db, "p1");
    const product = resolveProduct({ featureKey: "section_daewun" });
    const sameBirth = await findOwnedEntitlement(db, { userId: USER, product, profileId: "p2" });
    expect(sameBirth.owned).toBe(true);
    expect(sameBirth.entitlement.featureKey).toBe(SAJU_BUNDLE_FEATURE_KEY);
    expect(sameBirth.identity.featureKey).toBe("section_daewun");
    const otherBirth = await findOwnedEntitlement(db, { userId: USER, product, profileId: "p3" });
    expect(otherBirth.owned).toBe(false);
  });

  test("포함 키가 아니면 묶음 행으로 열리지 않고, 궁합 신원(상대 출생)은 별칭을 쓰지 않는다", async () => {
    const db = makeDb();
    await grantBundle(db, "p1");
    const notMember = await findOwnedEntitlement(db, { userId: USER, product: resolveProduct({ featureKey: "astro_basic_deep_pack" }), profileId: "p1" });
    expect(notMember.owned).toBe(false);
    const own = await resolvePaymentBirthIdentity(db, { userId: USER, profileId: "p1", featureKey: "section_daewun" });
    const partnerIdentity = { ...own, partnerBirthKey: "partner-birth-key", partnerProfileId: "p2" };
    const viaPartner = await findOwnedEntitlement(db, {
      userId: USER, product: resolveProduct({ featureKey: "section_daewun" }), profileId: "p1", birthIdentity: partnerIdentity,
    });
    expect(viaPartner.owned).toBe(false);
  });

  test("묶음 별칭은 읽기 전용이다 — 확정 지급은 포함 키 개별 행을 따로 남긴다", async () => {
    const db = makeDb();
    await grantBundle(db, "p1");
    const result = await grantEntitlement(db, {
      userId: USER, product: resolveProduct({ featureKey: "section_daewun" }), orderId: "cdmemberorder0000000000000000000000000", profileId: "p2",
    });
    expect(result.alreadyOwned).not.toBe(true);
    expect(entitlementRows(db).map((row) => row.featureKey).sort()).toEqual(["section_daewun", SAJU_BUNDLE_FEATURE_KEY].sort());
  });
});
