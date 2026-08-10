/**
 * @jest-environment node
 *
 * 단계 ⑥ 지급 깔때기.
 *
 * 🔴 여기서 지키는 가장 중요한 것: **인덱스가 있다고 가정하지 않는다.**
 * 2026-08-11 프로덕션 실측에서 permanent_unlock_identity 는 선언만 있고 만들어진 적이 없었다
 * (db.js autoIndex:false + 마이그레이션 미실행). 그 인덱스에 기대는 중복 방지는 지금 작동하지 않으므로,
 * 지급 멱등성은 **실제로 존재하는 인덱스에 맞춘 결정적 신원 키 + E11000 폴백**으로 선다.
 */
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
} from "../../worker/lib/models.js";
import { USER_SCOPE_PROFILE_ID } from "../../worker/lib/content-unlocks.js";
import {
  grantEntitlement,
  markUserFeatureUnlocked,
  resolveEntitlementIdentity,
  revokeEntitlementForOrder,
} from "../../worker/payments/entitlements.js";
import { PaymentError } from "../../worker/payments/errors.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "507f1f77bcf86cd799439011";
const PRODUCT = {
  productId: "master-love-codex",
  featureKey: "master-love-codex",
  priceKRW: 30000,
  priceCoins: 300,
};
const ORDER = "cdorder1";

describe("신원 키는 결정적이다", () => {
  test("profileId 가 없으면 계정 스코프로 접힌다", () => {
    const identity = resolveEntitlementIdentity({ featureKey: "master-love-codex" });
    expect(identity.scope).toBe(CONTENT_ENTITLEMENT_SCOPES.USER);
    expect(identity.profileId).toBe(USER_SCOPE_PROFILE_ID);
    expect(identity.serviceKey).toBe("master-love-codex");
    expect(identity.contentKey).toBe("master-love-codex");
  });

  test("profileId 가 있으면 프로필 스코프다", () => {
    const identity = resolveEntitlementIdentity({ featureKey: "f1", profileId: "p1" });
    expect(identity.scope).toBe(CONTENT_ENTITLEMENT_SCOPES.PROFILE);
    expect(identity.profileId).toBe("p1");
  });

  test("scope 를 USER 로 명시하면 profileId 가 있어도 계정 스코프다", () => {
    const identity = resolveEntitlementIdentity({
      featureKey: "f1", profileId: "p1", scope: CONTENT_ENTITLEMENT_SCOPES.USER,
    });
    expect(identity.profileId).toBe(USER_SCOPE_PROFILE_ID);
  });

  test("🔴 contentKey 를 넘기면 그것이 신원을 가른다 — 연도별 상품이 서로를 덮지 않는다", () => {
    // featureKey 가 상수이고 contentKey 만 연도별로 다른 상품이 있다(sukyo_yearly_fortune_unlock).
    // contentKey 를 무시하면 한 프로필이 두 해를 보유하지 못한다.
    const y2026 = resolveEntitlementIdentity({ featureKey: "f1", profileId: "p1", contentKey: "2026" });
    const y2027 = resolveEntitlementIdentity({ featureKey: "f1", profileId: "p1", contentKey: "2027" });
    expect(y2026.contentKey).not.toBe(y2027.contentKey);
  });

  test("featureKey 가 없으면 만들지 않는다", () => {
    expect(() => resolveEntitlementIdentity({})).toThrow(PaymentError);
  });
});

