/**
 * @jest-environment node
 *
 * Google Play 결제 서버 경로(worker/routes/app-store.js)의 핵심 계약 가드.
 *
 * 앱 매출은 전부 이 라우트를 지난다. 여기가 무가드로 남아 있으면 회귀가
 * 실결제 사고(중복 지급·타인 토큰 선점·환불 미회수·자동 환불)로만 드러난다.
 * 이 파일이 못박는 계약:
 *
 *   - verify: Play 영수증 검증 → Payment 기록(impUid=google:<tokenSHA256>) →
 *     권한 반영 → 서버 acknowledge(3일 내 미처리 시 Google이 자동 환불).
 *   - 멱등: 같은 토큰 재전송은 재지급 없이 idempotent로 끝난다.
 *   - 탈취 방어: 남의 토큰(기존 Payment 소유자 불일치)은 409, launchBillingFlow에
 *     주입한 obfuscatedAccountId가 다른 계정이면 409.
 *   - PER_USE는 unlockedFeatures에 남기지 않는다(남기면 영구 해금으로 굳어
 *     두 번째 구매가 불가능해진다). UNLOCK만 영속된다.
 *   - restore는 영구 해금만 되살린다 — PER_USE를 되살리면 1회 결제가 영구 무료가 된다.
 *   - RTDN 환불(voided)은 재조회 없이 즉시 회수한다(소비된 구매는 조회가 실패할
 *     수 있다). 이용권 환불은 productType이 아니라 paymentType으로 판정한다.
 *
 * 가격표·레지스트리는 실물(worker/lib/app-store-pricing.js 등 순수 테이블)을
 * 그대로 쓰고, DB·인증·Google API만 목으로 대체한다.
 */

// 정적 import를 쓰면 이 파일이 ESM으로 파싱되어 jest 전역이 사라진다.
// 이 레포의 워커 테스트 관례(CJS 파일 + jest.unstable_mockModule + 동적 import)를 따른다.
const { createHash, generateKeyPairSync } = require("node:crypto");

const USER_ID = "64b000000000000000000001";

class FakeObjectId {
  constructor(id) { this.id = String(id); }
  toString() { return this.id; }
}

const mockConnectDb = jest.fn(async () => undefined);
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: mockConnectDb,
  mongoose: { Types: { ObjectId: FakeObjectId } },
}));

jest.unstable_mockModule("../../worker/lib/env.js", () => ({
  getEnv: (env, key) => (env && env[key] != null ? String(env[key]) : ""),
}));

const mockRequireAuth = jest.fn();
jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  requireAuth: mockRequireAuth,
}));

jest.unstable_mockModule("../../worker/lib/security/index.js", () => ({
  writeSecurityLog: jest.fn(async () => null),
}));

const mockPaymentFindOne = jest.fn();
const mockPaymentCreate = jest.fn();
const mockPaymentFind = jest.fn();
const mockPaymentFindByIdAndUpdate = jest.fn(async () => ({}));
// 회수 claim 은 "취소 아님 → 취소" 전이에 성공한 요청만 통과시킨다. 기본값은 성공(문서 반환),
// 재전송을 흉내낼 때는 null 을 돌려주면 된다.
const mockPaymentFindOneAndUpdate = jest.fn(() => ({ lean: async () => ({ _id: "pay-1" }) }));
const mockUserFindById = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn();
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  Payment: {
    findOne: mockPaymentFindOne,
    create: mockPaymentCreate,
    find: mockPaymentFind,
    findByIdAndUpdate: mockPaymentFindByIdAndUpdate,
    findOneAndUpdate: mockPaymentFindOneAndUpdate,
  },
  User: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
  },
}));

const mockIntentCreate = jest.fn(async (doc) => ({ _id: "intent-1", ...doc }));
const mockIntentFindOne = jest.fn();
const mockIntentFindOneAndUpdate = jest.fn(async () => null);
jest.unstable_mockModule("../../worker/lib/app-store-models.js", () => ({
  AppPurchaseIntent: {
    create: mockIntentCreate,
    findOne: mockIntentFindOne,
    findOneAndUpdate: mockIntentFindOneAndUpdate,
  },
  APP_PURCHASE_INTENT_TTL_MS: 30 * 60 * 1000,
}));