describe("지급은 멱등이다", () => {
  test("처음 지급하면 alreadyOwned=false", async () => {
    const db = makeFakePaymentDb();
    const result = await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    expect(result.alreadyOwned).toBe(false);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].status).toBe(CONTENT_ENTITLEMENT_STATUSES.ACTIVE);
    expect(db.rows[0].source).toBe(CONTENT_ENTITLEMENT_SOURCES.PAYMENT);
    expect(db.rows[0].amountKRW).toBe(30000);
  });

  test("🔴 같은 주문을 몇 번 재생해도 권한은 한 벌이다", async () => {
    const db = makeFakePaymentDb();
    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    const second = await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    const third = await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    expect(db.rows).toHaveLength(1);
    expect(second.alreadyOwned).toBe(true);
    expect(third.alreadyOwned).toBe(true);
  });

  test("🔴 재생이 회계 사실을 덮어쓰지 않는다", async () => {
    // grantedAt·orderId 가 재생 때마다 바뀌면 "언제 무엇으로 샀는가"가 흔들려 환불 근거가 사라진다.
    const db = makeFakePaymentDb();
    const first = new Date("2026-08-11T00:00:00Z");
    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER, now: first });
    await grantEntitlement(db, {
      userId: USER, product: PRODUCT, orderId: "cdorder-LATER", now: new Date("2026-09-01T00:00:00Z"),
    });
    expect(db.rows[0].grantedAt).toEqual(first);
    expect(db.rows[0].orderId).toBe(ORDER);
  });

  test("🔴 인덱스가 있는 환경의 동시 경합(E11000)에서도 두 벌이 되지 않는다", async () => {
    let firstInsertDone = false;
    const db = makeFakePaymentDb({
      onDuplicate: () => {
        // 첫 insert 는 통과시키고, 그 다음 upsert 시도만 중복으로 튕긴다.
        if (!firstInsertDone) { firstInsertDone = true; return false; }
        return true;
      },
    });
    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    // 문서를 지워 upsert 경로로 다시 들어가게 한 뒤, 이번엔 E11000 을 맞게 한다.
    const saved = { ...db.rows[0] };
    db.rows.length = 0;
    db.rows.push(saved);
    const racing = await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    expect(racing.alreadyOwned).toBe(true);
    expect(db.rows).toHaveLength(1);
  });

  test("환불된 권한을 다시 사면 되살아난다", async () => {
    const db = makeFakePaymentDb();
    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    await revokeEntitlementForOrder(db, { orderId: ORDER });
    expect(db.rows[0].status).toBe(CONTENT_ENTITLEMENT_STATUSES.REFUNDED);

    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: "cdorder2" });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].status).toBe(CONTENT_ENTITLEMENT_STATUSES.ACTIVE);
  });

  test("로그인하지 않았으면 지급하지 않는다", async () => {
    const db = makeFakePaymentDb();
    await expect(grantEntitlement(db, { userId: "", product: PRODUCT, orderId: ORDER })).rejects.toThrow(PaymentError);
  });

  test("🔴 userId 는 String 으로 저장된다 — ObjectId 로 섞이면 unique 가 충돌하지 않는다", async () => {
    const db = makeFakePaymentDb();
    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    expect(typeof db.rows[0].userId).toBe("string");
    expect(db.rows[0].userId).toBe(USER);
  });
});

describe("환불 회수", () => {
  test("문서를 지우지 않고 상태만 바꾼다", async () => {
    const db = makeFakePaymentDb();
    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    expect(await revokeEntitlementForOrder(db, { orderId: ORDER })).toBe(true);
    expect(db.rows).toHaveLength(1);
    // 무엇을 언제 샀다가 환불했는지는 남아야 한다.
    expect(db.rows[0].orderId).toBe(ORDER);
    expect(db.rows[0].amountKRW).toBe(30000);
  });

  test("이미 환불된 것을 또 회수하지 않는다", async () => {
    const db = makeFakePaymentDb();
    await grantEntitlement(db, { userId: USER, product: PRODUCT, orderId: ORDER });
    await revokeEntitlementForOrder(db, { orderId: ORDER });
    expect(await revokeEntitlementForOrder(db, { orderId: ORDER })).toBe(false);
  });
});

describe("계정 해금 목록", () => {
  test("$addToSet 이라 몇 번을 불러도 한 번만 들어간다", async () => {
    const db = makeFakePaymentDb();
    await db.insertOne({}, { _id: USER });
    db.rows[0]._id = USER; // fake db 는 _id 를 자체 생성하므로 맞춰 준다

    await markUserFeatureUnlocked(db, { userId: USER, featureKey: "master-love-codex" });
    await markUserFeatureUnlocked(db, { userId: USER, featureKey: "master-love-codex" });
    expect(db.rows[0].unlockedFeatures).toEqual(["master-love-codex"]);
    expect(db.rows[0].paidFeatures).toEqual(["master-love-codex"]);
  });

  test("사용자가 없으면 조용히 false", async () => {
    const db = makeFakePaymentDb();
    expect(await markUserFeatureUnlocked(db, { userId: USER, featureKey: "f1" })).toBe(false);
    expect(await markUserFeatureUnlocked(db, { userId: "", featureKey: "f1" })).toBe(false);
  });
});