// await 직접(then)과 .lean() 체인 양쪽으로 소비되는 mongoose 반환값 흉내.
function leanable(value) {
  return Object.assign(Promise.resolve(value), { lean: async () => value });
}

// Payment.find() 쿼리 빌더 흉내. select/sort/limit 은 순서와 무관하게 자기 자신을 돌려주므로
// 라우트가 체인 순서를 바꿔도(예: projection 추가) 이 mock 은 따라 깨지지 않는다.
function paymentFindChain(rows) {
  const chain = {
    select: () => chain,
    sort: () => chain,
    limit: () => chain,
    lean: async () => rows,
  };
  return chain;
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

let ENV;
let appStore;
let registry;
let billingRegistry;
let appPricing;
let perUse;   // { key, coin, tier } — 회당 결제 기능 (티어 SKU 등록 가격대)
let unlock;   // { key, coin, tier } — 영구 해금 기능
let freeKey;  // 앱 무료 통과(≤5코인) 기능

// Google API fetch 목 상태 (테스트별로 조정)
let googlePurchasePayload;
let googlePurchaseStatus;
let acknowledgeCalls;

function pickFeatureKey(billingType, { excludeTierId } = {}) {
  for (const key of Object.keys(registry.FEATURE_KEY_PRICE_TABLE)) {
    if (registry.getPaidFeatureBillingType(key) !== billingType) continue;
    const result = billingRegistry.getBillingFeaturePricing({ featureKey: key });
    if (!result?.ok || !result.pricing) continue;
    const coin = Math.floor(Number(result.pricing.coinPrice ?? result.pricing.cost ?? 0));
    if (!coin || appPricing.isAppFreeCoinPrice(coin)) continue;
    const tier = appPricing.resolveAppContentTier(coin);
    if (!tier) continue;
    if (excludeTierId && tier.productId === excludeTierId) continue;
    return { key, coin, tier };
  }
  throw new Error(`실물 레지스트리에서 ${billingType} 후보를 찾지 못했다.`);
}

function pickFreeFeatureKey() {
  for (const key of Object.keys(registry.FEATURE_KEY_PRICE_TABLE)) {
    const result = billingRegistry.getBillingFeaturePricing({ featureKey: key });
    if (!result?.ok || !result.pricing) continue;
    const coin = Math.floor(Number(result.pricing.coinPrice ?? result.pricing.cost ?? 0));
    if (appPricing.isAppFreeCoinPrice(coin)) return key;
  }
  return null; // 무료 구간 기능이 사라지면 해당 테스트만 건너뛴다.
}

function postJson(path, body, headers = {}) {
  return new Request(`https://code-destiny.com/api/app-store${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body || {}),
  });
}

async function callRoute(request) {
  const response = await appStore.handleAppStoreRoutes(request, ENV);
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

beforeAll(async () => {
  // 실제 pkcs8 키로 서비스 계정 JWT 서명 경로까지 그대로 태운다.
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  ENV = {
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({
      client_email: "svc@test.iam.gserviceaccount.com",
      private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
    }),
    GOOGLE_PLAY_PACKAGE_NAME: "com.codedestiny.app",
    GOOGLE_PLAY_RTDN_TOKEN: "rtdn-secret",
  };

  registry = await import("../../worker/lib/paid-feature-registry.js");
  billingRegistry = await import("../../worker/lib/billing-feature-registry.js");
  appPricing = await import("../../worker/lib/app-store-pricing.js");
  appStore = await import("../../worker/routes/app-store.js");

  perUse = pickFeatureKey(registry.PAID_FEATURE_BILLING_TYPES.PER_USE, { excludeTierId: "cd_content_tier_13" });
  unlock = pickFeatureKey(registry.PAID_FEATURE_BILLING_TYPES.UNLOCK);
  freeKey = pickFreeFeatureKey();
});

beforeEach(() => {
  jest.clearAllMocks();
  googlePurchasePayload = { purchaseState: 0, acknowledgementState: 0, obfuscatedExternalAccountId: "" };
  googlePurchaseStatus = 200;
  acknowledgeCalls = [];

  global.fetch = jest.fn(async (url) => {
    const href = String(url);
    if (href.startsWith("https://oauth2.googleapis.com/token")) {
      return { ok: true, status: 200, json: async () => ({ access_token: "gp-access-token", expires_in: 3600 }) };
    }
    if (href.includes(":acknowledge")) {
      acknowledgeCalls.push(href);
      return { ok: true, status: 200, json: async () => ({}) };
    }
    if (href.includes("androidpublisher.googleapis.com")) {
      return {
        ok: googlePurchaseStatus === 200,
        status: googlePurchaseStatus,
        json: async () => googlePurchasePayload,
      };
    }
    throw new Error(`예상 밖 fetch: ${href}`);
  });

  mockRequireAuth.mockResolvedValue({ userId: USER_ID });
  mockPaymentFindOne.mockReturnValue({ lean: async () => null });
  mockPaymentCreate.mockImplementation(async (doc) => ({
    ...doc,
    _id: "pay-new",
    toObject() { return { ...doc, _id: "pay-new" }; },
  }));
  mockPaymentFind.mockReturnValue(paymentFindChain([]));
  mockUserFindById.mockReturnValue({ lean: async () => ({ points: 0, unlockedFeatures: [] }) });
  mockUserFindByIdAndUpdate.mockImplementation(() => leanable({
    points: 0,
    unlockedFeatures: [],
    profileSubscription: null,
  }));
  mockIntentFindOne.mockReturnValue({ sort: () => ({ lean: async () => null }) });
});

describe("verify — 회당 결제(PER_USE)", () => {
  test("영수증 검증 → 멱등키 Payment 기록 → 앱 확정가 → 서버 acknowledge → consume 지시", async () => {
    const { status, payload } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: perUse.tier.productId,
      purchaseToken: "tok-per-use-1",
      requestId: "req-1",
    }));

    expect(status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.idempotent).toBe(false);

    expect(mockPaymentCreate).toHaveBeenCalledTimes(1);
    const doc = mockPaymentCreate.mock.calls[0][0];
    expect(doc.impUid).toBe(`google:${sha256Hex("tok-per-use-1")}`);
    // 청구액은 웹가(코인×100)가 아니라 Play 등록 앱 확정가여야 정산 대조가 맞는다.
    expect(doc.paymentAmount).toBe(perUse.tier.amountKRW);
    expect(doc.pricingSnapshot.webAmountKRW).toBe(perUse.coin * 100);
    expect(doc.paymentMethod).toBe("GOOGLE_PLAY");
    expect(doc.status).toBe("success");

    // 3일 내 acknowledge 미처리 시 Google이 자동 환불한다 — 서버가 반드시 수행.
    expect(acknowledgeCalls).toHaveLength(1);
    expect(payload.data.payment.acknowledged).toBe(true);

    // 티어 SKU는 가격대 공유라 소비하지 않으면 같은 가격대 전체가 잠긴다.
    expect(payload.data.appPurchase.shouldConsume).toBe(true);

    // PER_USE는 영구 권한으로 굳히지 않는다(굳히면 재구매 불가).
    expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("이미 acknowledge된 영수증에는 다시 acknowledge를 보내지 않는다", async () => {
    googlePurchasePayload = { purchaseState: 0, acknowledgementState: 1, obfuscatedExternalAccountId: "" };
    const { status, payload } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: perUse.tier.productId,
      purchaseToken: "tok-per-use-2",
    }));
    expect(status).toBe(200);
    expect(acknowledgeCalls).toHaveLength(0);
    expect(payload.data.payment.acknowledged).toBe(true);
  });

  test("미결제 상태(purchaseState≠0)는 402로 거부하고 아무것도 기록하지 않는다", async () => {
    googlePurchasePayload = { purchaseState: 1 };
    const { status, payload } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: perUse.tier.productId,
      purchaseToken: "tok-pending",
    }));
    expect(status).toBe(402);
    expect(payload.code).toBe("GOOGLE_PLAY_PURCHASE_NOT_PAID");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  test("클라이언트가 보낸 productId가 서버 티어와 다르면 400 — 임의 상품 결제 차단", async () => {
    const { status, payload } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: "cd_content_tier_13",
      purchaseToken: "tok-mismatch",
    }));
    expect(status).toBe(400);
    expect(payload.code).toBe("APP_STORE_PRODUCT_MISMATCH");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("verify — 영구 해금(UNLOCK)과 이용권", () => {
  test("UNLOCK 구매는 unlockedFeatures/paidFeatures에 영속된다", async () => {
    const { status } = await callRoute(postJson("/google/verify", {
      featureKey: unlock.key,
      productId: unlock.tier.productId,
      purchaseToken: "tok-unlock-1",
    }));
    expect(status).toBe(200);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledTimes(1);
    const update = mockUserFindByIdAndUpdate.mock.calls[0][1];
    expect(update.$addToSet.unlockedFeatures).toBe(unlock.key);
    expect(update.$addToSet.paidFeatures).toBe(unlock.key);
  });

  test("이용권(standard) 구매는 profileSubscription을 30일 활성으로 세팅한다", async () => {
    const before = Date.now();
    const { status, payload } = await callRoute(postJson("/google/verify", {
      passTier: "standard",
      productId: "cd_pass_standard_30d",
      purchaseToken: "tok-pass-1",
    }));
    expect(status).toBe(200);

    // 청구액은 앱 이용권 테이블(앱가 = 웹가)에서 온다 — 숫자를 박으면 가격 개정 때 여기가 먼저 거짓이 된다.
    const doc = mockPaymentCreate.mock.calls[0][0];
    expect(doc.paymentAmount).toBe(appPricing.resolveAppPassProduct("standard").amountKRW);
    expect(doc.paymentType).toBe("membership_pass");
    expect(doc.paymentMethod).toBe("GOOGLE_PLAY");

    // 이용권 판정(normalizeHoneyPassEntitlement)은 passTier + expiresAt 만으로 활성을 정한다.
    const update = mockUserFindByIdAndUpdate.mock.calls[0][1];
    expect(update.$set["profileSubscription.tier"]).toBe("standard");
    expect(update.$set["profileSubscription.passTier"]).toBe("standard");
    expect(update.$set["profileSubscription.productType"]).toBe("membership_pass");
    expect(update.$set["profileSubscription.paymentMethod"]).toBe("GOOGLE_PLAY");
    const expiresAt = update.$set["profileSubscription.expiresAt"];
    const expectedMs = 30 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime() - before).toBeGreaterThan(expectedMs - 60 * 1000);
    expect(expiresAt.getTime() - before).toBeLessThan(expectedMs + 60 * 1000);

    // 이용권도 inapp이므로 소비 대상이다(소비 안 하면 30일 뒤 재구매가 막힌다).
    expect(payload.data.appPurchase.shouldConsume).toBe(true);
  });
});

describe("verify — 멱등·탈취 방어", () => {
  test("같은 토큰 재전송은 재지급 없이 idempotent로 끝난다", async () => {
    mockPaymentFindOne.mockReturnValue({
      lean: async () => ({
        _id: "pay-existing",
        userId: USER_ID,
        featureKey: perUse.key,
        productId: perUse.tier.productId,
        merchantUid: "m-1",
      }),
    });
    const { status, payload } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: perUse.tier.productId,
      purchaseToken: "tok-replay-same-user",
    }));
    expect(status).toBe(200);
    expect(payload.data.idempotent).toBe(true);
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  test("다른 계정이 이미 쓴 토큰은 409 REPLAY로 차단한다", async () => {
    mockPaymentFindOne.mockReturnValue({
      lean: async () => ({
        _id: "pay-existing",
        userId: "64b000000000000000000999",
        featureKey: perUse.key,
        productId: perUse.tier.productId,
      }),
    });
    const { status, payload } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: perUse.tier.productId,
      purchaseToken: "tok-stolen",
    }));
    expect(status).toBe(409);
    expect(payload.code).toBe("GOOGLE_PLAY_PURCHASE_TOKEN_REPLAY");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  test("obfuscatedAccountId가 다른 계정이면 409 — 첫 선점 자체를 막는다", async () => {
    googlePurchasePayload = {
      purchaseState: 0,
      acknowledgementState: 0,
      obfuscatedExternalAccountId: "someone-elses-account-hash",
    };
    const { status, payload } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: perUse.tier.productId,
      purchaseToken: "tok-foreign-account",
    }));
    expect(status).toBe(409);
    expect(payload.code).toBe("GOOGLE_PLAY_PURCHASE_ACCOUNT_MISMATCH");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  test("obfuscatedAccountId가 본인 해시면 통과한다", async () => {
    googlePurchasePayload = {
      purchaseState: 0,
      acknowledgementState: 0,
      obfuscatedExternalAccountId: await appStore.obfuscatedAccountIdForUser(USER_ID),
    };
    const { status } = await callRoute(postJson("/google/verify", {
      featureKey: perUse.key,
      productId: perUse.tier.productId,
      purchaseToken: "tok-own-account",
    }));
    expect(status).toBe(200);
  });
});

describe("restore — 복원 범위", () => {
  test("영구 해금만 되살리고 회당 결제는 복원하지 않는다", async () => {
    mockPaymentFind.mockReturnValue(paymentFindChain([
      { _id: "p1", featureKey: unlock.key, productId: unlock.tier.productId, createdAt: new Date() },
      { _id: "p2", featureKey: perUse.key, productId: perUse.tier.productId, createdAt: new Date() },
    ]));
    const { status, payload } = await callRoute(postJson("/google/restore", {}));
    expect(status).toBe(200);
    expect(payload.data.restoredFeatures).toContain(unlock.key);
    expect(payload.data.restoredFeatures).not.toContain(perUse.key);

    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledTimes(1);
    const update = mockUserFindByIdAndUpdate.mock.calls[0][1];
    expect(update.$addToSet.unlockedFeatures.$each).toEqual([unlock.key]);
  });
});

describe("rtdn — 환불 회수", () => {
  function rtdnRequest(notification, { token = "rtdn-secret" } = {}) {
    const data = Buffer.from(JSON.stringify(notification)).toString("base64");
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    return postJson(`/google/rtdn${query}`, { message: { data } });
  }

  test("voided(환불 확정)는 재조회 없이 즉시 회수한다 — 콘텐츠 결제", async () => {
    mockPaymentFindOne.mockReturnValue({
      lean: async () => ({
        _id: "pay-refunded",
        userId: USER_ID,
        featureKey: unlock.key,
        productId: unlock.tier.productId,
        paymentType: "digital_content",
      }),
    });
    const { status, payload } = await callRoute(rtdnRequest({
      packageName: "com.codedestiny.app",
      voidedPurchaseNotification: { purchaseToken: "tok-unlock-1", orderId: "GPA.1", productType: 1 },
    }));
    expect(status).toBe(200);
    expect(payload.data.voided).toBe(true);

    // Google 재조회 없이(androidpublisher 호출 0회) 곧바로 회수한다.
    const publisherCalls = global.fetch.mock.calls.filter(([url]) => String(url).includes("androidpublisher"));
    expect(publisherCalls).toHaveLength(0);

    // 회수는 "취소 아님 → 취소" CAS 로 claim 한다(중복 수신 방지).
    const [claimFilter, paymentUpdate] = mockPaymentFindOneAndUpdate.mock.calls[0];
    expect(claimFilter.status).toEqual({ $ne: "cancelled" });
    expect(paymentUpdate.$set.status).toBe("cancelled");
    const userUpdate = mockUserFindByIdAndUpdate.mock.calls[0][1];
    expect(userUpdate.$pull.unlockedFeatures).toBe(unlock.key);
  });

  test("🔴 같은 voided 알림이 재전송돼도 회수를 두 번 돌리지 않는다", async () => {
    /* RTDN 에는 이벤트 중복 방지 테이블이 없어 Google 이 같은 알림을 다시 보낼 수 있다.
       $pull 자체는 멱등이라 무해해 보이지만, 그 사이 사용자가 **재구매**했다면 재전송이
       방금 다시 산 권한을 도로 뺏는다(재구매는 새 purchaseToken → 다른 Payment 문서를
       만들지만, 회수는 옛 Payment 의 featureKey 로 $pull 하기 때문이다). */
    mockPaymentFindOne.mockReturnValue({
      lean: async () => ({
        _id: "pay-refunded",
        userId: USER_ID,
        featureKey: unlock.key,
        productId: unlock.tier.productId,
        paymentType: "digital_content",
      }),
    });
    // 이미 취소된 주문이라 claim 이 실패한다(CAS 가 null 을 돌려준다).
    mockPaymentFindOneAndUpdate.mockReturnValueOnce({ lean: async () => null });

    const { status, payload } = await callRoute(rtdnRequest({
      packageName: "com.codedestiny.app",
      voidedPurchaseNotification: { purchaseToken: "tok-unlock-1", orderId: "GPA.1", productType: 1 },
    }));

    // Google 에는 정상 ack 한다 — 실패로 답하면 재전송이 무한히 이어진다.
    expect(status).toBe(200);
    expect(payload.data.voided).toBe(true);
    // 🔴 핵심: 사용자 문서를 건드리지 않는다.
    expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("이용권 환불은 paymentType으로 판정해 구독 상태도 끊는다", async () => {
    mockPaymentFindOne.mockReturnValue({
      lean: async () => ({
        _id: "pay-pass",
        userId: USER_ID,
        featureKey: "app-pass-standard",
        productId: "cd_pass_standard_30d",
        paymentType: "membership_pass",
      }),
    });
    const { status } = await callRoute(rtdnRequest({
      packageName: "com.codedestiny.app",
      // inapp 이용권 환불 — productType은 subs가 아니다. paymentType이 판정 기준.
      voidedPurchaseNotification: { purchaseToken: "tok-pass-1", orderId: "GPA.2", productType: 1 },
    }));
    expect(status).toBe(200);
    const userUpdate = mockUserFindByIdAndUpdate.mock.calls[0][1];
    // 취소 표시는 스키마에 선언된 lastBillingStatus 로만 남긴다. 예전에는 status/
    // subscriptionStatus/membershipStatus 도 함께 $set 했지만 셋 다 userSchema 에 없어
    // mongoose strict 가 조용히 버렸다(프로덕션 실측 0건) — 저장되지 않는 값을 단언하고 있었다.
    expect(userUpdate.$set["profileSubscription.lastBillingStatus"]).toBe("cancelled");
    expect(userUpdate.$set["profileSubscription.subscriptionStatus"]).toBeUndefined();
  });

  test("토큰이 틀리면 401, 미설정이면 503으로 닫힌다", async () => {
    const wrong = await callRoute(rtdnRequest({ testNotification: {} }, { token: "wrong" }));
    expect(wrong.status).toBe(401);
    expect(wrong.payload.code).toBe("GOOGLE_PLAY_RTDN_UNAUTHORIZED");

    const savedEnv = ENV;
    ENV = { ...ENV, GOOGLE_PLAY_RTDN_TOKEN: "" };
    const disabled = await callRoute(rtdnRequest({ testNotification: {} }));
    ENV = savedEnv;
    expect(disabled.status).toBe(503);
    expect(disabled.payload.code).toBe("GOOGLE_PLAY_RTDN_DISABLED");
  });

  test("Play Console 테스트 알림은 200으로 ack한다", async () => {
    const { status, payload } = await callRoute(rtdnRequest({ testNotification: { version: "1.0" } }));
    expect(status).toBe(200);
    expect(payload.data.test).toBe(true);
  });
});

describe("free-grant — 앱 무료 구간", () => {
  test("5코인 이하 기능만 무료로 통과시킨다", async () => {
    if (!freeKey) return; // 무료 구간 기능이 레지스트리에서 사라지면 계약 자체가 소멸한 것.
    const { status, payload } = await callRoute(postJson("/free-grant", {
      featureKey: freeKey,
      requestId: "free-req-1",
    }));
    expect(status).toBe(200);
    expect(payload.data.freeInApp).toBe(true);
    expect(payload.data.accessGrant.paymentMethod).toBe("FREE_IN_APP");
    // 결제가 없으니 Payment 기록도 남기지 않는다.
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  test("유료 상품을 free-grant로 우회하려 하면 400", async () => {
    const { status, payload } = await callRoute(postJson("/free-grant", {
      featureKey: perUse.key,
    }));
    expect(status).toBe(400);
    expect(payload.code).toBe("APP_STORE_PRODUCT_NOT_FREE");
  });
});

describe("intent — 결제 의도 기록", () => {
  test("launchBillingFlow 직전 의도를 남기고 obfuscatedAccountId를 내려준다", async () => {
    const { status, payload } = await callRoute(postJson("/google/intent", {
      featureKey: perUse.key,
      requestId: "intent-req-1",
    }));
    expect(status).toBe(200);
    expect(payload.data.product.productId).toBe(perUse.tier.productId);
    expect(payload.data.obfuscatedAccountId).toBe(await appStore.obfuscatedAccountIdForUser(USER_ID));

    expect(mockIntentCreate).toHaveBeenCalledTimes(1);
    const doc = mockIntentCreate.mock.calls[0][0];
    expect(doc.featureKey).toBe(perUse.key);
    expect(doc.productId).toBe(perUse.tier.productId);
    expect(doc.status).toBe("OPEN");
    expect(doc.expiresAt instanceof Date).toBe(true);
  });
});
